"""
Agent client for Google Discovery Engine API.
"""

from typing import Any, Dict, List

from google.api_core.client_options import ClientOptions
from google.cloud import discoveryengine_v1 as discoveryengine

from backend import config


class AgentClient:
    """Client for managing and listing agents/engines."""

    def __init__(self, project_number: str, location: str):
        """
        Initialize the agent client.

        Args:
            project_number: Google Cloud project number
            location: Engine location (us, eu, global)
        """
        self.project_number = project_number
        self.location = location
        self.collection_id = "default_collection"

        # Configure client to use regional endpoint
        # Note: 'global' location uses discoveryengine.googleapis.com (no prefix)
        # Regional locations (us, eu) use {location}-discoveryengine.googleapis.com
        api_endpoint = (
            "discoveryengine.googleapis.com"
            if location == "global"
            else f"{location}-discoveryengine.googleapis.com"
        )
        client_options = ClientOptions(api_endpoint=api_endpoint)
        self.client = discoveryengine.EngineServiceClient(client_options=client_options)

    def list_engines(self) -> List[Dict[str, Any]]:
        """
        List all available engines/agents.

        Returns:
            List of dictionaries containing engine information
        """
        # Build the parent path
        parent = f"projects/{self.project_number}/locations/{self.location}/collections/{self.collection_id}"

        # Create the request
        request = discoveryengine.ListEnginesRequest(
            parent=parent,
        )

        # Execute the request
        page_result = self.client.list_engines(request=request)

        # Format the results
        engines = []
        for engine in page_result:
            engines.append(
                {
                    "name": engine.name,
                    "display_name": engine.display_name,
                    "solution_type": self._get_solution_type(engine.solution_type),
                    "industry_vertical": self._get_industry_vertical(
                        engine.industry_vertical
                    ),
                    "create_time": engine.create_time.isoformat()
                    if engine.create_time
                    else None,
                }
            )

        return engines

    def get_engine(self, engine_id: str) -> Dict[str, Any]:
        """
        Get details for a specific engine.

        Args:
            engine_id: The ID of the engine to retrieve

        Returns:
            Dictionary containing engine details
        """
        # Build the engine name
        name = f"projects/{self.project_number}/locations/{self.location}/collections/{self.collection_id}/engines/{engine_id}"

        # Create the request
        request = discoveryengine.GetEngineRequest(
            name=name,
        )

        # Execute the request
        engine = self.client.get_engine(request=request)

        return {
            "name": engine.name,
            "display_name": engine.display_name,
            "solution_type": self._get_solution_type(engine.solution_type),
            "industry_vertical": self._get_industry_vertical(engine.industry_vertical),
            "create_time": engine.create_time.isoformat()
            if engine.create_time
            else None,
        }

    def _get_solution_type(self, solution_type: int) -> str:
        """
        Convert solution type enum to string.

        Args:
            solution_type: The solution type enum value

        Returns:
            String representation of the solution type
        """
        solution_types = {
            0: "SOLUTION_TYPE_UNSPECIFIED",
            1: "SOLUTION_TYPE_RECOMMENDATION",
            2: "SOLUTION_TYPE_SEARCH",
            3: "SOLUTION_TYPE_CHAT",
        }
        return solution_types.get(solution_type, f"UNKNOWN_{solution_type}")

    def _get_industry_vertical(self, industry_vertical: int) -> str:
        """
        Convert industry vertical enum to string.

        Args:
            industry_vertical: The industry vertical enum value

        Returns:
            String representation of the industry vertical
        """
        industry_verticals = {
            0: "INDUSTRY_VERTICAL_UNSPECIFIED",
            1: "GENERIC",
            2: "MEDIA",
            3: "HEALTHCARE_FHIR",
        }
        return industry_verticals.get(industry_vertical, f"UNKNOWN_{industry_vertical}")
