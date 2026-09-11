/**
 * Client-side mirror of the streamAssist request the backend builds in
 * `backend/api/routes/api_explorer.py::stream_assist`. Used ONLY to preview
 * what will be sent before the user submits a message - the actual request
 * still goes to our FastAPI backend as query params; the backend is the
 * source of truth for what Google's API receives. Keep this in sync with
 * that function whenever its payload shape changes.
 */

export interface StreamAssistPreviewParams {
  projectNumber: string;
  location: string;
  engineId: string;
  assistantId: string;
  agentName: string;
  sessionId: string;
  query: string;
}

const COLLECTION_ID = 'default_collection';

function assistantName({
  projectNumber,
  location,
  engineId,
  assistantId,
}: StreamAssistPreviewParams): string {
  return `projects/${projectNumber}/locations/${location}/collections/${COLLECTION_ID}/engines/${engineId}/assistants/${assistantId}`;
}

export function buildStreamAssistUrl(params: StreamAssistPreviewParams): string {
  const apiEndpoint =
    params.location === 'global'
      ? 'discoveryengine.googleapis.com'
      : `${params.location}-discoveryengine.googleapis.com`;
  return `https://${apiEndpoint}/v1/${assistantName(params)}:streamAssist`;
}

export function buildStreamAssistPayload(params: StreamAssistPreviewParams): object {
  const engineName = `projects/${params.projectNumber}/locations/${params.location}/collections/${COLLECTION_ID}/engines/${params.engineId}`;

  const payload: Record<string, unknown> = {
    query: { text: params.query },
    session: `${engineName}/sessions/${params.sessionId || '-'}`,
  };

  // Route to a specific agent if requested.
  if (params.agentName) {
    payload.agentsSpec = { agentSpecs: [{ agentId: params.agentName }] };
  }

  return payload;
}
