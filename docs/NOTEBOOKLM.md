# NotebookLM Enterprise Integration

Complete guide for using NotebookLM Enterprise features via API.

## Overview

This application provides full programmatic access to NotebookLM Enterprise, allowing you to create, manage, and interact with notebooks without using the web interface.

## Features

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
5. **File Upload**: Upload documents, audio, and images

### Supported File Types

- **Documents**: PDF, TXT, MD, DOCX, PPTX, XLSX
- **Audio**: MP3, WAV, M4A, OGG, and more
- **Images**: PNG, JPG, JPEG

## API Endpoints

### Notebook Management

- `POST /notebooks/` - Create a new notebook
- `GET /notebooks/{notebook_id}` - Get notebook details
- `GET /notebooks/` - List recently viewed notebooks
- `POST /notebooks/batch-delete` - Delete multiple notebooks
- `POST /notebooks/share` - Share a notebook
- `GET /notebooks/url/{notebook_id}` - Get notebook browser URL

### Source Management

- `POST /notebooks/{notebook_id}/sources/batch-create` - Add sources to notebook
- `GET /notebooks/{notebook_id}/sources/{source_id}` - Get source details
- `POST /notebooks/{notebook_id}/sources/batch-delete` - Delete sources
- `POST /notebooks/{notebook_id}/sources/upload` - Upload a file as source

## Authentication & Permissions

### Required Google Cloud APIs

Enable these APIs in your Google Cloud project:

- Discovery Engine API
- NotebookLM API

### IAM Roles

Ensure your authenticated account has:

- `roles/discoveryengine.admin` or appropriate Discovery Engine permissions
- `roles/notebooklm.user` for NotebookLM features

### Google Drive Access

If you plan to add Google Docs or Google Slides to notebooks:

```bash
gcloud auth login --enable-gdrive-access
```

## Usage Examples

### Creating a Notebook

```python
from backend.clients import NotebookClient

client = NotebookClient(
    project_number="YOUR_PROJECT_NUMBER",
    location="us"
)

notebook = client.create_notebook("My Research Notebook")
print(f"Created notebook: {notebook['notebookId']}")
```

### Adding Sources

```python
# Add text content
user_contents = [{
    "text_content": {
        "source_name": "Research Notes",
        "content": "Important research findings..."
    }
}]

result = client.batch_create_sources(
    notebook_id="YOUR_NOTEBOOK_ID",
    user_contents=user_contents
)
```

### Adding Web Content

```python
user_contents = [{
    "web_content": {
        "url": "https://example.com/article",
        "source_name": "Research Article"
    }
}]

result = client.batch_create_sources(
    notebook_id="YOUR_NOTEBOOK_ID",
    user_contents=user_contents
)
```

### Sharing a Notebook

```python
account_and_roles = [{
    "email": "colleague@example.com",
    "role": "PROJECT_ROLE_WRITER"
}]

client.share_notebook(
    notebook_id="YOUR_NOTEBOOK_ID",
    account_and_roles=account_and_roles
)
```

## Frontend Components

### NotebookExplorer

Main notebook management interface providing:
- Notebook creation
- Viewing notebook details
- Sharing functionality
- URL generation
- Delete operations

### NotebookList

Sidebar component for:
- Browsing recently viewed notebooks
- Selecting notebooks for viewing/editing
- Quick access to notebook operations

### NotebookSourceManager

Comprehensive source management:
- Add multiple source types
- Upload files
- Delete sources
- View source details

## Important Notes

- This application uses **Application Default Credentials (ADC)** for authentication
- For production use with end users, implement **OAuth 2.0** instead of ADC
- NotebookLM Enterprise requires appropriate licensing and permissions
- Google Drive integration requires explicit user consent via OAuth
- Always follow Google Cloud's best practices for API usage and security

## Troubleshooting

### Authentication Issues

If you encounter authentication errors:

```bash
# Re-authenticate
gcloud auth application-default login

# For Google Drive access
gcloud auth login --enable-gdrive-access

# Verify
gcloud auth application-default print-access-token
```

### API Errors

Common issues:
- **403 Forbidden**: Check IAM permissions
- **404 Not Found**: Verify project number and notebook ID
- **Invalid credentials**: Re-run `gcloud auth application-default login`

## API Reference

For complete API documentation, visit http://localhost:8000/docs when the backend is running.
