# Gemini Enterprise API Explorer

This application demonstrates the feasibility of interacting with **Gemini Enterprise** (previously known as **Agentspace**) functionality via API. This is helpful to prove that subscribers can integrate Gemini Enterprise capabilities into their own applications, services, and UI.

## Use Case

One common use case is using Gemini Enterprise as an **agent hub** and integrating a few of the agents into your own app, without redirecting your users to the Gemini Enterprise interface. 

> **Note:** This explorer app demonstrates API integration using **Application Default Credentials (ADC)**, not user OAuth credentials. For production applications serving end users, you would typically implement OAuth 2.0 for user authentication.

## Prerequisites

Before running the application, ensure you have:

- **Python 3.9+** 
- **Node.js 18+** and npm 
- **Google Cloud Project** with Discovery Engine API enabled (The project where Gemini Enterprise is enabled).  Ensure you have license and access to that Gemini Enterprise instance
- **Application Default Credentials (ADC)** configured ⚠️

### Setting up Application Default Credentials

This application requires ADC to authenticate with Google Cloud APIs:

```bash
# Install Google Cloud SDK (if not already installed)
brew install google-cloud-sdk  # macOS
# Or download from: https://cloud.google.com/sdk/docs/install

# Authenticate and set up ADC
gcloud auth application-default login

# Verify authentication
gcloud auth application-default print-access-token
```

> **Important:** Ensure you have the necessary permissions in your Google Cloud project to access Discovery Engine APIs.

## 🚀 Quick Start

```bash
git clone <your-repo-url>
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


