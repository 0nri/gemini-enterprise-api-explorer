# Architecture

Technical architecture and development guide for the Gemini Enterprise API Explorer.

## System Overview

This is a full-stack application demonstrating API integration with Gemini Enterprise (Agentspace) and NotebookLM Enterprise.

### Tech Stack

**Backend:**
- Python 3.9+ with FastAPI
- Google Cloud Discovery Engine SDK
- Custom REST clients for NotebookLM
- Application Default Credentials (ADC) for authentication

**Frontend:**
- Next.js 14 with App Router
- React with TypeScript
- Tailwind CSS for styling
- React hooks for state management

## Backend Architecture

### Structure

```
backend/
├── api/
│   ├── models/          # Pydantic schemas for request/response validation
│   ├── routes/          # API endpoint definitions
│   └── main.py          # FastAPI application entry point
├── clients/             # Google Cloud API client wrappers
├── config.py            # Configuration management
└── requirements.txt     # Python dependencies
```

### Key Components

#### API Routes (`backend/api/routes/`)

- **agents.py** - List and manage Gemini Enterprise agents
- **search.py** - Enterprise search functionality
- **conversations.py** - Conversational AI interactions
- **notebooks.py** - NotebookLM notebook and source management
- **api_explorer.py** - Generic API exploration endpoints

#### Client Layer (`backend/clients/`)

- **AgentClient** - Manages Gemini Enterprise agents
- **SearchClient** - Handles enterprise search operations
- **ConversationClient** - Manages conversational AI sessions
- **NotebookClient** - Complete NotebookLM API operations

Each client:
- Handles authentication with Google Cloud
- Manages API endpoints and request formatting
- Provides Python-friendly interfaces to REST APIs
- Includes error handling and logging

#### Models (`backend/api/models/`)

Pydantic models for type safety and validation:
- Request schemas (user input validation)
- Response schemas (API response formatting)
- Internal data models

### Authentication

Uses Google Cloud Application Default Credentials (ADC):

```python
import google.auth

credentials, project = google.auth.default(
    scopes=["https://www.googleapis.com/auth/cloud-platform"]
)
```

For production with end users, implement OAuth 2.0 instead.

## Frontend Architecture

### Structure

```
frontend/
├── app/                 # Next.js App Router pages
│   ├── page.tsx        # Main application page
│   ├── layout.tsx      # Root layout
│   └── globals.css     # Global styles
├── components/          # React components
│   ├── ApiExplorer.tsx
│   ├── ChatInterface.tsx
│   ├── SearchResults.tsx
│   ├── AgentList.tsx
│   ├── NotebookExplorer.tsx
│   ├── NotebookList.tsx
│   ├── NotebookSourceManager.tsx
│   └── ConfigSidebar.tsx
├── lib/                 # Utilities and API client
│   ├── api.ts          # Backend API client functions
│   └── config.ts       # Configuration management
└── package.json         # Node dependencies
```

### Key Components

#### Main Application (`app/page.tsx`)

- Manages application state (view selection, configuration)
- Renders ConfigSidebar and selected view component
- Handles view switching between Chat, Search, API Explorer, and NotebookLM

#### Components

**Gemini Enterprise:**
- **ApiExplorer** - Test various API endpoints interactively
- **ChatInterface** - Interactive chat with agents
- **SearchResults** - Display enterprise search results
- **AgentList** - Browse and select available agents

**NotebookLM:**
- **NotebookExplorer** - Main notebook management interface
- **NotebookList** - Browse and select notebooks
- **NotebookSourceManager** - Add/remove/manage sources

**Shared:**
- **ConfigSidebar** - Configure project number, engine ID, location

#### API Client (`lib/api.ts`)

TypeScript functions that call backend endpoints:
- Type-safe with TypeScript interfaces
- Async/await pattern
- Error handling
- Request/response formatting

Example:
```typescript
export async function createNotebook(
  request: NotebookCreateRequest
): Promise<NotebookCreateResponse> {
  const response = await fetch(`${API_BASE_URL}/notebooks/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create notebook: ${response.statusText}`);
  }
  
  return response.json();
}
```

## Development

### Running Locally

#### Backend

From project root:
```bash
source backend/.venv/bin/activate
python -m backend.api.main
```

Or from backend directory:
```bash
cd backend
source .venv/bin/activate
python -m api.main
```

Backend runs at: http://localhost:8000
API docs at: http://localhost:8000/docs

#### Frontend

```bash
cd frontend
npm run dev
```

Frontend runs at: http://localhost:3000

### API Documentation

FastAPI automatically generates interactive API documentation:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Adding New Features

#### Backend

1. **Define Pydantic models** in `backend/api/models/schemas.py`
2. **Create client** in `backend/clients/` if needed
3. **Add route** in `backend/api/routes/`
4. **Register router** in `backend/api/main.py`

#### Frontend

1. **Add TypeScript interfaces** in `lib/api.ts`
2. **Create API functions** in `lib/api.ts`
3. **Build React component** in `components/`
4. **Integrate** into `app/page.tsx`

## API Endpoints

### Gemini Enterprise

- `GET /agents` - List available agents
- `POST /search` - Perform enterprise search
- `POST /conversations` - Start/continue conversation
- `POST /api-explorer/execute` - Execute arbitrary API calls

### NotebookLM

See [NOTEBOOKLM.md](./NOTEBOOKLM.md) for complete endpoint documentation.

## Configuration

### Backend (`backend/config.py`)

```python
BACKEND_HOST = "0.0.0.0"
BACKEND_PORT = 8000
```

### Frontend (`frontend/lib/config.ts`)

```typescript
export const API_BASE_URL = 'http://localhost:8000';
```

## Security Considerations

### Development
- Uses ADC (Application Default Credentials)
- Runs on localhost only
- No user authentication required

### Production
- Implement OAuth 2.0 for user authentication
- Use HTTPS for all connections
- Implement proper CORS policies
- Follow Google Cloud security best practices
- Secure storage of credentials
- Rate limiting and usage quotas

## Troubleshooting

### Module Import Errors

Ensure you're running from the correct directory:
- Backend: Run from project root as `python -m backend.api.main`
- Or from backend dir as `python -m api.main`

### Port Conflicts

Kill processes using ports 8000 or 3000:
```bash
lsof -ti:8000 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

### Authentication Errors

Re-authenticate with Google Cloud:
```bash
gcloud auth application-default login
gcloud auth application-default print-access-token
```

## Contributing

When contributing:
1. Follow existing code structure
2. Add type hints (Python) and types (TypeScript)
3. Update Pydantic models for new endpoints
4. Test locally before committing
5. Update documentation as needed
