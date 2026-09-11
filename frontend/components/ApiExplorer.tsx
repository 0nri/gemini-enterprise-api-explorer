'use client';

import { useState } from 'react';
import { AgentspaceConfig } from './ConfigSidebar';
import { API_BASE_URL } from '@/lib/api';
import { Badge, BadgeVariant, StatusBanner, RawJsonView, EmptyState, ConfigWarning } from '@/components/ui';

interface ApiResponse<T = unknown> {
  request_params?: unknown;
  response?: T;
  error?: unknown;
  success?: boolean;
}

interface AgentSummary {
  name?: string;
  displayName?: string;
}

interface DataStoreSummary {
  display_name?: string;
  id?: string;
  industry_vertical?: string;
  content_config?: string;
}

interface AssistantSummary {
  name?: string;
  displayName?: string;
}

interface EngineDetailsResponse {
  displayName?: string;
  solutionType?: string;
  industryVertical?: string;
  createTime?: string;
  dataStoreIds?: string[];
}

interface EngineDataStoresResponse {
  data_store_count?: number;
  data_stores?: DataStoreSummary[];
}

interface ListAssistantsResponse {
  assistant_count?: number;
  assistants?: AssistantSummary[];
}

interface ListAgentsResponse {
  agents?: AgentSummary[];
}

interface GetAgentResponse {
  state?: string;
  displayName?: string;
  description?: string;
  [key: string]: unknown;
}

interface ApiExplorerProps {
  config: AgentspaceConfig;
}

const AGENT_STATE_BADGE_VARIANT: Record<string, BadgeVariant> = {
  ENABLED: 'green',
  CONFIGURED: 'amber',
  DEPLOYING: 'amber',
  DEPLOYMENT_FAILED: 'red',
  CREATION_FAILED: 'red',
  SUSPENDED: 'red',
};

const AGENT_DEFINITION_KEYS = [
  'adkAgentDefinition',
  'managedAgentDefinition',
  'a2aAgentDefinition',
  'dialogflowAgentDefinition',
];

export default function ApiExplorer({ config }: ApiExplorerProps) {
  const [engineDetailsData, setEngineDetailsData] = useState<ApiResponse<EngineDetailsResponse> | null>(null);
  const [engineDataStoresData, setEngineDataStoresData] = useState<ApiResponse<EngineDataStoresResponse> | null>(null);
  const [listAssistantsData, setListAssistantsData] = useState<ApiResponse<ListAssistantsResponse> | null>(null);
  const [listAgentsData, setListAgentsData] = useState<ApiResponse<ListAgentsResponse> | null>(null);
  const [getAgentData, setGetAgentData] = useState<ApiResponse<GetAgentResponse> | null>(null);
  
  const [loading, setLoading] = useState<string | null>(null);
  const [agentId, setAgentId] = useState('');

  const { projectNumber, location, engineId, useAdcQuota } = config;
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
        use_adc_quota: String(useAdcQuota),
      });
      const response = await fetch(`${API_BASE_URL}/api-explorer/engine-details/${engineId}?${params}`);
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
        use_adc_quota: String(useAdcQuota),
      });
      const response = await fetch(`${API_BASE_URL}/api-explorer/engine-data-stores/${engineId}?${params}`);
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
        use_adc_quota: String(useAdcQuota),
      });
      const response = await fetch(`${API_BASE_URL}/api-explorer/list-assistants/${engineId}?${params}`);
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
        use_adc_quota: String(useAdcQuota),
      });
      const response = await fetch(`${API_BASE_URL}/api-explorer/list-agents/${engineId}?${params}`);
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
        use_adc_quota: String(useAdcQuota),
      });
      const response = await fetch(`${API_BASE_URL}/api-explorer/get-agent/${engineId}/${agentId}?${params}`);
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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🔷 Gemini Enterprise Explorer</h1>
      <p className="text-gray-600 mb-6">
        Explore Gemini Enterprise (Agentspace) API endpoints to understand assistants, agents, and their interactions.
      </p>

      {!isConfigured && <ConfigWarning feature="the API Explorer" />}

      {/* Section 1: Get Engine Details */}
      <div className="mb-8 border-b pb-8">
        <h2 className="text-xl font-semibold mb-2">
          1. Get Engine Details
          <Badge variant="blue" className="ml-3">Python SDK v1</Badge>
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
          <div className="space-y-4">
            {engineDetailsData.success !== undefined && (
              <StatusBanner success={engineDetailsData.success} />
            )}
            {engineDetailsData.response && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-2 text-sm">
                <div><span className="text-gray-500">Display Name:</span> {engineDetailsData.response.displayName ?? '—'}</div>
                <div><span className="text-gray-500">Solution Type:</span> {engineDetailsData.response.solutionType ?? '—'}</div>
                <div><span className="text-gray-500">Industry Vertical:</span> {engineDetailsData.response.industryVertical ?? '—'}</div>
                <div><span className="text-gray-500">Create Time:</span> {engineDetailsData.response.createTime ?? '—'}</div>
                {engineDetailsData.response.dataStoreIds && (
                  <div>
                    <span className="text-gray-500">Data Store IDs:</span>{' '}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(engineDetailsData.response.dataStoreIds as string[]).map((id, idx) => (
                        <Badge key={idx} variant="gray">{id}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <RawJsonView
              data={{ request_params: engineDetailsData.request_params, response: engineDetailsData.response }}
              label="View request/response JSON"
            />
            {Boolean(engineDetailsData.error) && <RawJsonView data={engineDetailsData.error} label="View error" />}
          </div>
        )}
      </div>

      {/* Section 2: List Engine Data Stores */}
      <div className="mb-8 border-b pb-8">
        <h2 className="text-xl font-semibold mb-2">
          2. List Engine Data Stores
          <Badge variant="blue" className="ml-3">Python SDK v1</Badge>
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
          <div className="space-y-4">
            {engineDataStoresData.success !== undefined && (
              <StatusBanner success={engineDataStoresData.success} />
            )}
            {engineDataStoresData.response && (
              engineDataStoresData.response.data_store_count === 0 ? (
                <EmptyState title="No data stores found for this engine." />
              ) : (
                <div className="space-y-2">
                  {(engineDataStoresData.response.data_stores ?? []).map((ds: DataStoreSummary, idx: number) => (
                    <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded text-sm">
                      <div className="font-medium">{ds.display_name ?? ds.id}</div>
                      <div className="text-xs text-gray-500 font-mono">{ds.id}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {ds.industry_vertical && <span>Industry: {ds.industry_vertical} </span>}
                        {ds.content_config && <span>Content Config: {ds.content_config}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
            <RawJsonView
              data={{ request_params: engineDataStoresData.request_params, response: engineDataStoresData.response }}
              label="View request/response JSON"
            />
            {Boolean(engineDataStoresData.error) && <RawJsonView data={engineDataStoresData.error} label="View error" />}
          </div>
        )}
      </div>

      {/* Section 3: List Assistants */}
      <div className="mb-8 border-b pb-8">
        <h2 className="text-xl font-semibold mb-2">
          3. List Assistants
          <Badge variant="purple" className="ml-3">REST API v1alpha</Badge>
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
          <div className="space-y-4">
            {listAssistantsData.success !== undefined && (
              <StatusBanner success={listAssistantsData.success} />
            )}
            {listAssistantsData.response && (
              listAssistantsData.response.assistant_count === 0 ? (
                <EmptyState title="No assistants found for this engine." />
              ) : (
                <div className="space-y-2">
                  {(listAssistantsData.response.assistants ?? []).map((assistant: AssistantSummary, idx: number) => {
                    const shortId = assistant.name?.split('/').pop() ?? '';
                    return (
                      <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded text-sm">
                        <div className="font-medium">{assistant.displayName || shortId}</div>
                        <div className="text-xs text-gray-500 font-mono">{shortId || assistant.name}</div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
            <RawJsonView
              data={{ request_params: listAssistantsData.request_params, response: listAssistantsData.response }}
              label="View request/response JSON"
            />
            {Boolean(listAssistantsData.error) && <RawJsonView data={listAssistantsData.error} label="View error details" />}
          </div>
        )}
      </div>

      {/* Section 4: List Agents */}
      <div className="mb-8 border-b pb-8">
        <h2 className="text-xl font-semibold mb-2">
          4. List Agents
          <Badge variant="purple" className="ml-3">REST API v1alpha</Badge>
        </h2>
        <div className="mb-3 px-3 py-2 bg-gray-50 rounded border border-gray-200">
          <code className="text-xs text-gray-700">GET {getApiEndpoint()}/v1alpha/.../assistants/{'{assistant}'}/agents</code>
        </div>
        <p className="text-gray-600 mb-4">
          List all agents within the default assistant. Agents are individual tools/capabilities like &quot;HKFinBot&quot;, &quot;Deep Research&quot;, etc.
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
          <div className="space-y-4">
            {listAgentsData.success !== undefined && (
              <StatusBanner success={listAgentsData.success} />
            )}
            {listAgentsData.success && listAgentsData.response?.agents !== undefined && (() => {
              // API Explorer surfaces raw debug responses (see ApiResponse.response: any);
              // narrow to the documented Agent shape purely for this display block.
              const agents = listAgentsData.response.agents as AgentSummary[];
              return (
                <div>
                  {agents.length === 0 ? (
                    <EmptyState
                      title="No agents found under default_assistant."
                      description="Agents must be explicitly created/deployed for this engine before they show up here."
                    />
                  ) : (
                    <>
                      <p className="text-sm text-gray-600 mb-2">
                        Each agent&apos;s <code className="text-xs bg-gray-100 px-1 rounded">name</code> is a full resource path; the{' '}
                        <strong>Agent Name</strong> field below (and the API) expects only the last path segment, extracted here:
                      </p>
                      <div className="space-y-2">
                        {agents.map((agent, idx) => {
                          const shortId = agent.name?.split('/').pop() ?? '';
                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between gap-3 p-3 bg-gray-50 border border-gray-200 rounded"
                            >
                              <div className="min-w-0">
                                <div className="font-medium text-sm truncate">
                                  {agent.displayName || shortId}
                                </div>
                                <div className="text-xs text-gray-500 font-mono truncate">
                                  agent_name: {shortId || '(missing name field)'}
                                </div>
                              </div>
                              <button
                                onClick={() => setAgentId(shortId)}
                                disabled={!shortId}
                                className="shrink-0 px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400"
                              >
                                Use for Get Agent Details →
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
            <RawJsonView
              data={{ request_params: listAgentsData.request_params, response: listAgentsData.response }}
              label="View request/response JSON"
            />
            {Boolean(listAgentsData.error) && <RawJsonView data={listAgentsData.error} label="View error details" />}
          </div>
        )}
      </div>

      {/* Section 5: Get Agent Details */}
      <div className="mb-8 border-b pb-8">
        <h2 className="text-xl font-semibold mb-2">
          5. Get Agent Details
          <Badge variant="purple" className="ml-3">REST API v1alpha</Badge>
        </h2>
        <div className="mb-3 px-3 py-2 bg-gray-50 rounded border border-gray-200">
          <code className="text-xs text-gray-700">GET {getApiEndpoint()}/v1alpha/.../agents/{'{agent}'}</code>
        </div>
        <p className="text-gray-600 mb-4">
          Get detailed information about a specific agent (e.g., &quot;default_idea_generation&quot;, &quot;deep_research&quot;). Use agent names from the List Agents response.
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
          <div className="space-y-4">
            {getAgentData.success !== undefined && (
              <StatusBanner success={getAgentData.success} />
            )}
            {getAgentData.response && (() => {
              const response = getAgentData.response!;
              const state: string | undefined = response.state;
              const definitionKey = AGENT_DEFINITION_KEYS.find((key) => response[key] !== undefined);
              return (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{response.displayName ?? '(no display name)'}</span>
                    {state && (
                      <Badge variant={AGENT_STATE_BADGE_VARIANT[state] ?? 'gray'}>{state}</Badge>
                    )}
                  </div>
                  {response.description && (
                    <div className="text-gray-600">{response.description}</div>
                  )}
                  <div>
                    <span className="text-gray-500">Definition Type:</span>{' '}
                    {definitionKey ? <Badge variant="teal">{definitionKey}</Badge> : '—'}
                  </div>
                </div>
              );
            })()}
            <RawJsonView
              data={{ request_params: getAgentData.request_params, response: getAgentData.response }}
              label="View request/response JSON"
            />
            {Boolean(getAgentData.error) && <RawJsonView data={getAgentData.error} label="View error details" />}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">API Hierarchy</h3>
        <div className="text-sm text-gray-700 space-y-2">
          <p><strong>Engine</strong> → Contains → <strong>Assistants</strong> → Contains → <strong>Agents</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li><strong>Engine:</strong> Top-level resource (e.g., &quot;my-engine&quot;)</li>
            <li><strong>Assistant:</strong> Container for agents (e.g., &quot;default_assistant&quot;)</li>
            <li><strong>Agent:</strong> Individual AI tool/capability (e.g., &quot;HKFinBot&quot;, &quot;Deep Research&quot;)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
