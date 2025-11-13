'use client';

import { useState, useEffect } from 'react';
import {
  createNotebook,
  getNotebook,
  shareNotebook,
  getNotebookUrl,
  batchDeleteNotebooks,
  type NotebookInfo,
  type NotebookShareAccountRole,
  type SourceInfo,
} from '@/lib/api';
import NotebookSourceManager from './NotebookSourceManager';

interface NotebookExplorerProps {
  projectNumber: string;
  location: string;
  selectedNotebook?: NotebookInfo | null;
  onNotebookCreated?: () => void;
  onNotebookDeleted?: () => void;
}

export default function NotebookExplorer({
  projectNumber,
  location,
  selectedNotebook,
  onNotebookCreated,
  onNotebookDeleted,
}: NotebookExplorerProps) {
  const [newNotebookTitle, setNewNotebookTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [notebookDetails, setNotebookDetails] = useState<NotebookInfo | null>(
    selectedNotebook || null
  );
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState('PROJECT_ROLE_WRITER');
  const [sharing, setSharing] = useState(false);
  const [notebookUrl, setNotebookUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  // Sync notebookDetails with selectedNotebook when it changes from parent
  useEffect(() => {
    if (selectedNotebook) {
      setNotebookDetails(selectedNotebook);
    }
  }, [selectedNotebook]);

  // Load sources when a notebook is selected
  useEffect(() => {
    const currentNotebook = notebookDetails || selectedNotebook;
    if (currentNotebook && currentNotebook.notebook_id && projectNumber) {
      loadNotebookSources(currentNotebook.notebook_id);
    }
  }, [notebookDetails, selectedNotebook, projectNumber]);

  const loadNotebookSources = async (notebookId: string) => {
    setLoadingSources(true);
    try {
      // Get the notebook which includes sources information
      const notebook = await getNotebook(notebookId, projectNumber, location);
      // Note: In a full implementation, sources would be part of the notebook response
      // For now, we'll set an empty array as a placeholder
      setSources([]);
    } catch (err) {
      console.error('Failed to load sources:', err);
    } finally {
      setLoadingSources(false);
    }
  };

  const handleSourcesUpdated = () => {
    const currentNotebook = notebookDetails || selectedNotebook;
    if (currentNotebook && currentNotebook.notebook_id) {
      loadNotebookSources(currentNotebook.notebook_id);
    }
  };

  const handleCreateNotebook = async () => {
    if (!newNotebookTitle.trim()) {
      setError('Please enter a notebook title');
      return;
    }

    if (!projectNumber) {
      setError('Project number is required');
      return;
    }

    setCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await createNotebook({
        title: newNotebookTitle,
        project_number: projectNumber,
        location: location,
      });

      const notebookId = response.notebookId || response.notebook_id;
      setSuccess(`Notebook created successfully! ID: ${notebookId}`);
      setNewNotebookTitle('');
      
      // Fetch the full details
      if (notebookId) {
        const details = await getNotebook(
          notebookId,
          projectNumber,
          location
        );
        setNotebookDetails(details);
        
        // Trigger parent to refresh notebook list
        if (onNotebookCreated) {
          onNotebookCreated();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create notebook');
    } finally {
      setCreating(false);
    }
  };

  const handleGetNotebookUrl = async (notebookId: string) => {
    if (!projectNumber) {
      setError('Project number is required');
      return;
    }

    try {
      setError(null);
      const response = await getNotebookUrl(notebookId, projectNumber, location);
      setNotebookUrl(response.url);
      setSuccess('Notebook URL generated!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get notebook URL');
    }
  };

  const handleShareNotebook = async () => {
    if (!notebookDetails) {
      setError('Please select a notebook first');
      return;
    }

    if (!shareEmail.trim()) {
      setError('Please enter an email address');
      return;
    }

    if (!projectNumber) {
      setError('Project number is required');
      return;
    }

    setSharing(true);
    setError(null);
    setSuccess(null);

    try {
      const accountAndRoles: NotebookShareAccountRole[] = [
        {
          email: shareEmail,
          role: shareRole,
        },
      ];

      await shareNotebook({
        notebook_id: notebookDetails.notebook_id,
        account_and_roles: accountAndRoles,
        project_number: projectNumber,
        location: location,
      });

      setSuccess(`Notebook shared with ${shareEmail} as ${shareRole.replace('PROJECT_ROLE_', '')}`);
      setShareEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share notebook');
    } finally {
      setSharing(false);
    }
  };

  const handleDeleteNotebook = async () => {
    const currentNotebook = notebookDetails || selectedNotebook;
    if (!currentNotebook) {
      setError('No notebook selected');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${currentNotebook.title}"? This action cannot be undone.`)) {
      return;
    }

    if (!projectNumber) {
      setError('Project number is required');
      return;
    }

    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const notebookName = currentNotebook.name;
      await batchDeleteNotebooks({
        names: [notebookName],
        project_number: projectNumber,
        location: location,
      });

      setSuccess('Notebook deleted successfully!');
      setNotebookDetails(null);
      
      // Trigger parent to refresh notebook list
      if (onNotebookDeleted) {
        onNotebookDeleted();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete notebook');
    } finally {
      setDeleting(false);
    }
  };

  const handleStartEditTitle = () => {
    const currentNotebook = notebookDetails || selectedNotebook;
    if (currentNotebook) {
      setNewTitle(currentNotebook.title);
      setEditingTitle(true);
    }
  };

  const handleCancelEditTitle = () => {
    setEditingTitle(false);
    setNewTitle('');
  };

  const handleSaveTitle = async () => {
    // Note: The NotebookLM API doesn't currently support updating notebook titles
    // This is a placeholder for when that functionality becomes available
    setError('Updating notebook titles is not yet supported by the NotebookLM API');
    setEditingTitle(false);
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">NotebookLM Explorer</h1>
          <p className="text-gray-600">
            Manage your NotebookLM Enterprise notebooks
          </p>
        </div>

        {/* Configuration Warning */}
        {(!projectNumber || projectNumber.trim() === '') && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded">
            <p className="font-medium">⚙️ Configuration Required</p>
            <p className="text-sm mt-1">
              Please configure your <strong>Project Number</strong> in the left sidebar to use NotebookLM features.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {/* Create New Notebook */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Create New Notebook</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notebook Title
              </label>
              <input
                type="text"
                value={newNotebookTitle}
                onChange={(e) => setNewNotebookTitle(e.target.value)}
                placeholder="Enter notebook title..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleCreateNotebook}
              disabled={creating || !projectNumber}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? 'Creating...' : 'Create Notebook'}
            </button>
          </div>
        </div>

        {/* Notebook Details */}
        {(notebookDetails || selectedNotebook) && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Notebook Details</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-3xl">
                  {(notebookDetails || selectedNotebook)?.emoji || '📓'}
                </span>
                <div className="flex-1">
                  {editingTitle ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveTitle}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEditTitle}
                          className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-medium">
                          {(notebookDetails || selectedNotebook)?.title}
                        </h3>
                        <button
                          onClick={handleStartEditTitle}
                          className="text-gray-400 hover:text-gray-600 text-sm"
                          title="Edit title (coming soon)"
                        >
                          ✏️
                        </button>
                      </div>
                      <p className="text-sm text-gray-500">
                        ID: {(notebookDetails || selectedNotebook)?.notebook_id}
                      </p>
                    </>
                  )}
                </div>
                <button
                  onClick={handleDeleteNotebook}
                  disabled={deleting}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                  title="Delete notebook"
                >
                  {deleting ? 'Deleting...' : '🗑️ Delete'}
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <span className="text-sm font-medium text-gray-600">Role:</span>
                  <p className="text-sm">
                    {(notebookDetails || selectedNotebook)?.metadata.user_role
                      ? (notebookDetails || selectedNotebook)?.metadata.user_role.replace('PROJECT_ROLE_', '')
                      : 'VIEWER'}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Shared:</span>
                  <p className="text-sm">
                    {(notebookDetails || selectedNotebook)?.metadata.is_shared ? 'Yes' : 'No'}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Shareable:</span>
                  <p className="text-sm">
                    {(notebookDetails || selectedNotebook)?.metadata.is_shareable ? 'Yes' : 'No'}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Created:</span>
                  <p className="text-sm">
                    {(notebookDetails || selectedNotebook)?.metadata.create_time
                      ? new Date((notebookDetails || selectedNotebook)!.metadata.create_time!).toLocaleString()
                      : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <button
                  onClick={() => {
                    const notebookId = (notebookDetails || selectedNotebook)?.notebook_id;
                    if (notebookId) handleGetNotebookUrl(notebookId);
                  }}
                  disabled={!(notebookDetails || selectedNotebook)?.notebook_id}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Get Notebook URL
                </button>
                
                {notebookUrl && (
                  <div className="mt-3 p-3 bg-gray-50 rounded border">
                    <p className="text-sm font-medium text-gray-700 mb-1">Notebook URL:</p>
                    <a
                      href={notebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline break-all"
                    >
                      {notebookUrl}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Share Notebook */}
        {(notebookDetails || selectedNotebook) && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Share Notebook</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={shareRole}
                  onChange={(e) => setShareRole(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="PROJECT_ROLE_OWNER">Owner</option>
                  <option value="PROJECT_ROLE_WRITER">Writer</option>
                  <option value="PROJECT_ROLE_READER">Reader</option>
                  <option value="PROJECT_ROLE_NOT_SHARED">Not Shared</option>
                </select>
              </div>

              <button
                onClick={handleShareNotebook}
                disabled={sharing || !projectNumber}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {sharing ? 'Sharing...' : 'Share Notebook'}
              </button>
            </div>
          </div>
        )}

        {/* Notebook Sources */}
        {(notebookDetails || selectedNotebook)?.notebook_id && (
          <NotebookSourceManager
            notebookId={(notebookDetails || selectedNotebook)!.notebook_id}
            projectNumber={projectNumber}
            location={location}
            sources={sources}
            onSourcesUpdated={handleSourcesUpdated}
          />
        )}

        {/* API Information */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">API Information</h2>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Project:</span> {projectNumber || 'Not set'}
            </div>
            <div>
              <span className="font-medium">Location:</span> {location}
            </div>
            <div>
              <span className="font-medium">Endpoint:</span>{' '}
              {location === 'global'
                ? 'discoveryengine.googleapis.com'
                : `${location}-discoveryengine.googleapis.com`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}