"""
Configuration settings for Google Agentspace API integration.
"""

# Google Cloud Project Settings
# Note: These are default/placeholder values.
# Actual configuration is done through the web UI sidebar.
# The frontend sends the configured values with each API request.
PROJECT_ID = ""  # Configured via UI
LOCATION = "us"  # Default location
ENGINE_ID = ""  # Configured via UI
COLLECTION_ID = "default_collection"

# Serving Config Path for Search (built dynamically from request parameters)
SERVING_CONFIG = f"projects/{PROJECT_ID}/locations/{LOCATION}/collections/{COLLECTION_ID}/engines/{ENGINE_ID}/servingConfigs/default_search"

# API Settings
API_ENDPOINT = f"https://{LOCATION}-discoveryengine.googleapis.com"

# Server Settings
BACKEND_HOST = "0.0.0.0"
BACKEND_PORT = 8000
FRONTEND_URL = "http://localhost:3000"

# Search Settings
DEFAULT_PAGE_SIZE = 10
DEFAULT_LANGUAGE_CODE = "en"
