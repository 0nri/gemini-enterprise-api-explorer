"""
Agent/Engine API routes.
"""

import logging
import traceback

from fastapi import APIRouter, HTTPException, Query

from backend.api.models import EngineInfo, EngineListResponse
from backend.clients import AgentClient

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("/", response_model=EngineListResponse)
async def list_agents(
    project_number: str = Query(..., description="Google Cloud project number"),
    location: str = Query("us", description="Engine location (us, eu, global)"),
):
    """
    List all available agents/engines.

    Args:
        project_number: Google Cloud project number
        location: Engine location (us, eu, global)

    Returns:
        List of available engines with their details

    Raises:
        HTTPException: If listing fails
    """
    try:
        logger.info("Attempting to list agents/engines")
        logger.info(f"Configuration - Project: {project_number}, Location: {location}")

        # Create client with configuration from query parameters
        agent_client = AgentClient(
            project_number=project_number,
            location=location,
        )

        engines = agent_client.list_engines()
        logger.info(f"Successfully retrieved {len(engines)} engines")
        return {"engines": engines}
    except Exception as e:
        logger.error(f"Error listing agents: {str(e)}")
        logger.error(f"Exception type: {type(e).__name__}")
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")


@router.get("/{engine_id}", response_model=EngineInfo)
async def get_agent(
    engine_id: str,
    project_number: str = Query(..., description="Google Cloud project number"),
    location: str = Query("us", description="Engine location (us, eu, global)"),
):
    """
    Get details for a specific agent/engine.

    Args:
        engine_id: The ID of the engine to retrieve
        project_number: Google Cloud project number
        location: Engine location (us, eu, global)

    Returns:
        Engine details

    Raises:
        HTTPException: If retrieval fails
    """
    try:
        logger.info(f"Getting engine details for: {engine_id}")
        logger.info(f"Configuration - Project: {project_number}, Location: {location}")

        # Create client with configuration from query parameters
        agent_client = AgentClient(
            project_number=project_number,
            location=location,
        )

        engine = agent_client.get_engine(engine_id)
        return engine
    except Exception as e:
        logger.error(f"Error getting agent: {str(e)}")
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")


@router.get("/health/check")
async def health_check():
    """
    Health check endpoint for agents service.

    Returns:
        Status message
    """
    return {"status": "healthy", "service": "agents"}
