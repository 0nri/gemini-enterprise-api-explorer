"""
Conversation API routes with streaming support.
"""

import json
import logging
import traceback
from typing import AsyncIterator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from backend.api.models import ConversationRequest, ConversationResponse
from backend.clients import ConversationClient

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.post("/", response_model=ConversationResponse)
async def converse(request: ConversationRequest):
    """
    Perform a conversational query (non-streaming).

    Args:
        request: Conversation request containing query, configuration, and optional conversation ID

    Returns:
        Conversation response with text and metadata

    Raises:
        HTTPException: If the conversation fails
    """
    try:
        logger.info(f"Non-streaming conversation request: {request.query}")
        logger.info(
            f"Configuration - Project: {request.project_number}, Location: {request.location}, Engine: {request.engine_id}"
        )

        # Create client with configuration from request
        conversation_client = ConversationClient(
            project_number=request.project_number,
            location=request.location,
            engine_id=request.engine_id,
        )

        result = conversation_client.converse(
            query=request.query,
            conversation_id=request.conversation_id,
        )
        logger.info("Non-streaming conversation successful")
        return result
    except Exception as e:
        logger.error(f"Error in non-streaming conversation: {str(e)}")
        logger.error(f"Exception type: {type(e).__name__}")
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")


@router.post("/stream")
async def converse_stream(request: ConversationRequest):
    """
    Perform a conversational query with streaming response.

    Args:
        request: Conversation request containing query, configuration, and optional conversation ID

    Returns:
        Server-Sent Events stream of response chunks

    Raises:
        HTTPException: If the conversation fails
    """
    logger.info(
        f"Streaming conversation request: query='{request.query}', conversation_id={request.conversation_id}"
    )
    logger.info(
        f"Configuration - Project: {request.project_number}, Location: {request.location}, Engine: {request.engine_id}"
    )

    # Create client with configuration from request
    conversation_client = ConversationClient(
        project_number=request.project_number,
        location=request.location,
        engine_id=request.engine_id,
    )

    async def event_generator() -> AsyncIterator[str]:
        """Generate Server-Sent Events from the conversation stream."""
        try:
            logger.info("Starting conversation stream...")
            chunk_count = 0

            async for chunk in conversation_client.converse_stream(
                query=request.query,
                conversation_id=request.conversation_id,
                session_id=request.session_id,
            ):
                chunk_count += 1
                logger.debug(f"Received chunk {chunk_count}: {chunk}")

                # Format as SSE
                yield f"data: {json.dumps(chunk)}\n\n"

            logger.info(
                f"Conversation stream completed successfully. Total chunks: {chunk_count}"
            )

            # Send completion event
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            logger.error(f"Error in conversation stream: {str(e)}")
            logger.error(f"Exception type: {type(e).__name__}")
            logger.error(f"Full traceback:\n{traceback.format_exc()}")

            # Send error event
            error_data = {"type": "error", "error": f"{type(e).__name__}: {str(e)}"}
            yield f"data: {json.dumps(error_data)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable buffering in nginx
        },
    )


@router.get("/health")
async def health_check():
    """
    Health check endpoint for conversations service.

    Returns:
        Status message
    """
    return {"status": "healthy", "service": "conversations"}
