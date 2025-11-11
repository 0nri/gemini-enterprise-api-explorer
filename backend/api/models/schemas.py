"""
Pydantic models for API request/response schemas.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    """Request model for search endpoint."""

    query: str = Field(..., description="The search query string")
    page_size: int = Field(10, ge=1, le=100, description="Number of results to return")
    spell_correction: bool = Field(True, description="Enable spell correction")
    # Configuration from UI sidebar
    project_number: str = Field(..., description="Google Cloud project number")
    location: str = Field("us", description="Engine location (us, eu, global)")
    engine_id: str = Field(..., description="Engine/datastore ID")


class SearchResult(BaseModel):
    """Individual search result."""

    id: str
    name: str
    data: Dict[str, Any]


class SearchResponse(BaseModel):
    """Response model for search endpoint."""

    results: List[SearchResult]
    total_size: int
    attribution_token: str
    query: str


class ConversationRequest(BaseModel):
    """Request model for conversation endpoint."""

    query: str = Field(..., description="The user's query")
    conversation_id: Optional[str] = Field(
        None, description="Optional conversation ID to continue existing conversation"
    )
    session_id: Optional[str] = Field(None, description="Optional session ID")
    # Configuration from UI sidebar
    project_number: str = Field(..., description="Google Cloud project number")
    location: str = Field("us", description="Engine location (us, eu, global)")
    engine_id: str = Field(..., description="Engine/datastore ID")


class ConversationResponse(BaseModel):
    """Response model for conversation endpoint."""

    text: Optional[str] = None
    conversation_id: Optional[str] = None
    conversation_state: Optional[str] = None
    search_results: Optional[List[Dict[str, Any]]] = None
    summary_skipped_reasons: Optional[List[str]] = None


class EngineInfo(BaseModel):
    """Information about an engine/agent."""

    name: str
    display_name: str
    solution_type: str
    industry_vertical: str
    create_time: Optional[str] = None


class EngineListResponse(BaseModel):
    """Response model for listing engines."""

    engines: List[EngineInfo]


class ErrorResponse(BaseModel):
    """Error response model."""

    error: str
    detail: Optional[str] = None


# NotebookLM Enterprise API Models


class NotebookMetadata(BaseModel):
    """Metadata for a notebook."""

    user_role: Optional[str] = Field(None, alias="userRole")
    is_shared: bool = Field(alias="isShared")
    is_shareable: bool = Field(alias="isShareable")
    last_viewed: Optional[str] = Field(None, alias="lastViewed")
    create_time: Optional[str] = Field(None, alias="createTime")

    class Config:
        populate_by_name = True


class NotebookInfo(BaseModel):
    """Information about a NotebookLM notebook."""

    name: str
    title: str
    notebook_id: str = Field(alias="notebookId")
    emoji: str = ""
    metadata: NotebookMetadata

    class Config:
        populate_by_name = True
        allow_population_by_field_name = True


class NotebookCreateRequest(BaseModel):
    """Request model for creating a notebook."""

    title: str = Field(..., description="UTF-8 encoded title for the notebook")
    project_number: str = Field(..., description="Google Cloud project number")
    location: str = Field("us", description="Location (us, eu, global)")


class NotebookCreateResponse(BaseModel):
    """Response model for notebook creation."""

    title: str
    notebook_id: str = Field(alias="notebookId")
    emoji: str
    metadata: NotebookMetadata
    name: str

    class Config:
        populate_by_name = True
        allow_population_by_field_name = True


class NotebookListResponse(BaseModel):
    """Response model for listing recently viewed notebooks."""

    notebooks: List[NotebookInfo]


class NotebookBatchDeleteRequest(BaseModel):
    """Request model for batch deleting notebooks."""

    names: List[str] = Field(
        ..., description="List of notebook resource names to delete"
    )
    project_number: str = Field(..., description="Google Cloud project number")
    location: str = Field("us", description="Location (us, eu, global)")


class NotebookShareAccountRole(BaseModel):
    """Account and role for notebook sharing."""

    email: str = Field(..., description="Email address of the user")
    role: str = Field(
        ...,
        description="Role (PROJECT_ROLE_OWNER, PROJECT_ROLE_WRITER, PROJECT_ROLE_READER, PROJECT_ROLE_NOT_SHARED)",
    )


class NotebookShareRequest(BaseModel):
    """Request model for sharing a notebook."""

    notebook_id: str = Field(..., description="Notebook ID to share")
    account_and_roles: List[NotebookShareAccountRole] = Field(
        ..., description="List of users and their roles"
    )
    project_number: str = Field(..., description="Google Cloud project number")
    location: str = Field("us", description="Location (us, eu, global)")


# Notebook Source Models


class GoogleDriveContent(BaseModel):
    """Google Drive content (Docs or Slides)."""

    document_id: str = Field(..., description="Google Drive document ID")
    mime_type: str = Field(
        ...,
        description="MIME type (application/vnd.google-apps.document or application/vnd.google-apps.presentation)",
    )
    source_name: str = Field(..., description="Display name for the source")


class TextContent(BaseModel):
    """Raw text content."""

    source_name: str = Field(..., description="Display name for the source")
    content: str = Field(..., description="Raw text content")


class WebContent(BaseModel):
    """Web content from URL."""

    url: str = Field(..., description="URL of the web content")
    source_name: str = Field(..., description="Display name for the source")


class VideoContent(BaseModel):
    """YouTube video content."""

    url: str = Field(..., description="YouTube video URL")


class UserContent(BaseModel):
    """User content for notebook sources."""

    google_drive_content: Optional[GoogleDriveContent] = None
    text_content: Optional[TextContent] = None
    web_content: Optional[WebContent] = None
    video_content: Optional[VideoContent] = None


class SourceId(BaseModel):
    """Source identifier."""

    id: str


class SourceSettings(BaseModel):
    """Source settings."""

    status: str


class SourceInfo(BaseModel):
    """Information about a notebook source."""

    source_id: SourceId = Field(alias="sourceId")
    title: str
    metadata: Optional[Dict[str, Any]] = None
    settings: SourceSettings
    name: str

    class Config:
        populate_by_name = True
        allow_population_by_field_name = True


class NotebookSourceBatchCreateRequest(BaseModel):
    """Request model for batch creating notebook sources."""

    notebook_id: str = Field(..., description="Notebook ID")
    user_contents: List[UserContent] = Field(
        ..., description="List of user content to add as sources"
    )
    project_number: str = Field(..., description="Google Cloud project number")
    location: str = Field("us", description="Location (us, eu, global)")


class NotebookSourceBatchCreateResponse(BaseModel):
    """Response model for batch creating notebook sources."""

    sources: List[SourceInfo]


class NotebookSourceBatchDeleteRequest(BaseModel):
    """Request model for batch deleting notebook sources."""

    notebook_id: str = Field(..., description="Notebook ID")
    names: List[str] = Field(
        ..., description="List of source resource names to delete"
    )
    project_number: str = Field(..., description="Google Cloud project number")
    location: str = Field("us", description="Location (us, eu, global)")


class NotebookSourceUploadRequest(BaseModel):
    """Request model for uploading a file as source."""

    notebook_id: str = Field(..., description="Notebook ID")
    file_name: str = Field(..., description="Display name for the file")
    content_type: str = Field(..., description="Content type of the file")
    project_number: str = Field(..., description="Google Cloud project number")
    location: str = Field("us", description="Location (us, eu, global)")


class NotebookSourceUploadResponse(BaseModel):
    """Response model for uploading a file."""

    source_id: SourceId = Field(alias="sourceId")

    class Config:
        populate_by_name = True
        allow_population_by_field_name = True
