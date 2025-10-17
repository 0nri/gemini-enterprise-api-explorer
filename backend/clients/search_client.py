"""
Search client for Google Discovery Engine API.
"""

from typing import Any, Dict, List, Optional

from google.api_core.client_options import ClientOptions
from google.cloud import discoveryengine_v1 as discoveryengine

from backend import config


class SearchClient:
    """Client for performing enterprise search queries."""

    def __init__(self, project_number: str, location: str, engine_id: str):
        """
        Initialize the search client.

        Args:
            project_number: Google Cloud project number
            location: Engine location (us, eu, global)
            engine_id: Engine/datastore ID
        """
        self.project_number = project_number
        self.location = location
        self.engine_id = engine_id
        self.collection_id = "default_collection"

        # Build serving config path
        self.serving_config = (
            f"projects/{project_number}/locations/{location}/collections/"
            f"{self.collection_id}/engines/{engine_id}/servingConfigs/default_search"
        )

        # Configure client to use regional endpoint
        # Note: 'global' location uses discoveryengine.googleapis.com (no prefix)
        # Regional locations (us, eu) use {location}-discoveryengine.googleapis.com
        api_endpoint = (
            "discoveryengine.googleapis.com"
            if location == "global"
            else f"{location}-discoveryengine.googleapis.com"
        )
        client_options = ClientOptions(api_endpoint=api_endpoint)
        self.client = discoveryengine.SearchServiceClient(client_options=client_options)

    def search(
        self,
        query: str,
        page_size: int = config.DEFAULT_PAGE_SIZE,
        language_code: str = config.DEFAULT_LANGUAGE_CODE,
        spell_correction: bool = True,
    ) -> Dict[str, Any]:
        """
        Perform a search query.

        Args:
            query: The search query string
            page_size: Number of results to return
            language_code: Language code for the query
            spell_correction: Whether to enable spell correction

        Returns:
            Dictionary containing search results and metadata
        """
        # Build the search request
        request = discoveryengine.SearchRequest(
            serving_config=self.serving_config,
            query=query,
            page_size=page_size,
            query_expansion_spec=discoveryengine.SearchRequest.QueryExpansionSpec(
                condition=discoveryengine.SearchRequest.QueryExpansionSpec.Condition.AUTO,
            ),
            spell_correction_spec=discoveryengine.SearchRequest.SpellCorrectionSpec(
                mode=discoveryengine.SearchRequest.SpellCorrectionSpec.Mode.AUTO
                if spell_correction
                else discoveryengine.SearchRequest.SpellCorrectionSpec.Mode.OFF,
            ),
        )

        # Execute the search
        response = self.client.search(request=request)

        # Format the results
        results = []
        for result in response.results:
            document = result.document
            results.append(
                {
                    "id": document.id,
                    "name": document.name,
                    "data": self._extract_document_data(document),
                }
            )

        return {
            "results": results,
            "total_size": response.total_size,
            "attribution_token": response.attribution_token,
            "query": query,
        }

    def _extract_document_data(self, document: Any) -> Dict[str, Any]:
        """
        Extract relevant data from a document.

        Args:
            document: The document object from the search result

        Returns:
            Dictionary containing extracted document data
        """
        data = {}

        # Extract struct data if available
        if hasattr(document, "struct_data") and document.struct_data:
            for key, value in document.struct_data.items():
                data[key] = self._convert_value(value)

        # Extract derived struct data if available
        if hasattr(document, "derived_struct_data") and document.derived_struct_data:
            for key, value in document.derived_struct_data.items():
                if key not in data:  # Don't overwrite existing data
                    data[key] = self._convert_value(value)

        return data

    def _convert_value(self, value: Any) -> Any:
        """
        Convert protobuf values to Python types.

        Args:
            value: The protobuf value to convert

        Returns:
            Converted Python value
        """
        # Handle different protobuf value types
        if hasattr(value, "string_value"):
            return value.string_value
        elif hasattr(value, "number_value"):
            return value.number_value
        elif hasattr(value, "bool_value"):
            return value.bool_value
        elif hasattr(value, "list_value"):
            return [self._convert_value(v) for v in value.list_value.values]
        elif hasattr(value, "struct_value"):
            return {
                k: self._convert_value(v) for k, v in value.struct_value.fields.items()
            }
        else:
            return str(value)
