"""
API Explorer routes for testing Gemini Enterprise API endpoints.
"""

import logging
import traceback

import requests
from fastapi import APIRouter, Query
from google.auth import default
from google.auth.transport.requests import Request as AuthRequest

from backend import config

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api-explorer", tags=["api-explorer"])


@router.get("/engine-details/{engine_id}")
async def get_engine_details(
    engine_id: str,
    project_number: str = Query(..., description="Google Cloud project number"),
    location: str = Query("us", description="Engine location (us, eu, global)"),
):
    """
    Get detailed information about a specific engine.

    Args:
        engine_id: The ID of the engine
        project_number: Google Cloud project number
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


@router.post("/web-grounding-search")
async def web_grounding_search(
    engine_id: str,
    assistant_id: str,
    query: str,
    project_number: str = Query(..., description="Google Cloud project number"),
):
    """
    Enterprise Search using streamAssist with web grounding (v1alpha).

    Args:
        engine_id: The ID of the engine
        assistant_id: The ID of the assistant (e.g., "default_assistant")
        query: The search query text
        project_number: Google Cloud project number

    Returns:
        Dictionary with search results from web grounding
    """
    try:
        # Get credentials
        credentials, project = default()
        if not credentials.valid:
            credentials.refresh(AuthRequest())

        # Build the REST API URL - use streamAssist with web grounding
        url = f"https://us-discoveryengine.googleapis.com/v1alpha/projects/{project_number}/locations/us/collections/default_collection/engines/{engine_id}/assistants/{assistant_id}:streamAssist"

        logger.info(f"Web Grounding Search via REST API: {url}")

        # Build assistant resource name
        assistant_name = f"projects/{project_number}/locations/us/collections/default_collection/engines/{engine_id}/assistants/{assistant_id}"

        # Build request body with web grounding enabled
        request_body = {
            "name": assistant_name,
            "query": {"text": query},
            "session": f"projects/{project_number}/locations/us/collections/default_collection/engines/{engine_id}/sessions/-",
            "answerGenerationMode": "NORMAL",
            "toolsSpec": {
                "webGroundingSpec": {}  # Enable web grounding
            },
        }

        logger.info(f"Request body: {request_body}")

        # Make the request
        headers = {
            "Authorization": f"Bearer {credentials.token}",
            "Content-Type": "application/json",
            "X-Goog-User-Project": project_number,
        }

        response = requests.post(url, headers=headers, json=request_body)
        response.raise_for_status()

        # Parse response
        data = response.json()

        # Handle both list (streaming chunks) and dict (single response) formats
        if isinstance(data, list):
            chunks = data
        else:
            chunks = [data]

        return {
            "request_params": {
                "engine_id": engine_id,
                "assistant_id": assistant_id,
                "query": query,
                "url": url,
                "api_version": "v1alpha",
                "location": "us",
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
):
    """
    Get all data stores associated with a specific engine.

    Args:
        engine_id: The ID of the engine
        project_number: Google Cloud project number
        location: Engine location (us, eu, global)

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
        client_options = ClientOptions(api_endpoint=api_endpoint)
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
):
    """
    List all assistants within an engine using v1alpha API.

    This lists the assistant containers (like "default_assistant") that hold agents.

    Args:
        engine_id: The ID of the engine
        project_number: Google Cloud project number

    Returns:
        Dictionary with assistants list
    """
    try:
        # Get credentials
        credentials, project = default()
        if not credentials.valid:
            credentials.refresh(AuthRequest())

        # Build the REST API URL - use v1alpha with region-specific endpoint
        url = f"https://us-discoveryengine.googleapis.com/v1alpha/projects/{project_number}/locations/us/collections/default_collection/engines/{engine_id}/assistants"

        logger.info(f"Listing assistants via REST API: {url}")

        # Make the request
        headers = {
            "Authorization": f"Bearer {credentials.token}",
            "Content-Type": "application/json",
            "X-Goog-User-Project": project_number,
        }

        response = requests.get(url, headers=headers)
        response.raise_for_status()

        data = response.json()

        return {
            "request_params": {
                "engine_id": engine_id,
                "location": "us",
                "url": url,
                "api_version": "v1alpha",
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
):
    """
    List all agents within the default assistant.

    This lists the individual agents/tools (like "HKFinBot", "Deep Research")
    within default_assistant using v1alpha API.

    Args:
        engine_id: The ID of the engine
        project_number: Google Cloud project number

    Returns:
        Dictionary with agents list
    """
    try:
        # Get credentials
        credentials, project = default()
        if not credentials.valid:
            credentials.refresh(AuthRequest())

        # Build the REST API URL - use v1alpha and 'us' location for agents
        url = f"https://us-discoveryengine.googleapis.com/v1alpha/projects/{project_number}/locations/us/collections/default_collection/engines/{engine_id}/assistants/default_assistant/agents"

        logger.info(f"Listing agents via REST API: {url}")

        # Make the request
        headers = {
            "Authorization": f"Bearer {credentials.token}",
            "Content-Type": "application/json",
            "X-Goog-User-Project": project_number,
        }

        response = requests.get(url, headers=headers)
        response.raise_for_status()

        data = response.json()

        return {
            "request_params": {
                "engine_id": engine_id,
                "location": "us",
                "url": url,
                "api_version": "v1alpha",
            },
            "response": {
                "agent_count": len(data.get("agents", [])),
                "agents": data.get("agents", []),
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
):
    """
    Get details of a specific agent using v1alpha API.

    Args:
        engine_id: The ID of the engine
        agent_name: The name of the agent (e.g., "default_idea_generation", "deep_research")
        project_number: Google Cloud project number

    Returns:
        Dictionary with agent details
    """
    try:
        # Get credentials
        credentials, project = default()
        if not credentials.valid:
            credentials.refresh(AuthRequest())

        # Build the REST API URL - get individual agent details
        url = f"https://us-discoveryengine.googleapis.com/v1alpha/projects/{project_number}/locations/us/collections/default_collection/engines/{engine_id}/assistants/default_assistant/agents/{agent_name}"

        logger.info(f"Getting agent via REST API: {url}")

        # Make the request
        headers = {
            "Authorization": f"Bearer {credentials.token}",
            "Content-Type": "application/json",
            "X-Goog-User-Project": project_number,
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
                "location": "us",
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
    agent_name: str = "",
    session_id: str = "-",
):
    """
    Query an assistant/agent using the streamAssist API (v1alpha).

    Args:
        engine_id: The ID of the engine
        assistant_id: The ID of the assistant (e.g., "default_assistant")
        query: The query text
        project_number: Google Cloud project number
        agent_name: The agent name to use (e.g., "default_idea_generation") - optional
        session_id: Session ID for conversation continuity (default: "-" for new session)

    Returns:
        Dictionary with response including session info
    """
    try:
        # Get credentials
        credentials, project = default()
        if not credentials.valid:
            credentials.refresh(AuthRequest())

        # Build the REST API URL - use v1alpha with us location
        url = f"https://us-discoveryengine.googleapis.com/v1alpha/projects/{project_number}/locations/us/collections/default_collection/engines/{engine_id}/assistants/{assistant_id}:streamAssist"

        logger.info(f"StreamAssist via REST API: {url}")

        # Build assistant resource name
        assistant_name = f"projects/{project_number}/locations/us/collections/default_collection/engines/{engine_id}/assistants/{assistant_id}"

        # Build request body according to v1alpha spec
        request_body = {
            "name": assistant_name,
            "query": {"text": query},
            "session": f"projects/{project_number}/locations/us/collections/default_collection/engines/{engine_id}/sessions/{session_id}",
            "assistSkippingMode": "REQUEST_ASSIST",
            "answerGenerationMode": "AGENT",
        }

        # Add agent config if agent_name provided - build full resource path
        if agent_name:
            agent_resource_name = f"projects/{project_number}/locations/us/collections/default_collection/engines/{engine_id}/assistants/{assistant_id}/agents/{agent_name}"
            request_body["agentsConfig"] = {"agent": agent_resource_name}

        logger.info(f"Request body: {request_body}")

        # Make the request
        headers = {
            "Authorization": f"Bearer {credentials.token}",
            "Content-Type": "application/json",
            "X-Goog-User-Project": project_number,
        }

        response = requests.post(url, headers=headers, json=request_body)
        response.raise_for_status()

        # Parse response - streamAssist returns a list of chunks
        data = response.json()

        # Handle both list (streaming chunks) and dict (single response) formats
        if isinstance(data, list):
            # It's a list of streaming chunks
            chunks = data
            # Extract session info from the last chunk that has it
            session_info = {}
            for chunk in reversed(chunks):
                if "sessionInfo" in chunk:
                    session_info = chunk["sessionInfo"]
                    break
        else:
            # It's a single response dict
            chunks = [data]
            session_info = data.get("sessionInfo", {})

        # Extract session ID
        extracted_session_id = (
            session_info.get("session", "").split("/")[-1]
            if session_info.get("session")
            else None
        )

        return {
            "request_params": {
                "engine_id": engine_id,
                "assistant_id": assistant_id,
                "query": query,
                "agent_name": agent_name,
                "session_id": session_id,
                "url": url,
                "api_version": "v1alpha",
                "location": "us",
            },
            "response": {
                "chunks": chunks,
                "chunk_count": len(chunks),
            },
            "session_info": {
                "session_id": extracted_session_id,
                "full_session_path": session_info.get("session"),
                "query_id": session_info.get("queryId"),
            },
            "success": True,
        }

    except Exception as e:
        logger.error(f"Error in stream_assist: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")

        return {
            "request_params": {
                "engine_id": engine_id,
                "assistant_id": assistant_id,
                "query": query,
                "agent_name": agent_name,
            },
            "error": {
                "type": type(e).__name__,
                "message": str(e),
                "traceback": traceback.format_exc(),
            },
            "success": False,
        }
