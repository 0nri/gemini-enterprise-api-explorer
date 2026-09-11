"""
API Explorer routes for testing Gemini Enterprise API endpoints.
"""

import asyncio
import base64
import json
import logging
import math
import threading
import traceback

import requests
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse, StreamingResponse
from google.auth import default
from google.auth.transport.requests import Request as AuthRequest

from backend import config
from backend.api.models import DeepResearchPlanRequest, DeepResearchRunRequest

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api-explorer", tags=["api-explorer"])


def _json_safe(value):
    """
    Recursively sanitize a parsed-JSON Python structure so it always survives
    strict JSON re-serialization.

    Starlette's default JSONResponse renders with `allow_nan=False` and
    `ensure_ascii=False`: a stray non-finite float (NaN/Infinity - Google's
    grounding/relevance scores have been observed to occasionally include
    these) or a lone unicode surrogate (malformed encoding in scraped web
    citation text) raises inside response construction, *after* our route
    has already returned - outside any try/except we write, surfacing to the
    client as a bare "Internal Server Error" instead of our normal error
    payload. Sanitize before returning so that can never happen.
    """
    if isinstance(value, float):
        return value if math.isfinite(value) else None
    if isinstance(value, str):
        return value.encode("utf-8", "replace").decode("utf-8")
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_json_safe(v) for v in value]
    return value


def _classify_agent(agent: dict) -> str:
    """
    Classify an agent catalog entry by its definition kind.

    Returns "no_code" for workflow/low-code agents, "deep_research" for the
    managed research assistant agent, and "unsupported" for everything else
    (a2aAgentDefinition, adkAgentDefinition, dialogflowAgentDefinition, or an
    unrecognized/missing definition kind) - the UI under-exposes rather than
    guesses how to drive an agent kind it doesn't have a flow for.
    """
    if "workflowAgentDefinition" in agent or "lowCodeAgentDefinition" in agent:
        return "no_code"
    managed_definition = agent.get("managedAgentDefinition", {}) or {}
    if "researchAssistantAgentConfig" in managed_definition:
        return "deep_research"
    return "unsupported"


def _build_deep_research_envelope(query_text: str, session_path: str, agent_name: str) -> dict:
    """
    Build the v1alpha streamAssist request envelope shared by both the deep
    research plan and run turns. Confirmed live against a real engine: no
    `agentsConfig` field is needed (it isn't part of the public v1alpha
    discovery schema and wasn't required in practice) - omit it.
    """
    return {
        "query": {"text": query_text},
        "session": session_path,
        "assistSkippingMode": "REQUEST_ASSIST",
        "answerGenerationMode": "AGENT",
        "agentsSpec": {"agentSpecs": [{"agentId": agent_name}]},
        "toolsSpec": {"vertexAiSearchSpec": {}, "webGroundingSpec": {}},
    }


@router.get("/engine-details/{engine_id}")
async def get_engine_details(
    engine_id: str,
    project_number: str = Query(..., description="Google Cloud project number"),
    location: str = Query("us", description="Engine location (us, eu, global)"),
    use_adc_quota: bool = Query(
        False, description="Use ADC's ambient quota project instead of project_number"
    ),
):
    """
    Get detailed information about a specific engine.

    Args:
        engine_id: The ID of the engine
        project_number: Google Cloud project number
        use_adc_quota: Use ADC's ambient quota project instead of project_number
        location: Engine location (us, eu, global)

    Returns:
        Dictionary with full engine details
    """
    try:
        from google.cloud import discoveryengine_v1 as discoveryengine
        from google.protobuf.json_format import MessageToDict

        from backend.clients import AgentClient

        # Create client with configuration from query parameters
        agent_client = AgentClient(
            project_number=project_number,
            location=location,
            use_adc_quota=use_adc_quota,
        )

        name = f"projects/{project_number}/locations/{location}/collections/default_collection/engines/{engine_id}"

        logger.info(f"Getting detailed engine info: {name}")

        # Get engine
        request = discoveryengine.GetEngineRequest(name=name)
        engine = agent_client.client.get_engine(request=request)

        # Convert protobuf message to dict to get all fields properly
        engine_dict = MessageToDict(engine._pb, preserving_proto_field_name=True)

        return {
            "request_params": {
                "engine_id": engine_id,
                "name": name,
            },
            "response": engine_dict,
            "success": True,
        }

    except Exception as e:
        logger.error(f"Error getting engine details: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")

        return {
            "request_params": {"engine_id": engine_id},
            "error": {
                "type": type(e).__name__,
                "message": str(e),
                "traceback": traceback.format_exc(),
            },
            "success": False,
        }


@router.get("/auth-status")
async def get_auth_status():
    """
    Report which kind of identity the backend's Application Default
    Credentials currently resolve to (WIF, service account, user, etc.),
    for display in the UI. Read-only; does not call any Discovery Engine API
    and never returns token/secret material.

    Returns:
        Dictionary describing the active ADC credential.
    """
    try:
        credentials, adc_project = default()
        if not credentials.valid:
            try:
                credentials.refresh(AuthRequest())
            except Exception:
                pass  # report whatever we can determine even if refresh fails

        credential_type, credential_label, principal = _classify_credentials(credentials)

        return {
            "credential_type": credential_type,
            "credential_label": credential_label,
            "principal": principal,
            "adc_project": adc_project,
            "valid": credentials.valid,
            "success": True,
        }

    except Exception as e:
        logger.error(f"Error resolving auth status: {str(e)}")
        return {
            "error": {
                "type": type(e).__name__,
                "message": str(e),
            },
            "success": False,
        }


def _classify_credentials(credentials):
    """
    Best-effort classification of an ADC credential object into a
    human-readable identity kind plus the account behind it, for display
    purposes only. Never returns token or refresh material.

    Returns:
        Tuple of (credential_type, credential_label, principal) where
        principal is an email address when one is available, otherwise the
        best available identifier (e.g. a workforce pool audience path), or
        None if nothing usable could be determined.
    """
    from google.auth import compute_engine, external_account, external_account_authorized_user
    from google.auth import impersonated_credentials
    from google.oauth2 import credentials as oauth2_credentials
    from google.oauth2 import service_account

    if isinstance(credentials, impersonated_credentials.Credentials):
        _, inner_label, _ = _classify_credentials(credentials._source_credentials)
        return "impersonated", f"Impersonated Service Account (via {inner_label})", credentials.service_account_email

    # Workforce Identity Federation's browser sign-in flow
    # (gcloud auth application-default login --login-config=...) always
    # produces this credential type. It carries no id_token, so the account
    # identifier comes from STS introspection on a best-effort basis (see
    # _introspect_principal) and falls back to the pool/provider audience.
    if isinstance(credentials, external_account_authorized_user.Credentials):
        principal = _introspect_principal(credentials) or credentials.info.get("audience")
        return "workforce_identity_federation", "Workforce Identity Federation (browser sign-in)", principal

    # Covers identity_pool.Credentials (file/URL/executable-sourced) and
    # aws.Credentials; is_workforce_pool distinguishes workforce vs. workload.
    if isinstance(credentials, external_account.Credentials):
        # Service-account impersonation (if configured) gives a real email;
        # otherwise fall back to best-effort STS introspection, then audience.
        principal = (
            credentials.service_account_email
            or _introspect_principal(credentials)
            or credentials.info.get("audience")
        )
        if credentials.is_workforce_pool:
            return "workforce_identity_federation", "Workforce Identity Federation", principal
        return "workload_identity_federation", "Workload Identity Federation", principal

    if isinstance(credentials, service_account.Credentials):
        return "service_account", "Service Account (key file)", credentials.service_account_email

    if isinstance(credentials, compute_engine.Credentials):
        return (
            "compute_engine",
            "Attached Service Account (metadata server)",
            getattr(credentials, "service_account_email", None),
        )

    if isinstance(credentials, oauth2_credentials.Credentials):
        return "authorized_user", "User Account (ADC)", _decode_id_token_email(credentials.id_token)

    return "unknown", type(credentials).__name__, None


def _decode_id_token_email(id_token):
    """
    Extract the `email` claim from an OIDC ID token's payload without
    verifying its signature. Display only — never used for authorization,
    and the token itself came from our own already-trusted ADC refresh.
    """
    if not id_token:
        return None
    try:
        payload_b64 = id_token.split(".")[1]
        padded = payload_b64 + "=" * (-len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded))
        return payload.get("email")
    except Exception:
        return None


def _introspect_principal(credentials):
    """
    Best-effort lookup of the human-readable account/subject behind a
    Workforce/Workload Identity Federation credential via its STS
    introspection endpoint (`credentials.token_info_url`). Google does not
    publicly document this endpoint's response schema, so this tries a few
    plausible field names and returns None on any failure rather than
    raising — the caller always has the audience path as a fallback.
    """
    token_info_url = getattr(credentials, "token_info_url", None)
    if not token_info_url or not credentials.token:
        return None
    try:
        response = requests.post(token_info_url, data={"token": credentials.token}, timeout=3)
        if response.status_code != 200:
            return None
        data = response.json()
        return data.get("email") or data.get("username") or data.get("sub")
    except Exception:
        return None


@router.post("/web-grounding-search")
async def web_grounding_search(
    engine_id: str,
    assistant_id: str,
    query: str,
    project_number: str = Query(..., description="Google Cloud project number"),
    location: str = Query("us", description="Engine location (us, eu, global)"),
    use_adc_quota: bool = Query(
        False, description="Use ADC's ambient quota project instead of project_number"
    ),
):
    """
    Enterprise Search using streamAssist with web grounding (v1 GA).

    Args:
        engine_id: The ID of the engine
        assistant_id: The ID of the assistant (e.g., "default_assistant")
        query: The search query text
        project_number: Google Cloud project number
        location: Engine location (us, eu, global)
        use_adc_quota: Use ADC's ambient quota project instead of project_number

    Returns:
        Dictionary with search results from web grounding
    """
    try:
        from google.api_core.client_options import ClientOptions
        from google.cloud import discoveryengine_v1 as discoveryengine
        from google.protobuf.json_format import MessageToDict

        # Configure client to use regional endpoint
        # Note: 'global' location uses discoveryengine.googleapis.com (no prefix)
        # Regional locations (us, eu) use {location}-discoveryengine.googleapis.com
        api_endpoint = (
            "discoveryengine.googleapis.com"
            if location == "global"
            else f"{location}-discoveryengine.googleapis.com"
        )
        client_options = ClientOptions(
            api_endpoint=api_endpoint,
            **({} if use_adc_quota else {"quota_project_id": project_number}),
        )
        assistant_client = discoveryengine.AssistantServiceClient(
            client_options=client_options
        )

        # Build assistant/engine resource names
        assistant_name = f"projects/{project_number}/locations/{location}/collections/default_collection/engines/{engine_id}/assistants/{assistant_id}"
        engine_name = f"projects/{project_number}/locations/{location}/collections/default_collection/engines/{engine_id}"

        logger.info(f"Web Grounding Search via GA client: {assistant_name}:streamAssist")

        request = discoveryengine.StreamAssistRequest(
            name=assistant_name,
            query=discoveryengine.Query(text=query),
            session=f"{engine_name}/sessions/-",
            tools_spec=discoveryengine.StreamAssistRequest.ToolsSpec(
                web_grounding_spec=discoveryengine.StreamAssistRequest.ToolsSpec.WebGroundingSpec()
            ),
        )

        chunks = [
            MessageToDict(r._pb) for r in assistant_client.stream_assist(request=request)
        ]

        return {
            "request_params": {
                "engine_id": engine_id,
                "assistant_id": assistant_id,
                "query": query,
                "resource": f"{assistant_name}:streamAssist",
                "api_version": "v1",
                "location": location,
                "web_grounding_enabled": True,
            },
            "response": {
                "chunks": chunks,
                "chunk_count": len(chunks),
            },
            "success": True,
        }

    except Exception as e:
        logger.error(f"Error in web_grounding_search: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")

        return {
            "request_params": {
                "engine_id": engine_id,
                "assistant_id": assistant_id,
                "query": query,
            },
            "error": {
                "type": type(e).__name__,
                "message": str(e),
                "traceback": traceback.format_exc(),
            },
            "success": False,
        }


@router.get("/engine-data-stores/{engine_id}")
async def get_engine_data_stores(
    engine_id: str,
    project_number: str = Query(..., description="Google Cloud project number"),
    location: str = Query("us", description="Engine location (us, eu, global)"),
    use_adc_quota: bool = Query(
        False, description="Use ADC's ambient quota project instead of project_number"
    ),
):
    """
    Get all data stores associated with a specific engine.

    Args:
        engine_id: The ID of the engine
        project_number: Google Cloud project number
        location: Engine location (us, eu, global)
        use_adc_quota: Use ADC's ambient quota project instead of project_number

    Returns:
        Dictionary with data store details
    """
    try:
        from google.api_core.client_options import ClientOptions
        from google.cloud import discoveryengine_v1 as discoveryengine

        from backend.clients import AgentClient

        # Create client with configuration from query parameters
        agent_client = AgentClient(
            project_number=project_number,
            location=location,
            use_adc_quota=use_adc_quota,
        )

        # First get the engine to find data store IDs
        engine_name = f"projects/{project_number}/locations/{location}/collections/default_collection/engines/{engine_id}"
        request = discoveryengine.GetEngineRequest(name=engine_name)
        engine = agent_client.client.get_engine(request=request)

        if not hasattr(engine, "data_store_ids") or not engine.data_store_ids:
            return {
                "request_params": {"engine_id": engine_id},
                "response": {
                    "message": "No data stores found for this engine",
                    "data_store_ids": [],
                },
                "success": True,
            }

        # Create data store client
        # Note: 'global' location uses discoveryengine.googleapis.com (no prefix)
        # Regional locations (us, eu) use {location}-discoveryengine.googleapis.com
        api_endpoint = (
            "discoveryengine.googleapis.com"
            if location == "global"
            else f"{location}-discoveryengine.googleapis.com"
        )
        client_options = ClientOptions(
            api_endpoint=api_endpoint,
            **({} if use_adc_quota else {"quota_project_id": project_number}),
        )
        ds_client = discoveryengine.DataStoreServiceClient(
            client_options=client_options
        )

        # Get details for each data store
        data_stores = []
        for ds_id in engine.data_store_ids:
            try:
                ds_name = f"projects/{project_number}/locations/{location}/collections/default_collection/dataStores/{ds_id}"
                ds_request = discoveryengine.GetDataStoreRequest(name=ds_name)
                ds = ds_client.get_data_store(request=ds_request)

                data_stores.append(
                    {
                        "id": ds_id,
                        "name": ds.name,
                        "display_name": ds.display_name,
                        "industry_vertical": str(ds.industry_vertical),
                        "solution_types": [str(st) for st in ds.solution_types],
                        "content_config": str(ds.content_config),
                    }
                )
            except Exception as ds_error:
                data_stores.append(
                    {
                        "id": ds_id,
                        "error": str(ds_error),
                        "name": f"Error loading {ds_id}",
                    }
                )

        return {
            "request_params": {
                "engine_id": engine_id,
                "data_store_ids": list(engine.data_store_ids),
            },
            "response": {
                "data_store_count": len(data_stores),
                "data_stores": data_stores,
            },
            "success": True,
        }

    except Exception as e:
        logger.error(f"Error getting engine data stores: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")

        return {
            "request_params": {"engine_id": engine_id},
            "error": {
                "type": type(e).__name__,
                "message": str(e),
                "traceback": traceback.format_exc(),
            },
            "success": False,
        }


@router.get("/list-assistants/{engine_id}")
async def list_assistants(
    engine_id: str,
    project_number: str = Query(..., description="Google Cloud project number"),
    location: str = Query("us", description="Engine location (us, eu, global)"),
    use_adc_quota: bool = Query(
        False, description="Use ADC's ambient quota project instead of project_number"
    ),
):
    """
    List all assistants within an engine using the GA v1 REST surface.

    This lists the assistant containers (like "default_assistant") that hold agents.
    Uses a direct REST call (not the generated client) because
    google-cloud-discoveryengine 0.20.3 only wires AssistantServiceClient.stream_assist()
    for v1; list/get/create/delete/patch are documented as GA at v1 but the Python
    client hasn't caught up yet, so we call the GA v1 REST endpoint directly.

    Args:
        engine_id: The ID of the engine
        project_number: Google Cloud project number
        location: Engine location (us, eu, global)
        use_adc_quota: Use ADC's ambient quota project instead of project_number

    Returns:
        Dictionary with assistants list
    """
    try:
        # Get credentials
        credentials, adc_project = default()
        if not credentials.valid:
            credentials.refresh(AuthRequest())
        quota_project = adc_project if use_adc_quota else project_number

        # Determine API endpoint based on location
        api_endpoint = (
            "discoveryengine.googleapis.com"
            if location == "global"
            else f"{location}-discoveryengine.googleapis.com"
        )

        # Build the REST API URL - v1 GA (assistants list/get are GA, not alpha-only)
        url = f"https://{api_endpoint}/v1/projects/{project_number}/locations/{location}/collections/default_collection/engines/{engine_id}/assistants"

        logger.info(f"Listing assistants via REST API: {url}")

        # Make the request
        headers = {
            "Authorization": f"Bearer {credentials.token}",
            "Content-Type": "application/json",
            "X-Goog-User-Project": quota_project,
        }

        response = requests.get(url, headers=headers)
        response.raise_for_status()

        data = response.json()

        return {
            "request_params": {
                "engine_id": engine_id,
                "location": location,
                "url": url,
                "api_version": "v1",
            },
            "response": {
                "assistant_count": len(data.get("assistants", [])),
                "assistants": data.get("assistants", []),
                "next_page_token": data.get("nextPageToken"),
            },
            "success": True,
        }

    except Exception as e:
        logger.error(f"Error listing assistants: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")

        return {
            "request_params": {"engine_id": engine_id},
            "error": {
                "type": type(e).__name__,
                "message": str(e),
                "traceback": traceback.format_exc(),
            },
            "success": False,
        }


@router.get("/list-agents/{engine_id}")
async def list_agents(
    engine_id: str,
    project_number: str = Query(..., description="Google Cloud project number"),
    location: str = Query("us", description="Engine location (us, eu, global)"),
    use_adc_quota: bool = Query(
        False, description="Use ADC's ambient quota project instead of project_number"
    ),
):
    """
    List all agents within the default assistant.

    This lists the individual agents/tools (like "HKFinBot", "Deep Research")
    within default_assistant using v1alpha API. No GA or v1beta equivalent exists yet:
    the REST reference only documents this agent catalog resource at v1alpha, so this
    intentionally stays on v1alpha until Google promotes it.

    Args:
        engine_id: The ID of the engine
        project_number: Google Cloud project number
        location: Engine location (us, eu, global)
        use_adc_quota: Use ADC's ambient quota project instead of project_number

    Returns:
        Dictionary with agents list
    """
    try:
        # Get credentials
        credentials, adc_project = default()
        if not credentials.valid:
            credentials.refresh(AuthRequest())
        quota_project = adc_project if use_adc_quota else project_number

        # Determine API endpoint based on location
        api_endpoint = (
            "discoveryengine.googleapis.com"
            if location == "global"
            else f"{location}-discoveryengine.googleapis.com"
        )

        # Build the REST API URL - use v1alpha
        url = f"https://{api_endpoint}/v1alpha/projects/{project_number}/locations/{location}/collections/default_collection/engines/{engine_id}/assistants/default_assistant/agents"

        logger.info(f"Listing agents via REST API: {url}")

        # Make the request
        headers = {
            "Authorization": f"Bearer {credentials.token}",
            "Content-Type": "application/json",
            "X-Goog-User-Project": quota_project,
        }

        response = requests.get(url, headers=headers)
        response.raise_for_status()

        data = response.json()
        agents = [
            {**agent, "agent_kind": _classify_agent(agent)}
            for agent in data.get("agents", [])
        ]

        return {
            "request_params": {
                "engine_id": engine_id,
                "location": location,
                "url": url,
                "api_version": "v1alpha",
            },
            "response": {
                "agent_count": len(agents),
                "agents": agents,
            },
            "success": True,
        }

    except Exception as e:
        logger.error(f"Error listing agents: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")

        return {
            "request_params": {"engine_id": engine_id},
            "error": {
                "type": type(e).__name__,
                "message": str(e),
                "traceback": traceback.format_exc(),
            },
            "success": False,
        }


@router.get("/get-agent/{engine_id}/{agent_name}")
async def get_agent(
    engine_id: str,
    agent_name: str,
    project_number: str = Query(..., description="Google Cloud project number"),
    location: str = Query("us", description="Engine location (us, eu, global)"),
    use_adc_quota: bool = Query(
        False, description="Use ADC's ambient quota project instead of project_number"
    ),
):
    """
    Get details of a specific agent using v1alpha API (no GA/v1beta equivalent yet).

    Args:
        engine_id: The ID of the engine
        agent_name: The name of the agent (e.g., "default_idea_generation", "deep_research")
        project_number: Google Cloud project number
        location: Engine location (us, eu, global)
        use_adc_quota: Use ADC's ambient quota project instead of project_number

    Returns:
        Dictionary with agent details
    """
    try:
        # Get credentials
        credentials, adc_project = default()
        if not credentials.valid:
            credentials.refresh(AuthRequest())
        quota_project = adc_project if use_adc_quota else project_number

        # Determine API endpoint based on location
        api_endpoint = (
            "discoveryengine.googleapis.com"
            if location == "global"
            else f"{location}-discoveryengine.googleapis.com"
        )

        # Build the REST API URL - get individual agent details
        url = f"https://{api_endpoint}/v1alpha/projects/{project_number}/locations/{location}/collections/default_collection/engines/{engine_id}/assistants/default_assistant/agents/{agent_name}"

        logger.info(f"Getting agent via REST API: {url}")

        # Make the request
        headers = {
            "Authorization": f"Bearer {credentials.token}",
            "Content-Type": "application/json",
            "X-Goog-User-Project": quota_project,
        }

        response = requests.get(url, headers=headers)
        response.raise_for_status()

        data = response.json()

        return {
            "request_params": {
                "engine_id": engine_id,
                "agent_name": agent_name,
                "url": url,
                "api_version": "v1alpha",
                "location": location,
            },
            "response": data,
            "success": True,
        }

    except Exception as e:
        logger.error(f"Error getting agent: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")

        return {
            "request_params": {"engine_id": engine_id, "agent_name": agent_name},
            "error": {
                "type": type(e).__name__,
                "message": str(e),
                "traceback": traceback.format_exc(),
            },
            "success": False,
        }


@router.post("/stream-assist")
async def stream_assist(
    engine_id: str,
    assistant_id: str,
    query: str,
    project_number: str = Query(..., description="Google Cloud project number"),
    location: str = Query("us", description="Engine location (us, eu, global)"),
    agent_name: str = "",
    session_id: str = "-",
    use_adc_quota: bool = Query(
        False, description="Use ADC's ambient quota project instead of project_number"
    ),
):
    """
    Query an assistant/agent using the streamAssist API (v1 GA).

    Matches the documented curl reference for agent routing exactly:
    POST v1 .../assistants/{assistant}:streamAssist with a body of just
    `query` + `agentsSpec` (plus `session` here, for turn continuity - the
    reference example is single-shot so it omits it). No `answerGenerationMode`
    or `assistSkippingMode`: those aren't part of the documented v1 contract
    and were a wrong inference from an internal widget's telemetry-heavy
    request; v1 honors `agentsSpec` on its own.

    Uses raw REST (matching the reference curl byte-for-byte) rather than the
    discoveryengine_v1 GAPIC client purely so `request_payload`/`request_url`
    below can show the exact wire JSON without a proto round-trip.

    Args:
        engine_id: The ID of the engine
        assistant_id: The ID of the assistant (e.g., "default_assistant")
        query: The query text
        project_number: Google Cloud project number
        location: Engine location (us, eu, global)
        agent_name: The agent ID to route to (e.g., "default_idea_generation") - optional.
            Referenced via agentsSpec.agentSpecs[].agentId; discovering available
            agent IDs still requires the v1alpha catalog (see list-agents/get-agent).
        session_id: Session ID for conversation continuity (default: "-" for new session)
        use_adc_quota: Use ADC's ambient quota project instead of project_number

    Returns:
        Dictionary with response including session info
    """
    request_params = {
        "engine_id": engine_id,
        "assistant_id": assistant_id,
        "query": query,
        "agent_name": agent_name,
    }
    # Populated once built inside the try block; kept available here so both
    # the success and error responses can surface exactly what was sent.
    url = None
    payload = None
    try:
        # Get credentials
        credentials, adc_project = default()
        if not credentials.valid:
            credentials.refresh(AuthRequest())
        quota_project = adc_project if use_adc_quota else project_number

        # Determine API endpoint based on location
        api_endpoint = (
            "discoveryengine.googleapis.com"
            if location == "global"
            else f"{location}-discoveryengine.googleapis.com"
        )

        # Build assistant/engine resource names
        assistant_name = f"projects/{project_number}/locations/{location}/collections/default_collection/engines/{engine_id}/assistants/{assistant_id}"
        engine_name = f"projects/{project_number}/locations/{location}/collections/default_collection/engines/{engine_id}"

        url = f"https://{api_endpoint}/v1/{assistant_name}:streamAssist"

        payload = {
            "query": {"text": query},
            "session": f"{engine_name}/sessions/{session_id}",
        }

        # Route to a specific agent if requested.
        if agent_name:
            payload["agentsSpec"] = {"agentSpecs": [{"agentId": agent_name}]}

        logger.info(f"StreamAssist via v1 REST: {url}")

        headers = {
            "Authorization": f"Bearer {credentials.token}",
            "Content-Type": "application/json",
            "X-Goog-User-Project": quota_project,
        }

        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()

        data = response.json()
        chunks = data if isinstance(data, list) else [data]

        # Extract session info from the last chunk that has it
        session_info = {}
        for chunk in reversed(chunks):
            if "sessionInfo" in chunk:
                session_info = chunk["sessionInfo"]
                break

        extracted_session_id = (
            session_info.get("session", "").split("/")[-1]
            if session_info.get("session")
            else None
        )

        return {
            "request_params": {
                **request_params,
                "session_id": session_id,
                "resource": f"{assistant_name}:streamAssist",
                "api_version": "v1",
                "location": location,
            },
            "request_url": url,
            "request_payload": payload,
            "response": {
                "chunks": chunks,
                "chunk_count": len(chunks),
            },
            "session_info": {
                "session_id": extracted_session_id,
                "full_session_path": session_info.get("session"),
            },
            "success": True,
        }

    except Exception as e:
        logger.error(f"Error in stream_assist: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")

        return {
            "request_params": request_params,
            "request_url": url,
            "request_payload": payload,
            "error": {
                "type": type(e).__name__,
                "message": str(e),
                "traceback": traceback.format_exc(),
            },
            "success": False,
        }


def _compute_deep_research_plan(request: DeepResearchPlanRequest) -> dict:
    """
    Synchronous, blocking implementation of the plan turn's upstream call.

    Run via `asyncio.to_thread` from the route so the event loop stays free
    to emit SSE heartbeats while this blocks (typically 30-90s) on the
    upstream `streamAssist` call - see `deep_research_plan`'s docstring for
    why that matters.
    """
    request_params = {
        "engine_id": request.engine_id,
        "assistant_id": request.assistant_id,
        "agent_name": request.agent_name,
        "query": request.query,
    }
    url = None
    payload = None
    try:
        credentials, adc_project = default()
        if not credentials.valid:
            credentials.refresh(AuthRequest())
        quota_project = adc_project if request.use_adc_quota else request.project_number

        api_endpoint = (
            "discoveryengine.googleapis.com"
            if request.location == "global"
            else f"{request.location}-discoveryengine.googleapis.com"
        )

        assistant_name = (
            f"projects/{request.project_number}/locations/{request.location}/"
            f"collections/default_collection/engines/{request.engine_id}/"
            f"assistants/{request.assistant_id}"
        )
        engine_name = (
            f"projects/{request.project_number}/locations/{request.location}/"
            f"collections/default_collection/engines/{request.engine_id}"
        )

        url = f"https://{api_endpoint}/v1alpha/{assistant_name}:streamAssist"
        session_path = f"{engine_name}/sessions/-"
        payload = _build_deep_research_envelope(request.query, session_path, request.agent_name)

        logger.info(f"DeepResearch plan via v1alpha REST: {url}")

        headers = {
            "Authorization": f"Bearer {credentials.token}",
            "Content-Type": "application/json",
            "X-Goog-User-Project": quota_project,
        }

        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()

        data = response.json()
        chunks = data if isinstance(data, list) else [data]

        plan_text = None
        for chunk in chunks:
            for reply in chunk.get("answer", {}).get("replies", []):
                content_metadata = reply.get("groundedContent", {}).get("contentMetadata", {})
                if content_metadata.get("contentKind") == "RESEARCH_PLAN":
                    plan_text = reply["groundedContent"]["content"].get("text")
                    break
            if plan_text is not None:
                break

        session_info = {}
        for chunk in reversed(chunks):
            if "sessionInfo" in chunk:
                session_info = chunk["sessionInfo"]
                break

        extracted_session_id = (
            session_info.get("session", "").split("/")[-1]
            if session_info.get("session")
            else None
        )

        result = {
            "request_params": {
                **request_params,
                "resource": f"{assistant_name}:streamAssist",
                "api_version": "v1alpha",
                "location": request.location,
            },
            "request_url": url,
            "request_payload": payload,
            "response": {
                "plan_text": plan_text,
                "chunks": chunks,
                "chunk_count": len(chunks),
            },
            "session_info": {
                "session_id": extracted_session_id,
                "full_session_path": session_info.get("session"),
            },
            "success": True,
        }
        return _json_safe(result)

    except Exception as e:
        logger.error(f"Error in deep_research_plan: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")

        return _json_safe(
            {
                "request_params": request_params,
                "request_url": url,
                "request_payload": payload,
                "error": {
                    "type": type(e).__name__,
                    "message": str(e),
                    "traceback": traceback.format_exc(),
                },
                "success": False,
            }
        )


@router.post("/deep-research/plan")
async def deep_research_plan(request: DeepResearchPlanRequest):
    """
    Kick off a deep research turn by requesting the agent's research plan.

    This is the first of the two-phase deep_research Assist flow: the plan
    turn sends the user's real question against a brand-new session
    ("sessions/-") and the agent replies with a RESEARCH_PLAN chunk plus a
    session id. The caller passes that session id to /deep-research/run to
    actually execute the plan.

    Streamed as SSE rather than a single JSON response: the upstream call
    routinely takes 30-90+ seconds, and packet-level testing confirmed this
    dev environment's network path enforces a ~30s idle timeout on
    connections with zero bytes flowing - a plain blocking JSON response
    gets its connection torn down by the client/proxy before the (otherwise
    successful) response ever arrives. Emitting an SSE heartbeat comment
    every few seconds keeps bytes flowing so that never happens; the final
    `data:` event carries the exact same payload shape the old plain-JSON
    response used.

    Args:
        request: DeepResearchPlanRequest with query and engine/assistant config

    Returns:
        SSE stream: periodic `: keep-alive` comments, then one `data:` event
        with the extracted plan text, session info, and raw chunks
    """

    async def event_generator():
        task = asyncio.ensure_future(asyncio.to_thread(_compute_deep_research_plan, request))
        while not task.done():
            try:
                await asyncio.wait_for(asyncio.shield(task), timeout=10)
            except asyncio.TimeoutError:
                yield ": keep-alive\n\n"
        yield f"data: {json.dumps(task.result())}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/deep-research/run")
async def deep_research_run(request: DeepResearchRunRequest):
    """
    Execute a previously planned deep research turn, streaming results as SSE.

    This is the second of the two-phase deep_research Assist flow: the run
    turn replays the literal query "Start research" against the session id
    produced by /deep-research/plan.

    Everything that touches the network (credential refresh, opening the
    upstream connection, and reading its body) runs on a background thread
    that feeds an asyncio.Queue, so this route can return its SSE response -
    and start sending bytes - immediately, then emit a `: keep-alive`
    comment every ~10s whenever the queue is empty. That's not cosmetic:
    packet-level testing showed this dev environment's network path kills
    connections after ~30s with zero bytes flowing, and the upstream run
    stream has genuine multi-minute gaps between real content chunks (see
    the 1.2 spike finding) - a synchronous `for chunk in resp.iter_content()`
    loop blocks the event loop for the entire gap, and a connection that
    goes quiet during any one of those gaps gets torn down exactly the way
    /deep-research/plan used to before it got the same treatment.

    A non-2xx upstream response can no longer be raised as an HTTP-level
    502 (headers are already committed to 200 by the time we know) - it's
    reported as a `{"type": "error"}` SSE event instead, same shape the
    stream-parsing failure path already used.

    Args:
        request: DeepResearchRunRequest with session_id and engine/assistant config

    Returns:
        StreamingResponse of SSE events: periodic `: keep-alive` comments,
        one event per upstream chunk, then a final {"type": "done"} event
        (or {"type": "error"} on failure)
    """
    if not request.session_id or request.session_id == "-":
        raise HTTPException(
            status_code=400,
            detail="A session_id from a prior /deep-research/plan call is required to start a run.",
        )

    def _fetch_and_parse(loop: asyncio.AbstractEventLoop, out_queue: "asyncio.Queue") -> None:
        """
        Runs entirely on a background thread: opens the upstream connection,
        incrementally parses its top-level JSON array, and hands each
        fully-parsed element (or a terminal "done"/"error" marker) back to
        the async generator via `out_queue`. Never touches the event loop
        directly - only `loop.call_soon_threadsafe`, which is thread-safe.
        """
        try:
            credentials, adc_project = default()
            if not credentials.valid:
                credentials.refresh(AuthRequest())
            quota_project = adc_project if request.use_adc_quota else request.project_number

            api_endpoint = (
                "discoveryengine.googleapis.com"
                if request.location == "global"
                else f"{request.location}-discoveryengine.googleapis.com"
            )
            assistant_name = (
                f"projects/{request.project_number}/locations/{request.location}/"
                f"collections/default_collection/engines/{request.engine_id}/"
                f"assistants/{request.assistant_id}"
            )
            engine_name = (
                f"projects/{request.project_number}/locations/{request.location}/"
                f"collections/default_collection/engines/{request.engine_id}"
            )

            url = f"https://{api_endpoint}/v1alpha/{assistant_name}:streamAssist"
            session_path = f"{engine_name}/sessions/{request.session_id}"
            payload = _build_deep_research_envelope("Start research", session_path, request.agent_name)

            headers = {
                "Authorization": f"Bearer {credentials.token}",
                "Content-Type": "application/json",
                "X-Goog-User-Project": quota_project,
            }

            logger.info(f"DeepResearch run via v1alpha REST: {url}")

            resp = requests.post(url, headers=headers, json=payload, stream=True)

            if not (200 <= resp.status_code < 300):
                try:
                    upstream_body = resp.json()
                except ValueError:
                    upstream_body = resp.text
                raise RuntimeError(f"Upstream returned {resp.status_code}: {upstream_body}")

            decoder = json.JSONDecoder()
            buffer = ""
            started = False
            for raw_bytes in resp.iter_content(chunk_size=4096):
                if not raw_bytes:
                    continue
                buffer += raw_bytes.decode("utf-8", errors="ignore")

                while True:
                    buffer = buffer.lstrip()
                    if not buffer:
                        break
                    if not started and buffer[0] == "[":
                        buffer = buffer[1:]
                        started = True
                        continue
                    if buffer[0] in (",", "]"):
                        buffer = buffer[1:]
                        continue
                    try:
                        parsed, end_index = decoder.raw_decode(buffer)
                    except json.JSONDecodeError:
                        # Not enough bytes yet for a full element; wait for more.
                        break
                    buffer = buffer[end_index:]
                    loop.call_soon_threadsafe(out_queue.put_nowait, ("chunk", parsed))

            loop.call_soon_threadsafe(out_queue.put_nowait, ("done", None))

        except Exception as e:
            logger.error(f"Error in deep_research_run background fetch: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            loop.call_soon_threadsafe(out_queue.put_nowait, ("error", str(e)))

    async def event_generator():
        loop = asyncio.get_event_loop()
        out_queue: asyncio.Queue = asyncio.Queue()
        threading.Thread(target=_fetch_and_parse, args=(loop, out_queue), daemon=True).start()

        chunk_count = 0
        while True:
            try:
                kind, value = await asyncio.wait_for(out_queue.get(), timeout=10)
            except asyncio.TimeoutError:
                yield ": keep-alive\n\n"
                continue

            if kind == "done":
                logger.info(f"DeepResearch run stream completed. Total chunks: {chunk_count}")
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
                return
            if kind == "error":
                yield f"data: {json.dumps({'type': 'error', 'error': value})}\n\n"
                return

            chunk_count += 1
            yield f"data: {json.dumps(value)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

