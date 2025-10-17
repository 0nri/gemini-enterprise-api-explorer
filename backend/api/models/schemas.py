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
