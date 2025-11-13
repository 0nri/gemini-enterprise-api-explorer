'use client';

import { useEffect, useState } from 'react';
import { listAgents, type EngineInfo } from '@/lib/api';

interface AgentListProps {
  projectNumber: string;
  location: string;
}

export default function AgentList({ projectNumber, location }: AgentListProps) {
  const [agents, setAgents] = useState<EngineInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAgents() {
      if (!projectNumber) {
        setLoading(false);
        return;
      }
      
      try {
        const response = await listAgents(projectNumber, location);
        setAgents(response.engines);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load agents');
      } finally {
        setLoading(false);
      }
    }

    fetchAgents();
  }, [projectNumber, location]);

  if (loading) {
    return (
      <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
        <h2 className="text-lg font-semibold mb-4">Available Agents</h2>
        <div className="text-gray-500">Loading agents...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
        <h2 className="text-lg font-semibold mb-4">Available Agents</h2>
        <div className="text-red-500 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
      <h2 className="text-lg font-semibold mb-4">Available Agents</h2>
      <div className="space-y-2">
        {agents.length === 0 ? (
          <div className="text-gray-500 text-sm">No agents found</div>
        ) : (
          agents.map((agent) => (
            <div
              key={agent.name}
              className="p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
            >
              <div className="font-medium text-sm">{agent.display_name}</div>
              <div className="text-xs text-gray-500 mt-1">
                {agent.solution_type.replace('SOLUTION_TYPE_', '')}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
