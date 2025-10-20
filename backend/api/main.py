"""
FastAPI application entry point.
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend import config
from backend.api.routes import (
    agents_router,
    api_explorer_router,
    conversations_router,
    search_router,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title="Gemini Enterprise API Explorer",
    description="API for accessing Gemini Enterprise (Agentspace) functionality",
    version="1.0.0",
)

logger.info("FastAPI application initialized")

# Configure CORS
# Allow requests from various frontend origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://0.0.0.0:3000",
        "*",  # Allow all origins in development (remove in production)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(search_router)
app.include_router(agents_router)
app.include_router(conversations_router)
app.include_router(api_explorer_router)


@app.get("/")
async def root():
    """
    Root endpoint.

    Returns:
        Welcome message and API information
    """
    return {
        "message": "Gemini Enterprise API Explorer",
        "version": "1.0.0",
        "endpoints": {
            "search": "/search",
            "agents": "/agents",
            "conversations": "/conversations",
            "docs": "/docs",
        },
    }


@app.get("/health")
async def health():
    """
    Health check endpoint.

    Returns:
        Health status
    """
    return {"status": "healthy", "service": "api"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.api.main:app",
        host=config.BACKEND_HOST,
        port=config.BACKEND_PORT,
        reload=True,
    )
