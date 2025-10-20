'use client';

import { useState, useRef, useEffect } from 'react';
import { AgentspaceConfig } from './ConfigSidebar';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

interface Agent {
  name: string;
  displayName: string;
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

  const { projectNumber, location, engineId, assistantId } = config;
  const isConfigured = projectNumber && engineId;

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
        });
        const response = await fetch(
          `http://localhost:8000/api-explorer/list-agents/${engineId}?${params}`
        );
        const data = await response.json();
        
        if (data.success && data.response?.agents) {
          const agentList = data.response.agents.map((agent: any) => ({
            name: agent.name.split('/').pop(), // Extract agent name from full path
            displayName: agent.displayName || agent.name.split('/').pop(),
          }));
          setAgents(agentList);
        }
      } catch (error) {
        console.error('Error fetching agents:', error);
      }
    };

    fetchAgents();
  }, [engineId, isConfigured, projectNumber, location, assistantId]);

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
      });

      const response = await fetch(
        `http://localhost:8000/api-explorer/stream-assist?${params.toString()}`,
        { method: 'POST' }
      );

      const data = await response.json();

      console.log('Full response data:', JSON.stringify(data, null, 2));

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

        {!isConfigured && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-amber-800 font-medium text-sm">⚠️ Configuration Required</p>
            <p className="text-amber-700 text-xs mt-1">
              Please configure your Project Number and Engine ID in the sidebar to use Chat.
            </p>
          </div>
        )}
        
        {/* Agent Selector */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Select Agent:</label>
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Default (No specific agent)</option>
            {agents.map((agent) => (
              <option key={agent.name} value={agent.name}>
                {agent.displayName}
              </option>
            ))}
          </select>
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          Engine: {engineId} | Assistant: {assistantId}
          {sessionId !== '-' && ` | Session: ${sessionId}`}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-lg mb-2">This simulates the Gemini Enterpise's Agent Interface</p>
            <p className="text-sm">
              Select an agent above and start a conversation by typing a message below
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
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
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

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
    </div>
  );
}
