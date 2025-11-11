"""
NotebookLM Enterprise API routes.
"""

import logging
import traceback

from fastapi import APIRouter, HTTPException, Query, Request

from backend.api.models import (
    NotebookBatchDeleteRequest,
    NotebookCreateRequest,
    NotebookCreateResponse,
    NotebookInfo,
    NotebookListResponse,
    NotebookShareRequest,
    NotebookSourceBatchCreateRequest,
    NotebookSourceBatchCreateResponse,
    NotebookSourceBatchDeleteRequest,
    NotebookSourceUploadResponse,
    SourceInfo,
)
from backend.clients import NotebookClient

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notebooks", tags=["notebooks"])


@router.post("/", response_model=NotebookCreateResponse, response_model_by_alias=False)
async def create_notebook(request: NotebookCreateRequest):
    """
    Create a new NotebookLM notebook.

    Args:
        request: Notebook creation request containing title and configuration

    Returns:
        Created notebook details including notebook_id

    Raises:
        HTTPException: If creation fails
    """
    try:
        logger.info(f"Creating notebook: {request.title}")
        logger.info(
            f"Configuration - Project: {request.project_number}, Location: {request.location}"
        )

        # Create client with configuration from request
        notebook_client = NotebookClient(
            project_number=request.project_number,
            location=request.location,
        )

        notebook = notebook_client.create_notebook(request.title)
        logger.info(f"Successfully created notebook with ID: {notebook.get('notebookId')}")
        return notebook
    except Exception as e:
        logger.error(f"Error creating notebook: {str(e)}")
        logger.error(f"Exception type: {type(e).__name__}")
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")


@router.get("/{notebook_id}", response_model=NotebookInfo, response_model_by_alias=False)
async def get_notebook(
    notebook_id: str,
    project_number: str = Query(..., description="Google Cloud project number"),
    location: str = Query("us", description="Location (us, eu, global)"),
):
    """
    Retrieve a specific NotebookLM notebook.

    Args:
        notebook_id: The notebook's unique identifier
        project_number: Google Cloud project number
        location: Location (us, eu, global)

    Returns:
        Notebook details

    Raises:
        HTTPException: If retrieval fails
    """
    try:
        logger.info(f"Getting notebook details for: {notebook_id}")
        logger.info(f"Configuration - Project: {project_number}, Location: {location}")

        # Create client with configuration from query parameters
        notebook_client = NotebookClient(
            project_number=project_number,
            location=location,
        )

        notebook = notebook_client.get_notebook(notebook_id)
        return notebook
    except Exception as e:
        logger.error(f"Error getting notebook: {str(e)}")
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")


@router.get("/", response_model=NotebookListResponse, response_model_by_alias=False)
async def list_recently_viewed(
    project_number: str = Query(..., description="Google Cloud project number"),
    location: str = Query("us", description="Location (us, eu, global)"),
    page_size: int = Query(500, ge=1, le=1000, description="Number of notebooks to return"),
):
    """
    List recently viewed NotebookLM notebooks.

    Args:
        project_number: Google Cloud project number
        location: Location (us, eu, global)
        page_size: Number of notebooks to return (default: 500)

    Returns:
        List of recently viewed notebooks

    Raises:
        HTTPException: If listing fails
    """
    try:
        logger.info("Listing recently viewed notebooks")
        logger.info(f"Configuration - Project: {project_number}, Location: {location}")

        # Create client with configuration from query parameters
        notebook_client = NotebookClient(
            project_number=project_number,
            location=location,
        )

        result = notebook_client.list_recently_viewed(page_size=page_size)
        logger.info(f"Successfully retrieved {len(result.get('notebooks', []))} notebooks")
        return result
    except Exception as e:
        logger.error(f"Error listing notebooks: {str(e)}")
        logger.error(f"Exception type: {type(e).__name__}")
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")


@router.post("/batch-delete")
async def batch_delete_notebooks(request: NotebookBatchDeleteRequest):
    """
    Delete multiple NotebookLM notebooks in batch.

    Args:
        request: Batch delete request containing notebook names

    Returns:
        Empty response on success

    Raises:
        HTTPException: If deletion fails
    """
    try:
        logger.info(f"Batch deleting {len(request.names)} notebooks")
        logger.info(
            f"Configuration - Project: {request.project_number}, Location: {request.location}"
        )

        # Create client with configuration from request
        notebook_client = NotebookClient(
            project_number=request.project_number,
            location=request.location,
        )

        result = notebook_client.batch_delete(request.names)
        logger.info("Successfully deleted notebooks")
        return result
    except Exception as e:
        logger.error(f"Error deleting notebooks: {str(e)}")
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")


@router.post("/share")
async def share_notebook(request: NotebookShareRequest):
    """
    Share a NotebookLM notebook with users.

    Args:
        request: Share request containing notebook_id, users, and roles

    Returns:
        Empty response on success

    Raises:
        HTTPException: If sharing fails
    """
    try:
        logger.info(f"Sharing notebook {request.notebook_id} with {len(request.account_and_roles)} users")
        logger.info(
            f"Configuration - Project: {request.project_number}, Location: {request.location}"
        )

        # Create client with configuration from request
        notebook_client = NotebookClient(
            project_number=request.project_number,
            location=request.location,
        )

        # Convert Pydantic models to dicts for the client
        account_and_roles = [
            {"email": account.email, "role": account.role}
            for account in request.account_and_roles
        ]

        result = notebook_client.share_notebook(request.notebook_id, account_and_roles)
        logger.info("Successfully shared notebook")
        return result
    except Exception as e:
        logger.error(f"Error sharing notebook: {str(e)}")
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")


@router.get("/url/{notebook_id}")
async def get_notebook_url(
    notebook_id: str,
    project_number: str = Query(..., description="Google Cloud project number"),
    location: str = Query("us", description="Location (us, eu, global)"),
    use_google_identity: bool = Query(True, description="Use Google identity (vs third-party)"),
):
    """
    Get the browser URL for accessing a NotebookLM notebook.

    Args:
        notebook_id: The notebook's unique identifier
        project_number: Google Cloud project number
        location: Location (us, eu, global)
        use_google_identity: True for Google identity, False for third-party

    Returns:
        Dictionary containing the URL

    Raises:
        HTTPException: If URL generation fails
    """
    try:
        logger.info(f"Generating URL for notebook: {notebook_id}")

        # Create client with configuration from query parameters
        notebook_client = NotebookClient(
            project_number=project_number,
            location=location,
        )

        url = notebook_client.get_notebook_url(notebook_id, use_google_identity)
        return {"url": url, "notebook_id": notebook_id}
    except Exception as e:
        logger.error(f"Error generating notebook URL: {str(e)}")
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")


@router.get("/health/check")
async def health_check():
    """
    Health check endpoint for notebooks service.

    Returns:
        Status message
    """
    return {"status": "healthy", "service": "notebooks"}


# Notebook Source Management Routes


@router.post("/{notebook_id}/sources/batch-create", response_model=NotebookSourceBatchCreateResponse, response_model_by_alias=False)
async def batch_create_sources(notebook_id: str, request: NotebookSourceBatchCreateRequest):
    """
    Add data sources to a notebook in batch.

    Args:
        notebook_id: The notebook's unique identifier
        request: Batch create request containing user contents

    Returns:
        Created sources information

    Raises:
        HTTPException: If creation fails
    """
    try:
        logger.info(f"Batch creating sources for notebook: {notebook_id}")
        logger.info(f"Configuration - Project: {request.project_number}, Location: {request.location}")

        # Create client with configuration from request
        notebook_client = NotebookClient(
            project_number=request.project_number,
            location=request.location,
        )

        # Convert Pydantic models to dicts for the client
        user_contents = []
        for content in request.user_contents:
            content_dict = {}
            if content.google_drive_content:
                content_dict["googleDriveContent"] = {
                    "documentId": content.google_drive_content.document_id,
                    "mimeType": content.google_drive_content.mime_type,
                    "sourceName": content.google_drive_content.source_name,
                }
            elif content.text_content:
                content_dict["textContent"] = {
                    "sourceName": content.text_content.source_name,
                    "content": content.text_content.content,
                }
            elif content.web_content:
                content_dict["webContent"] = {
                    "url": content.web_content.url,
                    "sourceName": content.web_content.source_name,
                }
            elif content.video_content:
                content_dict["videoContent"] = {
                    "url": content.video_content.url,
                }
            user_contents.append(content_dict)

        result = notebook_client.batch_create_sources(notebook_id, user_contents)
        logger.info(f"Successfully created {len(result.get('sources', []))} sources")
        return result
    except Exception as e:
        logger.error(f"Error batch creating sources: {str(e)}")
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")


@router.get("/{notebook_id}/sources/{source_id}", response_model=SourceInfo, response_model_by_alias=False)
async def get_source(
    notebook_id: str,
    source_id: str,
    project_number: str = Query(..., description="Google Cloud project number"),
    location: str = Query("us", description="Location (us, eu, global)"),
):
    """
    Retrieve a specific source from a notebook.

    Args:
        notebook_id: The notebook's unique identifier
        source_id: The source's unique identifier
        project_number: Google Cloud project number
        location: Location (us, eu, global)

    Returns:
        Source details

    Raises:
        HTTPException: If retrieval fails
    """
    try:
        logger.info(f"Getting source {source_id} from notebook {notebook_id}")
        logger.info(f"Configuration - Project: {project_number}, Location: {location}")

        # Create client with configuration from query parameters
        notebook_client = NotebookClient(
            project_number=project_number,
            location=location,
        )

        source = notebook_client.get_source(notebook_id, source_id)
        return source
    except Exception as e:
        logger.error(f"Error getting source: {str(e)}")
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")


@router.post("/{notebook_id}/sources/batch-delete")
async def batch_delete_sources(notebook_id: str, request: NotebookSourceBatchDeleteRequest):
    """
    Delete sources from a notebook in batch.

    Args:
        notebook_id: The notebook's unique identifier
        request: Batch delete request containing source names

    Returns:
        Empty response on success

    Raises:
        HTTPException: If deletion fails
    """
    try:
        logger.info(f"Batch deleting {len(request.names)} sources from notebook: {notebook_id}")
        logger.info(f"Configuration - Project: {request.project_number}, Location: {request.location}")

        # Create client with configuration from request
        notebook_client = NotebookClient(
            project_number=request.project_number,
            location=request.location,
        )

        result = notebook_client.batch_delete_sources(notebook_id, request.names)
        logger.info("Successfully deleted sources")
        return result
    except Exception as e:
        logger.error(f"Error deleting sources: {str(e)}")
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")


@router.post("/{notebook_id}/sources/upload", response_model=NotebookSourceUploadResponse, response_model_by_alias=False)
async def upload_file_source(
    notebook_id: str,
    request: Request,
    file_name: str = Query(..., description="Display name for the file"),
    content_type: str = Query(..., description="MIME type of the file"),
    project_number: str = Query(..., description="Google Cloud project number"),
    location: str = Query("us", description="Location (us, eu, global)"),
):
    """
    Upload a file as a source to a notebook.
    
    This endpoint expects the file data in the request body as binary data.

    Args:
        notebook_id: The notebook's unique identifier
        request: FastAPI Request object containing the file data
        file_name: Display name for the file
        content_type: MIME type of the file
        project_number: Google Cloud project number
        location: Location (us, eu, global)

    Returns:
        Source ID of the uploaded file

    Raises:
        HTTPException: If upload fails
    """
    try:
        logger.info(f"Uploading file '{file_name}' to notebook: {notebook_id}")
        logger.info(f"Configuration - Project: {project_number}, Location: {location}")

        # Create client with configuration from query parameters
        notebook_client = NotebookClient(
            project_number=project_number,
            location=location,
        )

        # Read the file data from the request body
        file_data = await request.body()
        
        if not file_data:
            raise HTTPException(status_code=400, detail="No file data received in request body")
        
        logger.info(f"Received {len(file_data)} bytes of file data")

        result = notebook_client.upload_file_source(notebook_id, file_data, file_name, content_type)
        logger.info(f"Successfully uploaded file with source ID: {result.get('sourceId', {}).get('id')}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")