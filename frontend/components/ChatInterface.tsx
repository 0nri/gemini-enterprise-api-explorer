'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { AgentspaceConfig } from './ConfigSidebar';
import { API_BASE_URL } from '@/lib/api';
import { buildStreamAssistPayload, buildStreamAssistUrl } from '@/lib/streamAssist';
import { ConfigWarning, RawJsonView } from '@/components/ui';
import DeepResearchView from './DeepResearchView';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  rawRequest?: unknown;
  rawResponse?: unknown;
}

type AgentKind = 'no_code' | 'deep_research' | 'unsupported';

interface Agent {
  name: string;
  displayName: string;
  agentKind: AgentKind;
}

interface RawAgentItem {
  name: string;
  displayName?: string;
  agent_kind?: AgentKind;
}

interface ChatInterfaceProps {
  config: AgentspaceConfig;
}

export default function ChatInterface({ config }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('-');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { projectNumber, location, engineId, assistantId, useAdcQuota } = config;
  const isConfigured = projectNumber && engineId;

  const selectedAgentKind: AgentKind | undefined = selectedAgent
    ? agents.find((agent) => agent.name === selectedAgent)?.agentKind
    : undefined;

  // Live preview of the streamAssist request that Send will trigger, so the
  // exact payload (agent routing included) is visible before the first
  // message is ever sent.
  const requestPreview = useMemo(() => {
    if (!isConfigured) return undefined;
    const previewParams = {
      projectNumber,
      location,
      engineId,
      assistantId,
      agentName: selectedAgent,
      sessionId,
      query: input,
    };
    return {
      url: buildStreamAssistUrl(previewParams),
      payload: buildStreamAssistPayload(previewParams),
    };
  }, [isConfigured, projectNumber, location, engineId, assistantId, selectedAgent, sessionId, input]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch agents on component mount
  useEffect(() => {
    if (!isConfigured) return;
    
    const fetchAgents = async () => {
      try {
        const params = new URLSearchParams({
          project_number: projectNumber,
          location: location,
          use_adc_quota: String(useAdcQuota),
        });
        const response = await fetch(
          `${API_BASE_URL}/api-explorer/list-agents/${engineId}?${params}`
        );
        const data = await response.json();
        
        if (data.success && data.response?.agents) {
          const agentList = data.response.agents.map((agent: RawAgentItem) => ({
            name: agent.name.split('/').pop(), // Extract agent name from full path
            displayName: agent.displayName || agent.name.split('/').pop(),
            agentKind: agent.agent_kind || 'no_code',
          }));
          setAgents(agentList);
        }
      } catch (error) {
        console.error('Error fetching agents:', error);
      }
    };

    fetchAgents();
  }, [engineId, isConfigured, projectNumber, location, assistantId, useAdcQuota]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !isConfigured) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

    // Add placeholder for assistant message
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: '', isStreaming: true },
    ]);

    try {
      const params = new URLSearchParams({
        engine_id: engineId,
        assistant_id: assistantId,
        query: userMessage,
        project_number: projectNumber,
        location: location,
        agent_name: selectedAgent,
        session_id: sessionId,
        use_adc_quota: String(useAdcQuota),
      });

      const response = await fetch(
        `${API_BASE_URL}/api-explorer/stream-assist?${params.toString()}`,
        { method: 'POST' }
      );

      const data = await response.json();

      if (data.success) {
        // Extract the answer from chunks
        let answerText = '';
        if (data.response?.chunks) {
          for (const chunk of data.response.chunks) {
            // Check if answer was skipped
            if (chunk.answer?.state === 'SKIPPED') {
              answerText = 'The assistant skipped this query. Try asking a more specific question.';
              break; // No need to check other chunks
            }
            // Extract text from groundedContent.content.text
            else if (chunk.answer?.replies) {
              for (const reply of chunk.answer.replies) {
                if (reply.groundedContent?.content?.text) {
                  answerText += reply.groundedContent.content.text;
                }
              }
            }
          }
        }

        // Update the assistant message with the full response
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            role: 'assistant',
            content: answerText || 'No response received',
            isStreaming: false,
            rawRequest: { url: data.request_url, payload: data.request_payload },
            rawResponse: data,
          };
          return newMessages;
        });

        // Update session ID for conversation continuity
        if (data.session_info?.session_id) {
          setSessionId(data.session_info.session_id);
        }
      } else {
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            role: 'assistant',
            content: `Error: ${data.error?.message || 'Unknown error'}`,
            isStreaming: false,
          };
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Error in chat:', error);
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'assistant',
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          isStreaming: false,
        };
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setSessionId('-');
  };

  const handleAgentChange = (agentName: string) => {
    setSelectedAgent(agentName);
    // A session pins the conversation to whatever agent context was active when
    // it started; reusing it after switching agents silently ignores the new
    // selection and continues answering under the old context. Start fresh.
    setMessages([]);
    setSessionId('-');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with Agent Selector */}
      <div className="border-b border-gray-200 p-6 bg-white">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-bold">Interact with Agents</h1>
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Clear Chat
            </button>
          )}
        </div>

        <p className="text-gray-600 mb-4">
          Chat with Gemini Enterprise agents using natural language queries
        </p>

        {!isConfigured && <ConfigWarning feature="Chat" />}
        
        {/* Agent Selector */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Select Agent:</label>
          <select
            value={selectedAgent}
            onChange={(e) => handleAgentChange(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Default (No specific agent)</option>
            {agents.map((agent) => (
              <option
                key={agent.name}
                value={agent.name}
                disabled={agent.agentKind === 'unsupported'}
              >
                {agent.agentKind === 'unsupported'
                  ? `${agent.displayName} (unsupported)`
                  : agent.displayName}
              </option>
            ))}
          </select>
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          Engine: {engineId} | Assistant: {assistantId}
          {sessionId !== '-' && ` | Session: ${sessionId}`}
        </div>
      </div>

      {selectedAgentKind === 'deep_research' ? (
        <DeepResearchView config={config} agentName={selectedAgent} />
      ) : (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <p className="text-lg mb-2">This simulates the Gemini Enterpise&apos;s Agent Interface</p>
                <p className="text-sm">
                  Select an agent above and start a conversation by typing a message below
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex flex-col ${
                    message.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-3xl rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    {message.isStreaming && (
                      <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
                    )}
                  </div>
                  {message.role === 'assistant' && message.rawResponse !== undefined && (
                    <div className="max-w-3xl w-full mt-1 space-y-1 text-xs">
                      <RawJsonView data={message.rawRequest} label="View raw request" />
                      <RawJsonView data={message.rawResponse} label="View raw response" />
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Request Preview */}
          {isConfigured && (
            <div className="border-t border-gray-200 px-4 pt-4">
              <RawJsonView data={requestPreview} label="Preview: request that Send will trigger" />
            </div>
          )}

          {/* Input */}
          <div className="border-t border-gray-200 p-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim() || !isConfigured}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Sending...' : 'Send'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
