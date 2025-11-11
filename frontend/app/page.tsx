'use client';

import { useState, useEffect } from 'react';
import ConfigSidebar, { AgentspaceConfig } from '@/components/ConfigSidebar';
import ApiExplorer from '@/components/ApiExplorer';
import ChatInterface from '@/components/ChatInterface';
import SearchResults from '@/components/SearchResults';
import NotebookList from '@/components/NotebookList';
import NotebookExplorer from '@/components/NotebookExplorer';
import { getDefaultConfig, loadConfigFromStorage } from '@/lib/config';
import { NotebookInfo } from '@/lib/api';

type View = 'chat' | 'search' | 'api-explorer' | 'notebooks';

export default function Home() {
  const [currentView, setCurrentView] = useState<View>('api-explorer');
  const [config, setConfig] = useState<AgentspaceConfig>(getDefaultConfig());
  const [selectedNotebook, setSelectedNotebook] = useState<NotebookInfo | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleNotebookCreated = () => {
    // Trigger refresh of notebook list
    setRefreshKey(prev => prev + 1);
  };

  const handleNotebookDeleted = () => {
    // Trigger refresh of notebook list and clear selection
    setSelectedNotebook(null);
    setRefreshKey(prev => prev + 1);
  };

  useEffect(() => {
    const savedConfig = loadConfigFromStorage();
    if (savedConfig) {
      setConfig(savedConfig);
    }
  }, []);

  return (
    <div className="flex h-screen bg-white">
      {/* Configuration Sidebar */}
      <ConfigSidebar config={config} onConfigChange={setConfig} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex">
            <button
              onClick={() => setCurrentView('api-explorer')}
              className={`px-6 py-3 font-medium transition-colors ${
                currentView === 'api-explorer'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🔷 Gemini Enterprise Explorer
            </button>
            <button
              onClick={() => setCurrentView('notebooks')}
              className={`px-6 py-3 font-medium transition-colors ${
                currentView === 'notebooks'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📓 NotebookLM
            </button>
            <button
              onClick={() => setCurrentView('chat')}
              className={`px-6 py-3 font-medium transition-colors ${
                currentView === 'chat'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setCurrentView('search')}
              className={`px-6 py-3 font-medium transition-colors ${
                currentView === 'search'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Search
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {currentView === 'api-explorer' && <ApiExplorer config={config} />}
          {currentView === 'notebooks' && (
            <div className="flex h-full">
              <NotebookList
                key={refreshKey}
                projectNumber={config.projectNumber}
                location={config.location}
                selectedNotebookId={selectedNotebook?.notebook_id}
                onNotebookSelect={setSelectedNotebook}
              />
              <NotebookExplorer
                projectNumber={config.projectNumber}
                location={config.location}
                selectedNotebook={selectedNotebook}
                onNotebookCreated={handleNotebookCreated}
                onNotebookDeleted={handleNotebookDeleted}
              />
            </div>
          )}
          {currentView === 'chat' && <ChatInterface config={config} />}
          {currentView === 'search' && <SearchResults config={config} />}
        </div>
      </div>
    </div>
  );
}
