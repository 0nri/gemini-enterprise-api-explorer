'use client';

import { useState, useEffect } from 'react';

export interface AgentspaceConfig {
  projectNumber: string;
  location: 'us' | 'eu' | 'global';
  engineId: string;
  assistantId: string;
}

interface ConfigSidebarProps {
  config: AgentspaceConfig;
  onConfigChange: (config: AgentspaceConfig) => void;
}

export default function ConfigSidebar({ config, onConfigChange }: ConfigSidebarProps) {
  const [localConfig, setLocalConfig] = useState<AgentspaceConfig>(config);
  const [errors, setErrors] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const validateConfig = (): boolean => {
    const newErrors: string[] = [];
    
    if (!localConfig.projectNumber.trim()) {
      newErrors.push('Project Number is required');
    }
    
    if (!localConfig.engineId.trim()) {
      newErrors.push('Engine ID is required');
    }
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleApply = () => {
    if (validateConfig()) {
      onConfigChange(localConfig);
      localStorage.setItem('agentspace-config', JSON.stringify(localConfig));
    }
  };

  const isConfigured = mounted && config.projectNumber && config.engineId;

  return (
    <div className="w-80 border-r border-gray-200 bg-gray-50 p-6 flex flex-col h-full">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Configuration</h2>
        <div className="flex items-center gap-2 text-sm">
          {isConfigured ? (
            <>
              <span className="text-green-600">✓</span>
              <span className="text-green-600">Configured</span>
            </>
          ) : (
            <>
              <span className="text-amber-600">⚠</span>
              <span className="text-amber-600">Not Configured</span>
            </>
          )}
        </div>
      </div>

      <div className="space-y-4 flex-1">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={localConfig.projectNumber}
            onChange={(e) => setLocalConfig({ ...localConfig, projectNumber: e.target.value })}
            placeholder="e.g., 123456789012"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Your Google Cloud project number
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <select
            value={localConfig.location}
            onChange={(e) => setLocalConfig({ ...localConfig, location: e.target.value as 'us' | 'eu' | 'global' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="us">us (United States)</option>
            <option value="eu">eu (Europe)</option>
            <option value="global">global</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Region where your engine is deployed
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Engine ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={localConfig.engineId}
            onChange={(e) => setLocalConfig({ ...localConfig, engineId: e.target.value })}
            placeholder="e.g., my-engine"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Your Agentspace engine identifier
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Assistant ID
          </label>
          <input
            type="text"
            value={localConfig.assistantId}
            onChange={(e) => setLocalConfig({ ...localConfig, assistantId: e.target.value })}
            placeholder="default_assistant"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Assistant to use for queries
          </p>
        </div>

        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm font-medium text-red-800 mb-1">Configuration Errors:</p>
            <ul className="text-sm text-red-700 list-disc list-inside">
              {errors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <button
        onClick={handleApply}
        className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        Apply Configuration
      </button>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>Note:</strong> Configuration is saved in your browser's local storage.
        </p>
      </div>
    </div>
  );
}
