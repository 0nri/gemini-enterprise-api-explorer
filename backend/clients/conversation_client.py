"""
Conversation client for Google Discovery Engine API with streaming support.
"""

from typing import Any, AsyncIterator, Dict, Optional

from google.api_core.client_options import ClientOptions
from google.cloud import discoveryengine_v1 as discoveryengine

from backend import config


class ConversationClient:
    """Client for conversational search with streaming support."""

    def __init__(self, project_number: str, location: str, engine_id: str):
        """
        Initialize the conversation client.

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
        self.client = discoveryengine.ConversationalSearchServiceClient(
            client_options=client_options
        )

    async def converse_stream(
        self,
        query: str,
        conversation_id: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> AsyncIterator[Dict[str, Any]]:
        """
        Perform a conversational query with streaming response.

        Args:
            query: The user's query
            conversation_id: Optional conversation ID to continue an existing conversation
            session_id: Optional session ID for tracking

        Yields:
            Dictionary chunks containing response data
        """
        import logging

        logger = logging.getLogger(__name__)

        # Build the conversation name if provided
        conversation_name = None
        if conversation_id:
            conversation_name = f"projects/{self.project_number}/locations/{self.location}/collections/{self.collection_id}/dataStores/{self.engine_id}/conversations/{conversation_id}"

        logger.info(f"Conversation request - query: '{query}'")
        logger.info(f"Serving config: {self.serving_config}")
        logger.info(f"Conversation name: {conversation_name}")

        # Create the request
        # For conversational API, 'name' should be the conversation resource or empty for new conversations
        # The serving_config is a separate parameter
        request = discoveryengine.ConverseConversationRequest(
            name=conversation_name if conversation_name else "",
            query=discoveryengine.TextInput(input=query),
            serving_config=self.serving_config,
        )

        logger.info(
            f"Request created - name: '{request.name}', serving_config: '{request.serving_config}'"
        )

        # Stream the response
        try:
            logger.info("Calling converse_conversation...")
            response_stream = self.client.converse_conversation(request=request)

            # Process the streaming response
            logger.info("Processing response stream...")
            for response in response_stream:
                logger.info(f"Received response: {response}")
                yield self._format_response_chunk(response)

        except Exception as e:
            logger.error(f"Error in converse_stream: {str(e)}")
            logger.error(f"Exception type: {type(e).__name__}")
            import traceback

            logger.error(f"Traceback: {traceback.format_exc()}")
            yield {"error": str(e), "type": "error"}

    def converse(
        self,
        query: str,
        conversation_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Perform a conversational query (non-streaming).

        Args:
            query: The user's query
            conversation_id: Optional conversation ID to continue an existing conversation

        Returns:
            Dictionary containing the complete response
        """
        # Build the conversation name if provided
        conversation_name = None
        if conversation_id:
            conversation_name = f"projects/{self.project_number}/locations/{self.location}/collections/{self.collection_id}/dataStores/{self.engine_id}/conversations/{conversation_id}"

        # Create the request
        request = discoveryengine.ConverseConversationRequest(
            name=conversation_name or self.serving_config,
            query=discoveryengine.TextInput(input=query),
            serving_config=self.serving_config,
        )

        # Execute the request
        response = self.client.converse_conversation(request=request)

        return self._format_response(response)

    def _format_response_chunk(self, response: Any) -> Dict[str, Any]:
        """
        Format a streaming response chunk.

        Args:
            response: The response chunk from the API

        Returns:
            Formatted response dictionary
        """
        result = {
            "type": "chunk",
        }

        # Extract reply if available
        if hasattr(response, "reply") and response.reply:
            if hasattr(response.reply, "summary") and response.reply.summary:
                result["text"] = response.reply.summary.summary_text
                result["summary_skipped_reasons"] = [
                    str(reason)
                    for reason in response.reply.summary.summary_skipped_reasons
                ]

        # Extract conversation info
        if hasattr(response, "conversation") and response.conversation:
            result["conversation_id"] = response.conversation.name.split("/")[-1]
            result["conversation_state"] = str(response.conversation.state)

        # Extract search results if available
        if hasattr(response, "search_results") and response.search_results:
            result["search_results"] = [
                {
                    "id": sr.document.id if hasattr(sr, "document") else None,
                    "title": sr.document.struct_data.get("title", "")
                    if hasattr(sr, "document") and hasattr(sr.document, "struct_data")
                    else "",
                }
                for sr in response.search_results
            ]

        return result

    def _format_response(self, response: Any) -> Dict[str, Any]:
        """
        Format a complete response.

        Args:
            response: The response from the API

        Returns:
            Formatted response dictionary
        """
        result = {}

        # Extract reply
        if hasattr(response, "reply") and response.reply:
            if hasattr(response.reply, "summary") and response.reply.summary:
                result["text"] = response.reply.summary.summary_text
                result["summary_skipped_reasons"] = [
                    str(reason)
                    for reason in response.reply.summary.summary_skipped_reasons
                ]

        # Extract conversation info
        if hasattr(response, "conversation") and response.conversation:
            result["conversation_id"] = response.conversation.name.split("/")[-1]
            result["conversation_state"] = str(response.conversation.state)

        # Extract search results
        if hasattr(response, "search_results") and response.search_results:
            result["search_results"] = [
                {
                    "id": sr.document.id if hasattr(sr, "document") else None,
                    "title": sr.document.struct_data.get("title", "")
                    if hasattr(sr, "document") and hasattr(sr.document, "struct_data")
                    else "",
                }
                for sr in response.search_results
            ]

        return result
