'use client';

import { useState } from 'react';
import { AgentspaceConfig } from './ConfigSidebar';

interface ApiResponse {
  request_params?: any;
  response?: any;
  error?: any;
  success?: boolean;
}

interface ApiExplorerProps {
  config: AgentspaceConfig;
}

export default function ApiExplorer({ config }: ApiExplorerProps) {
  const [engineDetailsData, setEngineDetailsData] = useState<ApiResponse | null>(null);
  const [engineDataStoresData, setEngineDataStoresData] = useState<ApiResponse | null>(null);
  const [listAssistantsData, setListAssistantsData] = useState<ApiResponse | null>(null);
  const [listAgentsData, setListAgentsData] = useState<ApiResponse | null>(null);
  const [getAgentData, setGetAgentData] = useState<ApiResponse | null>(null);
  const [streamAssistData, setStreamAssistData] = useState<ApiResponse | null>(null);
  const [searchData, setSearchData] = useState<ApiResponse | null>(null);
  
  const [loading, setLoading] = useState<string | null>(null);
  const [agentId, setAgentId] = useState('');
  const [query, setQuery] = useState('Hello, how can you help me?');
  const [searchQuery, setSearchQuery] = useState('What are the latest developments in quantum computing?');
  const [sessionId, setSessionId] = useState('-');

  const { projectNumber, location, engineId, assistantId } = config;
  const isConfigured = projectNumber && engineId;

  // Generate dynamic API endpoint display based on location
  const getApiEndpoint = () => {
    return location === 'global' 
      ? 'discoveryengine.googleapis.com' 
      : `${location}-discoveryengine.googleapis.com`;
  };

  const fetchEngineDetails = async () => {
    if (!isConfigured) return;
    setLoading('enginedetails');
    try {
      const params = new URLSearchParams({
        project_number: projectNumber,
        location: location,
      });
      const response = await fetch(`http://localhost:8000/api-explorer/engine-details/${engineId}?${params}`);
      const data = await response.json();
      setEngineDetailsData(data);
    } catch (error) {
      setEngineDetailsData({
        error: { message: error instanceof Error ? error.message : 'Unknown error' },
      });
    } finally {
      setLoading(null);
    }
  };

  const fetchEngineDataStores = async () => {
    if (!isConfigured) return;
    setLoading('enginedatastores');
    try {
      const params = new URLSearchParams({
        project_number: projectNumber,
        location: location,
      });
      const response = await fetch(`http://localhost:8000/api-explorer/engine-data-stores/${engineId}?${params}`);
      const data = await response.json();
      setEngineDataStoresData(data);
    } catch (error) {
      setEngineDataStoresData({
        error: { message: error instanceof Error ? error.message : 'Unknown error' },
      });
    } finally {
      setLoading(null);
    }
  };

  const fetchListAssistants = async () => {
    if (!isConfigured) return;
    setLoading('listassistants');
    try {
      const params = new URLSearchParams({
        project_number: projectNumber,
        location: location,
      });
      const response = await fetch(`http://localhost:8000/api-explorer/list-assistants/${engineId}?${params}`);
      const data = await response.json();
      setListAssistantsData(data);
    } catch (error) {
      setListAssistantsData({
        error: { message: error instanceof Error ? error.message : 'Unknown error' },
      });
    } finally {
      setLoading(null);
    }
  };

  const fetchListAgents = async () => {
    if (!isConfigured) return;
    setLoading('listagents');
    try {
      const params = new URLSearchParams({
        project_number: projectNumber,
        location: location,
      });
      const response = await fetch(`http://localhost:8000/api-explorer/list-agents/${engineId}?${params}`);
      const data = await response.json();
      setListAgentsData(data);
    } catch (error) {
      setListAgentsData({
        error: { message: error instanceof Error ? error.message : 'Unknown error' },
      });
    } finally {
      setLoading(null);
    }
  };

  const fetchGetAgent = async () => {
    if (!isConfigured) return;
    setLoading('getagent');
    try {
      const params = new URLSearchParams({
        project_number: projectNumber,
        location: location,
      });
      const response = await fetch(`http://localhost:8000/api-explorer/get-agent/${engineId}/${agentId}?${params}`);
      const data = await response.json();
      setGetAgentData(data);
    } catch (error) {
      setGetAgentData({
        error: { message: error instanceof Error ? error.message : 'Unknown error' },
      });
    } finally {
      setLoading(null);
    }
  };

  const testStreamAssist = async () => {
    if (!isConfigured) return;
    setLoading('streamassist');
    try {
      const params = new URLSearchParams({
        engine_id: engineId,
        assistant_id: assistantId,
        query: query,
        project_number: projectNumber,
        location: location,
        agent_name: agentId,
        session_id: sessionId,
      });
      const response = await fetch(
        `http://localhost:8000/api-explorer/stream-assist?${params.toString()}`,
        { method: 'POST' }
      );
      const data = await response.json();
      setStreamAssistData(data);
    } catch (error) {
      setStreamAssistData({
        error: { message: error instanceof Error ? error.message : 'Unknown error' },
      });
    } finally {
      setLoading(null);
    }
  };

  const testWebGroundingSearch = async () => {
    if (!isConfigured) return;
    setLoading('search');
    try {
      const params = new URLSearchParams({
        engine_id: engineId,
        assistant_id: assistantId,
        query: searchQuery,
        project_number: projectNumber,
        location: location,
      });
      const response = await fetch(
        `http://localhost:8000/api-explorer/web-grounding-search?${params.toString()}`,
        { method: 'POST' }
      );
      const data = await response.json();
      setSearchData(data);
    } catch (error) {
      setSearchData({
        error: { message: error instanceof Error ? error.message : 'Unknown error' },
      });
    } finally {
      setLoading(null);
    }
  };

  const renderJson = (data: any, title: string) => {
    if (!data) return null;

    return (
      <div className="mt-4 border border-gray-300 rounded-lg p-4">
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <pre className="bg-gray-50 p-4 rounded overflow-x-auto text-sm">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">API Explorer</h1>
      <p className="text-gray-600 mb-6">
        Explore Gemini Enterprise (Agentspace) API endpoints to understand assistants, agents, and their interactions.
      </p>

      {!isConfigured && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-amber-800 font-medium">⚠️ Configuration Required</p>
          <p className="text-amber-700 text-sm mt-1">
            Please configure your Project Number and Engine ID in the sidebar to use the API Explorer.
          </p>
        </div>
      )}

      {/* Section 1: Get Engine Details */}
      <div className="mb-8 border-b pb-8">
        <h2 className="text-xl font-semibold mb-2">
          1. Get Engine Details
          <span className="ml-3 text-sm font-normal px-2 py-1 bg-blue-100 text-blue-800 rounded">Python SDK v1</span>
        </h2>
        <div className="mb-3 px-3 py-2 bg-gray-50 rounded border border-gray-200">
          <code className="text-xs text-gray-700">EngineServiceClient().get_engine()</code>
        </div>
        <p className="text-gray-600 mb-4">
          Get detailed information about a specific engine including data stores and configurations.
        </p>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={engineId}
            readOnly
            placeholder="Engine ID"
            className="flex-1 px-4 py-2 border border-gray-300 rounded bg-gray-50"
          />
          <button
            onClick={fetchEngineDetails}
            disabled={loading === 'enginedetails' || !isConfigured}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading === 'enginedetails' ? 'Loading...' : 'Get Engine Details'}
          </button>
        </div>

        {engineDetailsData && (
          <>
            {engineDetailsData.success !== undefined && (
              <div
                className={`mb-4 p-3 rounded ${
                  engineDetailsData.success
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {engineDetailsData.success ? '✓ Success' : '✗ Failed'}
              </div>
            )}
            {renderJson(engineDetailsData.request_params, 'Request Parameters')}
            {renderJson(engineDetailsData.response, 'Response')}
            {engineDetailsData.error && renderJson(engineDetailsData.error, 'Error')}
          </>
        )}
      </div>

      {/* Section 2: List Engine Data Stores */}
      <div className="mb-8 border-b pb-8">
        <h2 className="text-xl font-semibold mb-2">
          2. List Engine Data Stores
          <span className="ml-3 text-sm font-normal px-2 py-1 bg-blue-100 text-blue-800 rounded">Python SDK v1</span>
        </h2>
        <div className="mb-3 px-3 py-2 bg-gray-50 rounded border border-gray-200">
          <code className="text-xs text-gray-700">DataStoreServiceClient().get_data_store()</code>
        </div>
        <p className="text-gray-600 mb-4">
          List all data stores associated with a specific engine.
        </p>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={engineId}
            readOnly
            placeholder="Engine ID"
            className="flex-1 px-4 py-2 border border-gray-300 rounded bg-gray-50"
          />
          <button
            onClick={fetchEngineDataStores}
            disabled={loading === 'enginedatastores' || !isConfigured}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading === 'enginedatastores' ? 'Loading...' : 'List Engine Data Stores'}
          </button>
        </div>

        {engineDataStoresData && (
          <>
            {engineDataStoresData.success !== undefined && (
              <div
                className={`mb-4 p-3 rounded ${
                  engineDataStoresData.success
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {engineDataStoresData.success ? '✓ Success' : '✗ Failed'}
              </div>
            )}
            {renderJson(engineDataStoresData.request_params, 'Request Parameters')}
            {renderJson(engineDataStoresData.response, 'Response')}
            {engineDataStoresData.error && renderJson(engineDataStoresData.error, 'Error')}
          </>
        )}
      </div>

      {/* Section 3: List Assistants */}
      <div className="mb-8 border-b pb-8">
        <h2 className="text-xl font-semibold mb-2">
          3. List Assistants
          <span className="ml-3 text-sm font-normal px-2 py-1 bg-purple-100 text-purple-800 rounded">REST API v1alpha</span>
        </h2>
        <div className="mb-3 px-3 py-2 bg-gray-50 rounded border border-gray-200">
          <code className="text-xs text-gray-700">GET {getApiEndpoint()}/v1alpha/.../engines/{'{engine}'}/assistants</code>
        </div>
        <p className="text-gray-600 mb-4">
          List all assistants within an engine using v1alpha API. Assistants are containers that hold agents.
        </p>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={engineId}
            readOnly
            placeholder="Engine ID"
            className="flex-1 px-4 py-2 border border-gray-300 rounded bg-gray-50"
          />
          <button
            onClick={fetchListAssistants}
            disabled={loading === 'listassistants' || !isConfigured}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading === 'listassistants' ? 'Loading...' : 'List Assistants'}
          </button>
        </div>

        {listAssistantsData && (
          <>
            {listAssistantsData.success !== undefined && (
              <div
                className={`mb-4 p-3 rounded ${
                  listAssistantsData.success
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {listAssistantsData.success ? '✓ Success' : '✗ Failed'}
              </div>
            )}
            {renderJson(listAssistantsData.request_params, 'Request Parameters')}
            {listAssistantsData.response && renderJson(listAssistantsData.response, 'Response')}
            {listAssistantsData.error && renderJson(listAssistantsData.error, 'Error Details')}
          </>
        )}
      </div>

      {/* Section 4: List Agents */}
      <div className="mb-8 border-b pb-8">
        <h2 className="text-xl font-semibold mb-2">
          4. List Agents
          <span className="ml-3 text-sm font-normal px-2 py-1 bg-purple-100 text-purple-800 rounded">REST API v1alpha</span>
        </h2>
        <div className="mb-3 px-3 py-2 bg-gray-50 rounded border border-gray-200">
          <code className="text-xs text-gray-700">GET {getApiEndpoint()}/v1alpha/.../assistants/{'{assistant}'}/agents</code>
        </div>
        <p className="text-gray-600 mb-4">
          List all agents within the default assistant. Agents are individual tools/capabilities like "HKFinBot", "Deep Research", etc.
        </p>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={engineId}
            readOnly
            placeholder="Engine ID"
            className="flex-1 px-4 py-2 border border-gray-300 rounded bg-gray-50"
          />
          <button
            onClick={fetchListAgents}
            disabled={loading === 'listagents' || !isConfigured}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading === 'listagents' ? 'Loading...' : 'List Agents'}
          </button>
        </div>

        {listAgentsData && (
          <>
            {listAgentsData.success !== undefined && (
              <div
                className={`mb-4 p-3 rounded ${
                  listAgentsData.success
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {listAgentsData.success ? '✓ Success' : '✗ Failed'}
              </div>
            )}
            {renderJson(listAgentsData.request_params, 'Request Parameters')}
            {listAgentsData.response && renderJson(listAgentsData.response, 'Response')}
            {listAgentsData.error && renderJson(listAgentsData.error, 'Error Details')}
          </>
        )}
      </div>

      {/* Section 5: Get Agent Details */}
      <div className="mb-8 border-b pb-8">
        <h2 className="text-xl font-semibold mb-2">
          5. Get Agent Details
          <span className="ml-3 text-sm font-normal px-2 py-1 bg-purple-100 text-purple-800 rounded">REST API v1alpha</span>
        </h2>
        <div className="mb-3 px-3 py-2 bg-gray-50 rounded border border-gray-200">
          <code className="text-xs text-gray-700">GET {getApiEndpoint()}/v1alpha/.../agents/{'{agent}'}</code>
        </div>
        <p className="text-gray-600 mb-4">
          Get detailed information about a specific agent (e.g., "default_idea_generation", "deep_research"). Use agent names from the List Agents response.
        </p>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={engineId}
            readOnly
            placeholder="Engine ID"
            className="flex-1 px-4 py-2 border border-gray-300 rounded bg-gray-50"
          />
          <input
            type="text"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            placeholder="Agent Name (e.g., default_idea_generation)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded"
          />
          <button
            onClick={fetchGetAgent}
            disabled={loading === 'getagent' || !isConfigured}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading === 'getagent' ? 'Loading...' : 'Get Details'}
          </button>
        </div>

        {getAgentData && (
          <>
            {getAgentData.success !== undefined && (
              <div
                className={`mb-4 p-3 rounded ${
                  getAgentData.success
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {getAgentData.success ? '✓ Success' : '✗ Failed'}
              </div>
            )}
            {renderJson(getAgentData.request_params, 'Request Parameters')}
            {getAgentData.response && renderJson(getAgentData.response, 'Response')}
            {getAgentData.error && renderJson(getAgentData.error, 'Error Details')}
          </>
        )}
      </div>

      {/* Section 6: Stream Assist */}
      <div className="mb-8 border-b pb-8">
        <h2 className="text-xl font-semibold mb-2">
          6. Query Assistant (StreamAssist)
          <span className="ml-3 text-sm font-normal px-2 py-1 bg-purple-100 text-purple-800 rounded">REST API v1alpha</span>
        </h2>
        <div className="mb-3 px-3 py-2 bg-gray-50 rounded border border-gray-200">
          <code className="text-xs text-gray-700">POST {getApiEndpoint()}/v1alpha/.../assistants/{'{assistant}'}:streamAssist</code>
        </div>
        <p className="text-gray-600 mb-4">
          Query an assistant/agent using the streamAssist API (v1alpha with us location). Optionally specify an agent name to route to a specific agent. The response includes session info for conversation continuity.
        </p>
        <div className="space-y-2 mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={engineId}
              readOnly
              placeholder="Engine ID"
              className="flex-1 px-4 py-2 border border-gray-300 rounded bg-gray-50"
            />
            <input
              type="text"
              value={assistantId}
              readOnly
              placeholder="Assistant ID"
              className="flex-1 px-4 py-2 border border-gray-300 rounded bg-gray-50"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Query"
              className="flex-1 px-4 py-2 border border-gray-300 rounded"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              placeholder="Agent Name (optional, e.g., default_idea_generation)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded"
            />
            <input
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="Session ID (default: -)"
              className="w-48 px-4 py-2 border border-gray-300 rounded"
            />
            <button
              onClick={testStreamAssist}
              disabled={loading === 'streamassist' || !isConfigured}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading === 'streamassist' ? 'Testing...' : 'Stream Assist'}
            </button>
          </div>
        </div>

        {streamAssistData && (
          <>
            {streamAssistData.success !== undefined && (
              <div
                className={`mb-4 p-3 rounded ${
                  streamAssistData.success
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {streamAssistData.success ? '✓ Success' : '✗ Failed'}
              </div>
            )}
            {renderJson(streamAssistData.request_params, 'Request Parameters')}
            {streamAssistData.response && renderJson(streamAssistData.response, 'Response')}
            {streamAssistData.error && renderJson(streamAssistData.error, 'Error Details')}
          </>
        )}
      </div>

      {/* Section 7: Web Grounding Search */}
      <div className="mb-8 border-b pb-8">
        <h2 className="text-xl font-semibold mb-2">
          7. Web Grounding Search
          <span className="ml-3 text-sm font-normal px-2 py-1 bg-purple-100 text-purple-800 rounded">REST API v1alpha</span>
        </h2>
        <div className="mb-3 px-3 py-2 bg-gray-50 rounded border border-gray-200">
          <code className="text-xs text-gray-700">POST {getApiEndpoint()}/v1alpha/.../assistants/{'{assistant}'}:streamAssist (webGroundingSpec)</code>
        </div>
        <p className="text-gray-600 mb-4">
          Search the web using streamAssist with web grounding enabled. This uses Google Search to find and synthesize information from the web.
        </p>
        <div className="space-y-2 mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={engineId}
              readOnly
              placeholder="Engine ID"
              className="flex-1 px-4 py-2 border border-gray-300 rounded bg-gray-50"
            />
            <input
              type="text"
              value={assistantId}
              readOnly
              placeholder="Assistant ID"
              className="flex-1 px-4 py-2 border border-gray-300 rounded bg-gray-50"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Query"
              className="flex-1 px-4 py-2 border border-gray-300 rounded"
            />
            <button
              onClick={testWebGroundingSearch}
              disabled={loading === 'search' || !isConfigured}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading === 'search' ? 'Searching...' : 'Search Web'}
            </button>
          </div>
        </div>

        {searchData && (
          <>
            {searchData.success !== undefined && (
              <div
                className={`mb-4 p-3 rounded ${
                  searchData.success
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {searchData.success ? '✓ Success' : '✗ Failed'}
              </div>
            )}
            {renderJson(searchData.request_params, 'Request Parameters')}
            {searchData.response && renderJson(searchData.response, 'Response')}
            {searchData.error && renderJson(searchData.error, 'Error Details')}
          </>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">API Hierarchy</h3>
        <div className="text-sm text-gray-700 space-y-2">
          <p><strong>Engine</strong> → Contains → <strong>Assistants</strong> → Contains → <strong>Agents</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li><strong>Engine:</strong> Top-level resource (e.g., "my-engine")</li>
            <li><strong>Assistant:</strong> Container for agents (e.g., "default_assistant")</li>
            <li><strong>Agent:</strong> Individual AI tool/capability (e.g., "HKFinBot", "Deep Research")</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
