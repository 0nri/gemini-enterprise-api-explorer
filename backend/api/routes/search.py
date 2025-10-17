"""
Search API routes.
"""

import logging
import traceback

from fastapi import APIRouter, HTTPException

from backend.api.models import ErrorResponse, SearchRequest, SearchResponse
from backend.clients import SearchClient

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/search", tags=["search"])


@router.post("/", response_model=SearchResponse)
async def search(request: SearchRequest):
    """
    Perform an enterprise search query.

    Args:
        request: Search request containing query and configuration parameters

    Returns:
        Search results with metadata

    Raises:
        HTTPException: If the search fails
    """
    try:
        logger.info(f"Performing search with query: {request.query}")
        logger.info(
            f"Configuration - Project: {request.project_number}, Location: {request.location}, Engine: {request.engine_id}"
        )

        # Create client with configuration from request
        search_client = SearchClient(
            project_number=request.project_number,
            location=request.location,
            engine_id=request.engine_id,
        )

        result = search_client.search(
            query=request.query,
            page_size=request.page_size,
            spell_correction=request.spell_correction,
        )
        logger.info(f"Search successful, found {result.get('total_size', 0)} results")
        return result
    except Exception as e:
        logger.error(f"Error performing search: {str(e)}")
        logger.error(f"Exception type: {type(e).__name__}")
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")


@router.get("/health")
async def health_check():
    """
    Health check endpoint for search service.

    Returns:
        Status message
    """
    return {"status": "healthy", "service": "search"}
