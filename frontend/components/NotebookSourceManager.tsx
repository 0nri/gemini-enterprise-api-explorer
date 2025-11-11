'use client';

import { useState } from 'react';
import {
  batchCreateNotebookSources,
  batchDeleteNotebookSources,
  uploadFileSource,
  type UserContent,
  type SourceInfo,
} from '@/lib/api';

interface NotebookSourceManagerProps {
  notebookId: string;
  projectNumber: string;
  location: string;
  sources?: SourceInfo[];
  onSourcesUpdated?: () => void;
}

type SourceType = 'text' | 'web' | 'video' | 'google_drive' | 'file';

export default function NotebookSourceManager({
  notebookId,
  projectNumber,
  location,
  sources = [],
  onSourcesUpdated,
}: NotebookSourceManagerProps) {
  const [sourceType, setSourceType] = useState<SourceType>('text');
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state for different source types
  const [textSourceName, setTextSourceName] = useState('');
  const [textContent, setTextContent] = useState('');
  const [webUrl, setWebUrl] = useState('');
  const [webSourceName, setWebSourceName] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [driveDocId, setDriveDocId] = useState('');
  const [driveMimeType, setDriveMimeType] = useState('application/vnd.google-apps.document');
  const [driveSourceName, setDriveSourceName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDisplayName, setFileDisplayName] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-fill display name from file name (without extension)
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setFileDisplayName(nameWithoutExt);
    }
  };

  const handleAddSource = async () => {
    setError(null);
    setSuccess(null);

    if (!projectNumber) {
      setError('Project number is required');
      return;
    }

    // Build user content based on source type
    const userContent: UserContent = {};

    // Handle file upload separately
    if (sourceType === 'file') {
      if (!selectedFile) {
        setError('Please select a file to upload');
        return;
      }
      if (!fileDisplayName.trim()) {
        setError('Please provide a display name for the file');
        return;
      }

      setAdding(true);

      try {
        await uploadFileSource(
          notebookId,
          selectedFile,
          fileDisplayName,
          projectNumber,
          location
        );

        setSuccess('File uploaded successfully!');
        
        // Clear form
        setSelectedFile(null);
        setFileDisplayName('');
        // Reset file input
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';

        if (onSourcesUpdated) {
          onSourcesUpdated();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to upload file');
      } finally {
        setAdding(false);
      }
      return;
    }

    // Handle other source types
    switch (sourceType) {
      case 'text':
        if (!textSourceName.trim() || !textContent.trim()) {
          setError('Source name and content are required for text sources');
          return;
        }
        userContent.text_content = {
          source_name: textSourceName,
          content: textContent,
        };
        break;

      case 'web':
        if (!webUrl.trim() || !webSourceName.trim()) {
          setError('URL and source name are required for web sources');
          return;
        }
        userContent.web_content = {
          url: webUrl,
          source_name: webSourceName,
        };
        break;

      case 'video':
        if (!videoUrl.trim()) {
          setError('YouTube URL is required for video sources');
          return;
        }
        userContent.video_content = {
          url: videoUrl,
        };
        break;

      case 'google_drive':
        if (!driveDocId.trim() || !driveSourceName.trim()) {
          setError('Document ID and source name are required for Google Drive sources');
          return;
        }
        userContent.google_drive_content = {
          document_id: driveDocId,
          mime_type: driveMimeType,
          source_name: driveSourceName,
        };
        break;
    }

    setAdding(true);

    try {
      await batchCreateNotebookSources({
        notebook_id: notebookId,
        user_contents: [userContent],
        project_number: projectNumber,
        location: location,
      });

      setSuccess('Source added successfully!');
      
      // Clear form
      setTextSourceName('');
      setTextContent('');
      setWebUrl('');
      setWebSourceName('');
      setVideoUrl('');
      setDriveDocId('');
      setDriveSourceName('');

      if (onSourcesUpdated) {
        onSourcesUpdated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add source');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteSource = async (sourceName: string) => {
    if (!confirm('Are you sure you want to delete this source?')) {
      return;
    }

    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      await batchDeleteNotebookSources({
        notebook_id: notebookId,
        names: [sourceName],
        project_number: projectNumber,
        location: location,
      });

      setSuccess('Source deleted successfully!');
      
      if (onSourcesUpdated) {
        onSourcesUpdated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete source');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
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

      {/* Add Source Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Add Data Source</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Source Type
            </label>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as SourceType)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="file">Upload File (PDF, Office, Audio, Images)</option>
              <option value="text">Text Content</option>
              <option value="web">Web URL</option>
              <option value="video">YouTube Video</option>
              <option value="google_drive">Google Drive (Docs/Slides)</option>
            </select>
          </div>

          {/* Text Source Form */}
          {sourceType === 'text' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source Name
                </label>
                <input
                  type="text"
                  value={textSourceName}
                  onChange={(e) => setTextSourceName(e.target.value)}
                  placeholder="My Text Source"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Text Content
                </label>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Enter your text content here..."
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          {/* Web Source Form */}
          {sourceType === 'web' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL
                </label>
                <input
                  type="url"
                  value={webUrl}
                  onChange={(e) => setWebUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source Name
                </label>
                <input
                  type="text"
                  value={webSourceName}
                  onChange={(e) => setWebSourceName(e.target.value)}
                  placeholder="Article Title"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          {/* Video Source Form */}
          {sourceType === 'video' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                YouTube URL
              </label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* File Upload Form */}
          {sourceType === 'file' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select File
                </label>
                <input
                  id="file-upload"
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.txt,.md,.docx,.pptx,.xlsx,.png,.jpg,.jpeg,.mp3,.mp4,.wav,.m4a"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Supported: Documents (PDF, Word, PowerPoint, Excel), Text (TXT, MD), Audio (MP3, M4A, WAV), Images (PNG, JPG)
                </p>
              </div>
              {selectedFile && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Selected:</strong> {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={fileDisplayName}
                  onChange={(e) => setFileDisplayName(e.target.value)}
                  placeholder="Document Title"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          {/* Google Drive Source Form */}
          {sourceType === 'google_drive' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document ID
                </label>
                <input
                  type="text"
                  value={driveDocId}
                  onChange={(e) => setDriveDocId(e.target.value)}
                  placeholder="Document ID from Google Drive URL"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Found in the URL: docs.google.com/.../d/DOCUMENT_ID/...
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Type
                </label>
                <select
                  value={driveMimeType}
                  onChange={(e) => setDriveMimeType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="application/vnd.google-apps.document">Google Docs</option>
                  <option value="application/vnd.google-apps.presentation">Google Slides</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source Name
                </label>
                <input
                  type="text"
                  value={driveSourceName}
                  onChange={(e) => setDriveSourceName(e.target.value)}
                  placeholder="Document Title"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          <button
            onClick={handleAddSource}
            disabled={adding || !projectNumber}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {adding ? 'Adding...' : 'Add Source'}
          </button>
        </div>
      </div>

      {/* Sources List */}
      {sources.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Current Sources ({sources.length})</h2>
          <div className="space-y-3">
            {sources.map((source) => (
              <div
                key={source.source_id.id}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium">{source.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      ID: {source.source_id.id}
                    </p>
                    <p className="text-sm text-gray-500">
                      Status: {source.settings.status.replace('SOURCE_STATUS_', '')}
                    </p>
                    {source.metadata && (
                      <div className="text-xs text-gray-400 mt-2">
                        {source.metadata.wordCount && <span>Words: {source.metadata.wordCount} </span>}
                        {source.metadata.tokenCount && <span>Tokens: {source.metadata.tokenCount}</span>}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteSource(source.name)}
                    disabled={deleting}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}