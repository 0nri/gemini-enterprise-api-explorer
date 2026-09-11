# Gemini Enterprise & NotebookLM API Explorer

This application demonstrates the feasibility of interacting with **Gemini Enterprise** (previously known as **Agentspace**) and **NotebookLM Enterprise** functionality via API. This is helpful to prove that subscribers can integrate these capabilities into their own applications, services, and UI.

## Use Cases

**Gemini Enterprise**: Use as an **agent hub** and integrate agents into your own app, without redirecting users to the Gemini Enterprise interface.

**NotebookLM Enterprise**: **Create** and **manage** notebooks programmatically, add data sources (text, web, YouTube, Google Drive, files), and share with team members. 
> **Note:**  There is currently no programmatic support for querying (e.g. ask questions)  NotebookLM.

> **Note:** This explorer app demonstrates API integration using **Application Default Credentials (ADC)**, not user OAuth credentials. For production applications serving end users, you would typically implement OAuth 2.0 for user authentication.

## Features

### Gemini Enterprise

- **API Explorer** — browse and call Gemini Enterprise / Discovery Engine REST endpoints directly (engine details, data stores, agent catalog) with raw request/response inspection.
- **Chat** — converse with any no-code/low-code workflow agent, or the managed **Deep Research** agent via its two-phase plan/run flow (streamed research plan, questions, answers, and a cited final report). Agents defined via A2A are listed but marked unsupported and cannot be selected for an interactive turn.
- **Search** — run grounded search queries against your engine's data stores.
- **Live auth status** — the sidebar shows which ADC identity is actually active (user account, service account, impersonated, or Workforce/Workload Identity Federation) and its resolved account, so you can confirm how the backend is authenticating before making calls.

### NotebookLM Enterprise

- **Notebook Management** — create, list, share, and delete notebooks.
- **Multi-format Sources** — add text, web URLs, YouTube videos, Google Drive docs, and files.
- **Collaboration** — share notebooks with team members.
- **Source Organization** — manage and organize notebook data sources.

## Prerequisites

Before running the application, ensure you have:

- **Python 3.9+**
- **Node.js 18+** and npm
- **Google Cloud Project** with Discovery Engine API enabled (The project where Gemini Enterprise is enabled). Ensure you have license and access to that Gemini Enterprise instance
- **Application Default Credentials (ADC)** configured 

### Setting up Application Default Credentials

This application requires ADC to authenticate with Google Cloud APIs:

```bash
# Install Google Cloud SDK (if not already installed)
brew install google-cloud-sdk  # macOS
# Or download from: https://cloud.google.com/sdk/docs/install

# Authenticate and set up ADC
gcloud auth application-default login

# For NotebookLM with Google Drive access (optional)
gcloud auth login --enable-gdrive-access

# Verify authentication
gcloud auth application-default print-access-token
```

#### Using Workforce Identity Federation (WIF)

If your organization authenticates through a Workforce Identity Federation pool instead of a personal Google account, point ADC at your WIF credential config instead:

```bash
# Browser sign-in against a Workforce Identity Federation pool
gcloud auth application-default login --login-config=/path/to/credential-config.json

# Or point ADC directly at a WIF credential-config JSON (no interactive browser step)
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/credential-config.json
```

No code changes are required — the backend detects the credential kind automatically, and the sidebar's live auth status badge labels it "Workforce Identity Federation" or "Workload Identity Federation" once configured.

> **Note:** The steps above are for *this app's own backend* (operator-side ADC). If you're an end user who wants to call the Gemini Enterprise API directly with your own Entra ID identity via Workforce Identity Federation — including embedding it in another app on the same Entra tenant — see [Authentication](docs/AUTHENTICATION.md).

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

## 📚 Documentation

- **[NotebookLM Guide](docs/NOTEBOOKLM.md)** - Complete NotebookLM features and API reference
- **[Authentication](docs/AUTHENTICATION.md)** - How an end user (or another app on the same Entra tenant) obtains a Gemini Enterprise API token via Workforce Identity Federation with Microsoft Entra ID
- **[Architecture](docs/ARCHITECTURE.md)** - Technical architecture and development guide
- **[API Reference](http://localhost:8000/docs)** - Interactive API docs (when backend is running)

## 🐛 Troubleshooting

### Authentication Issues

```bash
# Re-authenticate
gcloud auth application-default login

# Verify
gcloud auth application-default print-access-token
```
