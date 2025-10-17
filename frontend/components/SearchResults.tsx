'use client';

import { useState } from 'react';
import { AgentspaceConfig } from './ConfigSidebar';

interface SearchResultsProps {
  config: AgentspaceConfig;
}

export default function SearchResults({ config }: SearchResultsProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { projectNumber, location, engineId, assistantId } = config;
  const isConfigured = projectNumber && engineId;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !isConfigured) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const params = new URLSearchParams({
        engine_id: engineId,
        assistant_id: assistantId,
        query: query,
        project_number: projectNumber,
      });

      const response = await fetch(
        `http://localhost:8000/api-explorer/web-grounding-search?${params.toString()}`,
        { method: 'POST' }
      );

      const data = await response.json();

      if (data.success) {
        setResults(data);
      } else {
        setError(data.error?.message || 'Search failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Extract answer text from response chunks
  const getAnswerText = () => {
    if (!results?.response?.chunks) return '';
    
    let answerText = '';
    for (const chunk of results.response.chunks) {
      if (chunk.answer?.replies) {
        for (const reply of chunk.answer.replies) {
          if (reply.groundedContent?.content?.text) {
            answerText += reply.groundedContent.content.text;
          }
        }
      }
    }
    return answerText;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 p-6 bg-white">
        <h1 className="text-2xl font-bold mb-2">Web Search</h1>
        <p className="text-gray-600 mb-4">
          This simulates the main search bar with grounding enabled.  Search the web using Google Search with AI-powered answer synthesis.
        </p>

        {!isConfigured && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-amber-800 font-medium">⚠️ Configuration Required</p>
            <p className="text-amber-700 text-sm mt-1">
              Please configure your Project Number and Engine ID in the sidebar to use Web Search.
            </p>
          </div>
        )}

        {/* Search Form */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything... (e.g., What are the latest developments in quantum computing?)"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !query.trim() || !isConfigured}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            <p className="font-semibold">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600">Searching the web...</p>
            </div>
          </div>
        )}

        {results && !loading && (
          <div className="space-y-6">
            {/* Answer */}
            {getAnswerText() && (
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-3 text-gray-900">Answer</h2>
                <div className="prose max-w-none">
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {getAnswerText()}
                  </p>
                </div>
              </div>
            )}

            {/* Sources/Citations (if available) */}
            {results.response?.chunks?.[0]?.answer?.citations && (
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-3 text-gray-900">Sources</h2>
                <div className="space-y-2">
                  {results.response.chunks[0].answer.citations.map((citation: any, idx: number) => (
                    <div key={idx} className="text-sm">
                      <a
                        href={citation.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {citation.title || citation.uri}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Debug Info (collapsible) */}
            <details className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <summary className="cursor-pointer font-semibold text-gray-700 hover:text-gray-900">
                View Raw Response
              </summary>
              <pre className="mt-4 p-4 bg-white rounded border border-gray-200 overflow-x-auto text-xs">
                {JSON.stringify(results, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {!results && !loading && !error && (
          <div className="text-center py-12 text-gray-500">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <p className="text-lg">Enter a search query to get started</p>
            <p className="text-sm mt-2">
              Try asking about current events, technical topics, or general knowledge
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
