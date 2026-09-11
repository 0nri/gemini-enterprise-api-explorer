/**
 * API client for backend communication.
 *
 * Empty by default so requests are same-origin and proxied to the FastAPI
 * backend by the Next.js rewrites in `next.config.ts` (see `BACKEND_URL`).
 * A same-origin path keeps things working when the browser reaches this
 * dev server through a different host/port than the one it's actually
 * running on (remote dev boxes, SSH/port-forwarding, etc.) - an absolute
 * `http://localhost:PORT` baked into the client bundle would otherwise
 * point at the visitor's own machine instead of the backend.
 *
 * Set NEXT_PUBLIC_API_URL only if the browser must reach the backend
 * directly, cross-origin (bypassing the rewrite proxy).
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// NotebookLM Enterprise API Types

export interface NotebookMetadata {
  user_role: string;
  is_shared: boolean;
  is_shareable: boolean;
  last_viewed?: string;
  create_time?: string;
}

export interface NotebookInfo {
  name: string;
  title: string;
  notebook_id: string;
  emoji: string;
  metadata: NotebookMetadata;
}

export interface NotebookCreateRequest {
  title: string;
  project_number: string;
  location: string;
}

export interface NotebookCreateResponse {
  title: string;
  notebookId: string;  // API returns camelCase
  notebook_id?: string; // Keep for backward compatibility
  emoji: string;
  metadata: NotebookMetadata;
  name: string;
}

export interface NotebookListResponse {
  notebooks: NotebookInfo[];
}

export interface NotebookShareAccountRole {
  email: string;
  role: string;
}

export interface NotebookShareRequest {
  notebook_id: string;
  account_and_roles: NotebookShareAccountRole[];
  project_number: string;
  location: string;
}

export interface NotebookBatchDeleteRequest {
  names: string[];
  project_number: string;
  location: string;
}

// Notebook Source Types

export interface GoogleDriveContent {
  document_id: string;
  mime_type: string;
  source_name: string;
}

export interface TextContent {
  source_name: string;
  content: string;
}

export interface WebContent {
  url: string;
  source_name: string;
}

export interface VideoContent {
  url: string;
}

export interface UserContent {
  google_drive_content?: GoogleDriveContent;
  text_content?: TextContent;
  web_content?: WebContent;
  video_content?: VideoContent;
}

export interface SourceId {
  id: string;
}

export interface SourceSettings {
  status: string;
}

export interface SourceInfo {
  source_id: SourceId;
  title: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
  settings: SourceSettings;
  name: string;
}

export interface NotebookSourceBatchCreateRequest {
  notebook_id: string;
  user_contents: UserContent[];
  project_number: string;
  location: string;
}

export interface NotebookSourceBatchCreateResponse {
  sources: SourceInfo[];
}

export interface NotebookSourceBatchDeleteRequest {
  notebook_id: string;
  names: string[];
  project_number: string;
  location: string;
}

// NotebookLM Enterprise API Functions

/**
 * Create a new NotebookLM notebook
 */
export async function createNotebook(
  request: NotebookCreateRequest
): Promise<NotebookCreateResponse> {
  const response = await fetch(`${API_BASE_URL}/notebooks/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Failed to create notebook: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get a specific NotebookLM notebook
 */
export async function getNotebook(
  notebookId: string,
  projectNumber: string,
  location: string
): Promise<NotebookInfo> {
  const params = new URLSearchParams({
    project_number: projectNumber,
    location: location,
  });

  const response = await fetch(`${API_BASE_URL}/notebooks/${notebookId}?${params}`);

  if (!response.ok) {
    throw new Error(`Failed to get notebook: ${response.statusText}`);
  }

  return response.json();
}

/**
 * List recently viewed NotebookLM notebooks
 */
export async function listRecentlyViewedNotebooks(
  projectNumber: string,
  location: string,
  pageSize: number = 500
): Promise<NotebookListResponse> {
  const params = new URLSearchParams({
    project_number: projectNumber,
    location: location,
    page_size: pageSize.toString(),
  });

  const response = await fetch(`${API_BASE_URL}/notebooks?${params}`);

  if (!response.ok) {
    throw new Error(`Failed to list notebooks: ${response.statusText}`);
  }

  return response.json();
}

// Notebook Source API Functions

/**
 * Batch create sources for a notebook
 */
export async function batchCreateNotebookSources(
  request: NotebookSourceBatchCreateRequest
): Promise<NotebookSourceBatchCreateResponse> {
  const response = await fetch(
    `${API_BASE_URL}/notebooks/${request.notebook_id}/sources/batch-create`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to create sources: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get a specific source from a notebook
 */
export async function getNotebookSource(
  notebookId: string,
  sourceId: string,
  projectNumber: string,
  location: string
): Promise<SourceInfo> {
  const params = new URLSearchParams({
    project_number: projectNumber,
    location: location,
  });

  const response = await fetch(
    `${API_BASE_URL}/notebooks/${notebookId}/sources/${sourceId}?${params}`
  );

  if (!response.ok) {
    throw new Error(`Failed to get source: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Batch delete sources from a notebook
 */
export async function batchDeleteNotebookSources(
  request: NotebookSourceBatchDeleteRequest
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/notebooks/${request.notebook_id}/sources/batch-delete`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to delete sources: ${response.statusText}`);
  }
}

/**
 * Batch delete NotebookLM notebooks
 */
export async function batchDeleteNotebooks(
  request: NotebookBatchDeleteRequest
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/notebooks/batch-delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Failed to delete notebooks: ${response.statusText}`);
  }
}

/**
 * Share a NotebookLM notebook with users
 */
export async function shareNotebook(
  request: NotebookShareRequest
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/notebooks/share`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Failed to share notebook: ${response.statusText}`);
  }
}

/**
 * Get the browser URL for a NotebookLM notebook
 */
export async function getNotebookUrl(
  notebookId: string,
  projectNumber: string,
  location: string,
  useGoogleIdentity: boolean = true
): Promise<{ url: string; notebook_id: string }> {
  const params = new URLSearchParams({
    project_number: projectNumber,
    location: location,
    use_google_identity: useGoogleIdentity.toString(),
  });

  const response = await fetch(`${API_BASE_URL}/notebooks/url/${notebookId}?${params}`);

  if (!response.ok) {
    throw new Error(`Failed to get notebook URL: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Upload a file as a notebook source
 */
export async function uploadFileSource(
  notebookId: string,
  file: File,
  fileName: string,
  projectNumber: string,
  location: string
): Promise<{ source_id: SourceId }> {
  // Determine content type from file
  const contentType = file.type || getContentTypeFromFileName(file.name);

  // Get file extension from original filename
  const fileExtension = file.name.split('.').pop() || '';
  const fileNameWithExtension = fileExtension ? `${fileName}.${fileExtension}` : fileName;

  const params = new URLSearchParams({
    file_name: fileNameWithExtension,
    content_type: contentType,
    project_number: projectNumber,
    location: location,
  });

  const response = await fetch(
    `${API_BASE_URL}/notebooks/${notebookId}/sources/upload?${params}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
      },
      body: file,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload file: ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

/**
 * Get content type from file name extension
 */
function getContentTypeFromFileName(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop();

  const contentTypes: Record<string, string> = {
    // Documents
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'md': 'text/markdown',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // Audio
    '3g2': 'audio/3gpp2',
    '3gp': 'audio/3gpp',
    'aac': 'audio/aac',
    'aif': 'audio/aiff',
    'aifc': 'audio/aiff',
    'aiff': 'audio/aiff',
    'amr': 'audio/amr',
    'au': 'audio/basic',
    'avi': 'video/x-msvideo',
    'cda': 'application/x-cdf',
    'm4a': 'audio/m4a',
    'mid': 'audio/midi',
    'midi': 'audio/midi',
    'mp3': 'audio/mpeg',
    'mp4': 'video/mp4',
    'mpeg': 'audio/mpeg',
    'ogg': 'audio/ogg',
    'opus': 'audio/ogg',
    'ra': 'audio/vnd.rn-realaudio',
    'ram': 'audio/vnd.rn-realaudio',
    'snd': 'audio/basic',
    'wav': 'audio/wav',
    'weba': 'audio/webm',
    'wma': 'audio/x-ms-wma',
    // Images
    'png': 'image/png',
    'jpg': 'image/jpg',
    'jpeg': 'image/jpeg',
  };

  return contentTypes[ext || ''] || 'application/octet-stream';
}
