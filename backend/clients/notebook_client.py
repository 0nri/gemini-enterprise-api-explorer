"""
NotebookLM client for Google Discovery Engine API.
"""

import json
from typing import Any, Dict, List, Optional

import requests
from google.auth.transport.requests import Request
from google.oauth2 import service_account

from backend import config


class NotebookClient:
    """Client for managing NotebookLM Enterprise notebooks."""

    def __init__(self, project_number: str, location: str):
        """
        Initialize the notebook client.

        Args:
            project_number: Google Cloud project number
            location: Location (us, eu, global)
        """
        self.project_number = project_number
        self.location = location

        # Configure API endpoint based on location
        # Note: 'global' location uses discoveryengine.googleapis.com (no prefix)
        # Regional locations (us, eu) use {location}-discoveryengine.googleapis.com
        if location == "global":
            self.api_endpoint = "discoveryengine.googleapis.com"
        else:
            self.api_endpoint = f"{location}-discoveryengine.googleapis.com"

        self.base_url = f"https://{self.api_endpoint}/v1alpha/projects/{project_number}/locations/{location}"

        # Get credentials for authentication
        self.credentials = self._get_credentials()

    def _get_credentials(self):
        """
        Get Google Cloud credentials.

        Returns:
            Credentials object for authentication
        """
        # Use Application Default Credentials
        import google.auth

        credentials, _ = google.auth.default(
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
        return credentials

    def _get_access_token(self) -> str:
        """
        Get a valid access token.

        Returns:
            Access token string
        """
        if not self.credentials.valid:
            self.credentials.refresh(Request())
        return self.credentials.token

    def create_notebook(self, title: str) -> Dict[str, Any]:
        """
        Create a new notebook.

        Args:
            title: UTF-8 encoded title for the notebook

        Returns:
            Dictionary containing notebook details
        """
        url = f"{self.base_url}/notebooks"
        headers = {
            "Authorization": f"Bearer {self._get_access_token()}",
            "Content-Type": "application/json",
        }
        data = {"title": title}

        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Creating notebook at URL: {url}")
        
        response = requests.post(url, headers=headers, json=data)
        
        if not response.ok:
            logger.error(f"Failed to create notebook. Status: {response.status_code}, Response: {response.text}")
        
        response.raise_for_status()
        return response.json()

    def get_notebook(self, notebook_id: str) -> Dict[str, Any]:
        """
        Retrieve a specific notebook.

        Args:
            notebook_id: The notebook's unique identifier

        Returns:
            Dictionary containing notebook details
        """
        url = f"{self.base_url}/notebooks/{notebook_id}"
        headers = {
            "Authorization": f"Bearer {self._get_access_token()}",
            "Content-Type": "application/json",
        }

        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.json()

    def list_recently_viewed(self, page_size: Optional[int] = None) -> Dict[str, Any]:
        """
        List recently viewed notebooks.

        Args:
            page_size: Optional number of notebooks to return (default: 500)

        Returns:
            Dictionary containing list of notebooks
        """
        url = f"{self.base_url}/notebooks:listRecentlyViewed"
        headers = {
            "Authorization": f"Bearer {self._get_access_token()}",
            "Content-Type": "application/json",
        }

        params = {}
        if page_size:
            params["pageSize"] = page_size

        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Listing notebooks at URL: {url}")
        logger.info(f"Using params: {params}")
        
        response = requests.get(url, headers=headers, params=params)
        
        if not response.ok:
            logger.error(f"Failed to list notebooks. Status: {response.status_code}, Response: {response.text}")
        
        response.raise_for_status()
        result = response.json()
        logger.info(f"Successfully retrieved {len(result.get('notebooks', []))} notebooks")
        return result

    def batch_delete(self, notebook_names: List[str]) -> Dict[str, Any]:
        """
        Delete notebooks in batch.

        Args:
            notebook_names: List of complete notebook resource names

        Returns:
            Empty dictionary on success
        """
        url = f"{self.base_url}/notebooks:batchDelete"
        headers = {
            "Authorization": f"Bearer {self._get_access_token()}",
            "Content-Type": "application/json",
        }
        data = {"names": notebook_names}

        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        return response.json()

    def share_notebook(
        self, notebook_id: str, account_and_roles: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """
        Share a notebook with users.

        Args:
            notebook_id: The notebook's unique identifier
            account_and_roles: List of dicts with 'email' and 'role' keys

        Returns:
            Empty dictionary on success
        """
        url = f"{self.base_url}/notebooks/{notebook_id}:share"
        headers = {
            "Authorization": f"Bearer {self._get_access_token()}",
            "Content-Type": "application/json",
        }
        data = {"accountAndRoles": account_and_roles}

        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        return response.json()

    def get_notebook_url(self, notebook_id: str, use_google_identity: bool = True) -> str:
        """
        Generate the browser URL for accessing a notebook.

        Args:
            notebook_id: The notebook's unique identifier
            use_google_identity: True for Google identity, False for third-party identity

        Returns:
            URL string for accessing the notebook in a browser
        """
        domain = "notebooklm.cloud.google.com" if use_google_identity else "notebooklm.cloud.google"
        return f"https://{domain}/{self.location}/notebook/{notebook_id}?project={self.project_number}"

    # Notebook Source Management Methods

    def batch_create_sources(
        self, notebook_id: str, user_contents: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Add data sources to a notebook in batch.

        Args:
            notebook_id: The notebook's unique identifier
            user_contents: List of user content dictionaries

        Returns:
            Dictionary containing created sources
        """
        url = f"{self.base_url}/notebooks/{notebook_id}/sources:batchCreate"
        headers = {
            "Authorization": f"Bearer {self._get_access_token()}",
            "Content-Type": "application/json",
        }
        data = {"userContents": user_contents}

        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        return response.json()

    def get_source(self, notebook_id: str, source_id: str) -> Dict[str, Any]:
        """
        Retrieve a specific source from a notebook.

        Args:
            notebook_id: The notebook's unique identifier
            source_id: The source's unique identifier

        Returns:
            Dictionary containing source details
        """
        url = f"{self.base_url}/notebooks/{notebook_id}/sources/{source_id}"
        headers = {
            "Authorization": f"Bearer {self._get_access_token()}",
            "Content-Type": "application/json",
        }

        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.json()

    def batch_delete_sources(
        self, notebook_id: str, source_names: List[str]
    ) -> Dict[str, Any]:
        """
        Delete sources from a notebook in batch.

        Args:
            notebook_id: The notebook's unique identifier
            source_names: List of complete source resource names

        Returns:
            Empty dictionary on success
        """
        url = f"{self.base_url}/notebooks/{notebook_id}/sources:batchDelete"
        headers = {
            "Authorization": f"Bearer {self._get_access_token()}",
            "Content-Type": "application/json",
        }
        data = {"names": source_names}

        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        return response.json()

    def upload_file_source(
        self, notebook_id: str, file_data: bytes, file_name: str, content_type: str
    ) -> Dict[str, Any]:
        """
        Upload a file as a source to a notebook.

        Args:
            notebook_id: The notebook's unique identifier
            file_data: The binary file data
            file_name: Display name for the file
            content_type: MIME type of the file

        Returns:
            Dictionary containing the source ID
        """
        url = f"https://{self.api_endpoint}/upload/v1alpha/projects/{self.project_number}/locations/{self.location}/notebooks/{notebook_id}/sources:uploadFile"
        headers = {
            "Authorization": f"Bearer {self._get_access_token()}",
            "X-Goog-Upload-File-Name": file_name,
            "X-Goog-Upload-Protocol": "raw",
            "Content-Type": content_type,
        }

        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Uploading file to URL: {url}")
        logger.info(f"Headers: {dict((k, v if k != 'Authorization' else 'Bearer ***') for k, v in headers.items())}")
        logger.info(f"File size: {len(file_data)} bytes")

        response = requests.post(url, headers=headers, data=file_data)
        
        if not response.ok:
            logger.error(f"Upload failed. Status: {response.status_code}")
            logger.error(f"Response headers: {dict(response.headers)}")
            logger.error(f"Response body: {response.text}")
        
        response.raise_for_status()
        return response.json()