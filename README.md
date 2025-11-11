# Gemini Enterprise & NotebookLM API Explorer

This application demonstrates the feasibility of interacting with **Gemini Enterprise** (previously known as **Agentspace**) and **NotebookLM Enterprise** functionality via API. This is helpful to prove that subscribers can integrate these capabilities into their own applications, services, and UI.

## Use Cases

### Gemini Enterprise

One common use case is using Gemini Enterprise as an **agent hub** and integrating a few of the agents into your own app, without redirecting your users to the Gemini Enterprise interface.

### NotebookLM Enterprise

Create, manage, and interact with NotebookLM notebooks programmatically, including:

- Creating and managing notebooks
- Adding data sources (text, web URLs, YouTube videos, Google Drive documents)
- Sharing notebooks with team members
- Managing notebook sources and content

> **Note:** This explorer app demonstrates API integration using **Application Default Credentials (ADC)**, not user OAuth credentials. For production applications serving end users, you would typically implement OAuth 2.0 for user authentication.

## Prerequisites

Before running the application, ensure you have:

- **Python 3.9+**
- **Node.js 18+** and npm
- **Google Cloud Project** with Discovery Engine API enabled (The project where Gemini Enterprise is enabled). Ensure you have license and access to that Gemini Enterprise instance
- **Application Default Credentials (ADC)** configured ⚠️

### Setting up Application Default Credentials

This application requires ADC to authenticate with Google Cloud APIs:

```bash
# Install Google Cloud SDK (if not already installed)
brew install google-cloud-sdk  # macOS
# Or download from: https://cloud.google.com/sdk/docs/install

# Authenticate and set up ADC
gcloud auth application-default login

# For NotebookLM with Google Drive access (if using Google Docs/Slides)
gcloud auth login --enable-gdrive-access

# Verify authentication
gcloud auth application-default print-access-token
```

> **Important:** Ensure you have the necessary permissions in your Google Cloud project to access Discovery Engine APIs and NotebookLM Enterprise.

## 🚀 Quick Start

```bash
git clone https://github.com/0nri/gemini-enterprise-api-explorer.git
cd gemini-enterprise-api-explorer
chmod +x setup.sh
./setup.sh
```

The script will:

- ✅ Check prerequisites (Python 3.9+, Node.js 18+)
- ✅ Create Python virtual environment
- ✅ Install all dependencies
- ✅ Start both backend and frontend servers
- ✅ Open your browser to http://localhost:3000

**Then configure your credentials in the sidebar:**

- Enter your Google Cloud **Project Number** (not project ID)
- Enter your Agentspace **Engine ID**
- Click "Apply Configuration"
- Start exploring!

### Finding Your Configuration Values

- **Project Number**: Google Cloud Console → Project Settings → Project number
- **Engine ID**: Discovery Engine → Engines → Your engine name
- **Location**: Usually `us`, `eu`, or `global` (default: `us`)

## 📓 NotebookLM Features

The application now includes full support for NotebookLM Enterprise with the following capabilities:

### Notebook Management

- **Create Notebooks**: Create new NotebookLM notebooks programmatically
- **List Notebooks**: View all recently accessed notebooks
- **Retrieve Notebook Details**: Get comprehensive information about a specific notebook
- **Share Notebooks**: Share notebooks with team members with configurable roles (Owner, Writer, Reader)
- **Delete Notebooks**: Batch delete notebooks
- **Get Notebook URLs**: Generate browser URLs for accessing notebooks

### Data Source Management

Add various types of content to your notebooks:

1. **Text Content**: Add raw text directly
2. **Web Content**: Add content from URLs
3. **YouTube Videos**: Add YouTube videos as sources
4. **Google Drive**: Add Google Docs or Google Slides (requires Google Drive access)

### Supported File Types for Upload

- **Documents**: PDF, TXT, MD, DOCX, PPTX, XLSX
- **Audio**: MP3, WAV, M4A, OGG, and more
- **Images**: PNG, JPG, JPEG

### API Endpoints

#### Notebook Management

- `POST /notebooks/` - Create a new notebook
- `GET /notebooks/{notebook_id}` - Get notebook details
- `GET /notebooks/` - List recently viewed notebooks
- `POST /notebooks/batch-delete` - Delete multiple notebooks
- `POST /notebooks/share` - Share a notebook
- `GET /notebooks/url/{notebook_id}` - Get notebook browser URL

#### Source Management

- `POST /notebooks/{notebook_id}/sources/batch-create` - Add sources to notebook
- `GET /notebooks/{notebook_id}/sources/{source_id}` - Get source details
- `POST /notebooks/{notebook_id}/sources/batch-delete` - Delete sources
- `POST /notebooks/{notebook_id}/sources/upload` - Upload a file as source

## 🎯 Features

### Gemini Enterprise

- **API Explorer**: Test various Gemini Enterprise API endpoints
- **Chat Interface**: Interactive chat with Gemini Enterprise agents
- **Search**: Enterprise search functionality
- **Agent Management**: List and manage available agents

### NotebookLM Enterprise

- **Notebook Creation & Management**: Full CRUD operations for notebooks
- **Multi-format Source Support**: Add text, web, video, and Google Drive content
- **Collaboration**: Share notebooks with team members
- **Source Organization**: Manage and organize notebook data sources

## 🔐 Authentication & Permissions

### Required Google Cloud APIs

Enable these APIs in your Google Cloud project:

- Discovery Engine API
- NotebookLM API (if using NotebookLM features)

### IAM Roles

Ensure your authenticated account has:

- `roles/discoveryengine.admin` or appropriate Discovery Engine permissions
- `roles/notebooklm.user` for NotebookLM features

### Google Drive Access

If you plan to add Google Docs or Google Slides to notebooks:

```bash
gcloud auth login --enable-gdrive-access
```

## 🏗️ Architecture

### Backend (Python/FastAPI)

- **Framework**: FastAPI with async support
- **API Client**: Google Cloud Discovery Engine SDK + custom REST client for NotebookLM
- **Authentication**: Application Default Credentials (ADC)
- **Structure**:
  - `backend/api/routes/` - API endpoints for notebooks, agents, search, conversations
  - `backend/clients/` - Client libraries for Google Cloud services
  - `backend/api/models/` - Pydantic models for request/response validation

### Frontend (Next.js/React/TypeScript)

- **Framework**: Next.js 14 with App Router
- **UI**: React components with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React hooks (useState, useEffect)
- **Structure**:
  - `frontend/app/` - Next.js pages and layouts
  - `frontend/components/` - Reusable React components
  - `frontend/lib/` - API client and utilities

### Key Components

#### Backend

- [`NotebookClient`](backend/clients/notebook_client.py) - Handles all NotebookLM API operations
- [`AgentClient`](backend/clients/agent_client.py) - Manages Gemini Enterprise agents
- [`SearchClient`](backend/clients/search_client.py) - Enterprise search functionality
- [`ConversationClient`](backend/clients/conversation_client.py) - Conversational AI interactions

#### Frontend

- [`NotebookExplorer`](frontend/components/NotebookExplorer.tsx) - Main notebook management interface
- [`NotebookSourceManager`](frontend/components/NotebookSourceManager.tsx) - Data source CRUD operations
- [`NotebookList`](frontend/components/NotebookList.tsx) - Notebook browsing and selection
- [`ApiExplorer`](frontend/components/ApiExplorer.tsx) - Gemini Enterprise API testing
- [`ChatInterface`](frontend/components/ChatInterface.tsx) - Interactive chat with agents

## 🛠️ Development

### Running Locally

#### Backend Only

From the **project root** directory:

```bash
# Activate virtual environment
source backend/.venv/bin/activate

# Run backend
python -m backend.api.main
```

Or from **inside the backend directory**:

```bash
cd backend
source .venv/bin/activate
python -m api.main
```

Backend will be available at http://localhost:8000
API docs at http://localhost:8000/docs

#### Frontend Only

```bash
cd frontend
npm run dev
```

Frontend will be available at http://localhost:3000

### Project Structure

```
gemini-enterprise-api-explorer/
├── backend/
│   ├── api/
│   │   ├── models/          # Pydantic schemas
│   │   ├── routes/          # API endpoints
│   │   └── main.py          # FastAPI application
│   ├── clients/             # Google Cloud API clients
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── app/                 # Next.js pages
│   ├── components/          # React components
│   ├── lib/                 # Utilities and API client
│   └── package.json         # Node dependencies
└── setup.sh                 # Setup and start script
```

## 📚 API Documentation

Once the backend is running, visit http://localhost:8000/docs for interactive API documentation powered by FastAPI's automatic OpenAPI/Swagger UI.

## 🤝 Contributing

This is a demonstration project. Feel free to fork and adapt it for your needs.

## 📄 License

This project is provided as-is for demonstration purposes.

## 🐛 Troubleshooting

### "Address already in use" Error

If you see `ERROR: [Errno 48] Address already in use`, it means port 8000 (backend) or 3000 (frontend) is already in use.

**Solution:**

```bash
# Find and kill the process using port 8000
lsof -ti:8000 | xargs kill -9

# Find and kill the process using port 3000
lsof -ti:3000 | xargs kill -9
```

Or kill all Python and Node processes:

```bash
pkill -f "python -m backend.api.main"
pkill -f "npm run dev"
```

### Module Not Found Error

If you see `ModuleNotFoundError: No module named 'backend'`:

- Make sure you're running from the **project root** directory
- Use `python -m backend.api.main` (not from inside the backend folder)
- Or if in the backend folder, use `python -m api.main`

### Dependencies Not Installed

If you see import errors:

```bash
# Backend
cd backend
source .venv/bin/activate
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

### Google Cloud Authentication Issues

If you see authentication errors:

```bash
# Re-authenticate
gcloud auth application-default login

# For Google Drive access
gcloud auth login --enable-gdrive-access

# Verify
gcloud auth application-default print-access-token
```

## ⚠️ Important Notes

- This application uses **Application Default Credentials (ADC)** for authentication
- For production use with end users, implement **OAuth 2.0** instead of ADC
- NotebookLM Enterprise requires appropriate licensing and permissions
- Google Drive integration requires explicit user consent via OAuth
- Always follow Google Cloud's best practices for API usage and security
