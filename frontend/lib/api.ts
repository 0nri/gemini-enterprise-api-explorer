/**
 * API client for backend communication
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface SearchRequest {
  query: string;
  page_size?: number;
  spell_correction?: boolean;
  project_number: string;
  location: string;
  engine_id: string;
}

export interface SearchResult {
  id: string;
  name: string;
  data: Record<string, any>;
}

export interface SearchResponse {
  results: SearchResult[];
  total_size: number;
  attribution_token: string;
  query: string;
}

export interface ConversationRequest {
  query: string;
  conversation_id?: string;
  session_id?: string;
  project_number: string;
  location: string;
  engine_id: string;
}

export interface ConversationResponse {
  text?: string;
  conversation_id?: string;
  conversation_state?: string;
  search_results?: Array<{ id: string; title: string }>;
  summary_skipped_reasons?: string[];
}

export interface EngineInfo {
  name: string;
  display_name: string;
  solution_type: string;
  industry_vertical: string;
  create_time?: string;
}

export interface EngineListResponse {
  engines: EngineInfo[];
}

/**
 * Perform a search query
 */
export async function search(request: SearchRequest): Promise<SearchResponse> {
  const response = await fetch(`${API_BASE_URL}/search/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * List all available agents/engines
 */
export async function listAgents(
  projectNumber: string,
  location: string
): Promise<EngineListResponse> {
  const params = new URLSearchParams({
    project_number: projectNumber,
    location: location,
  });

  const response = await fetch(`${API_BASE_URL}/agents/?${params}`);

  if (!response.ok) {
    throw new Error(`Failed to list agents: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get details for a specific agent/engine
 */
export async function getAgent(
  engineId: string,
  projectNumber: string,
  location: string
): Promise<EngineInfo> {
  const params = new URLSearchParams({
    project_number: projectNumber,
    location: location,
  });

  const response = await fetch(`${API_BASE_URL}/agents/${engineId}?${params}`);

  if (!response.ok) {
    throw new Error(`Failed to get agent: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Perform a conversational query (non-streaming)
 */
export async function converse(
  request: ConversationRequest
): Promise<ConversationResponse> {
  const response = await fetch(`${API_BASE_URL}/conversations/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Conversation failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Perform a conversational query with streaming
 */
export async function* converseStream(
  request: ConversationRequest
): AsyncGenerator<any, void, unknown> {
  const response = await fetch(`${API_BASE_URL}/conversations/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Streaming conversation failed: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data);
            yield parsed;

            if (parsed.type === 'done' || parsed.type === 'error') {
              return;
            }
          } catch (e) {
            console.error('Failed to parse SSE data:', e);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
