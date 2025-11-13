'use client';

import { useEffect, useState } from 'react';
import { listRecentlyViewedNotebooks, type NotebookInfo } from '@/lib/api';

interface NotebookListProps {
  projectNumber: string;
  location: string;
  selectedNotebookId?: string;
  onNotebookSelect?: (notebook: NotebookInfo) => void;
}

export default function NotebookList({
  projectNumber,
  location,
  selectedNotebookId,
  onNotebookSelect
}: NotebookListProps) {
  const [notebooks, setNotebooks] = useState<NotebookInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchNotebooks() {
      if (!projectNumber || projectNumber.trim() === '') {
        setLoading(false);
        setError(null); // Don't show error, just show empty state
        setNotebooks([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log('Fetching notebooks for project:', projectNumber, 'location:', location);
        const response = await listRecentlyViewedNotebooks(projectNumber, location);
        console.log('Notebooks response:', response);
        setNotebooks(response.notebooks || []);
      } catch (err) {
        console.error('Error fetching notebooks:', err);
        setError(err instanceof Error ? err.message : 'Failed to load notebooks');
      } finally {
        setLoading(false);
      }
    }

    fetchNotebooks();
  }, [projectNumber, location]);

  const handleNotebookClick = (notebook: NotebookInfo) => {
    if (onNotebookSelect) {
      onNotebookSelect(notebook);
    }
  };

  if (loading) {
    return (
      <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
        <h2 className="text-lg font-semibold mb-4">📓 Notebooks</h2>
        <div className="text-gray-500">Loading notebooks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
        <h2 className="text-lg font-semibold mb-4">📓 Notebooks</h2>
        <div className="text-red-500 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4">📓 Notebooks</h2>
      
      {!projectNumber || projectNumber.trim() === '' ? (
        <div className="space-y-3">
          <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="font-medium mb-1">⚙️ Configuration Required</p>
            <p className="text-xs">Please configure your project number in the sidebar to view notebooks.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="text-xs text-gray-500 mb-3">
            {notebooks.length} notebook{notebooks.length !== 1 ? 's' : ''} found
          </div>
          <div className="space-y-2">
            {notebooks.length === 0 ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800 font-medium mb-1">No notebooks yet</p>
                <p className="text-xs text-blue-600">Create your first notebook using the explorer on the right!</p>
              </div>
            ) : (
          notebooks.map((notebook) => (
            <div
              key={notebook.notebook_id}
              onClick={() => handleNotebookClick(notebook)}
              className={`p-3 bg-white rounded-lg border transition-all cursor-pointer ${
                selectedNotebookId && selectedNotebookId === notebook.notebook_id
                  ? 'border-blue-500 shadow-md bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-lg flex-shrink-0">
                  {notebook.emoji || '📓'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {notebook.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {notebook.metadata.user_role ? notebook.metadata.user_role.replace('PROJECT_ROLE_', '') : 'VIEWER'}
                  </div>
                  {notebook.metadata.last_viewed && (
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(notebook.metadata.last_viewed).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
              {notebook.metadata.is_shared && (
                <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                  <span>👥</span>
                  <span>Shared</span>
                </div>
              )}
            </div>
          ))
            )}
          </div>
        </>
      )}
    </div>
  );
}