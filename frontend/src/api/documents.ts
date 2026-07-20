import { API_BASE_URL, authFetch } from './client';
import { cachedRequest, invalidateAdminDataCache, peekCache } from './cache';
import type { DocumentType } from '../lib/types';

export interface BackendDocument {
  id: string;
  name: string;
  document_type: DocumentType;
  status: string;
  uploaded_by_id?: string;
  uploader?: { id: string; email: string } | null;
  created_at?: string;
  assigned_to_id?: string | null;
  assigned_to?: { id: string; email: string } | null;
  clauses?: Array<{
    id: string;
    clause_type?: string | null;
    clauseType?: string | null;
    risks?: Array<{
      id: string;
      risk_level?: string;
      riskLevel?: string;
      status?: string;
      reason?: string;
      contradiction_type?: string | null;
      contradictionType?: string | null;
    }>;
  }>;
}

export async function fetchBackendDocuments(options: { force?: boolean; slim?: boolean } = {}): Promise<BackendDocument[]> {
  const slim = options.slim ?? false;
  const cacheKey = slim ? 'documents:list:slim' : 'documents:list';
  return cachedRequest(cacheKey, async () => {
    const url = slim ? `${API_BASE_URL}/api/documents/?slim=true` : `${API_BASE_URL}/api/documents/`;
    const res = await authFetch(url);
    if (!res.ok) throw new Error('Failed to fetch backend documents');
    return res.json();
  }, { force: options.force });
}

export function peekBackendDocuments(options: { slim?: boolean } = {}): BackendDocument[] | undefined {
  const key = options.slim ? 'documents:list:slim' : 'documents:list';
  return peekCache<BackendDocument[]>(key);
}

export async function prefetchDocuments(): Promise<void> {
  fetchBackendDocuments({ slim: true }).catch(() => {});
  fetchBackendDocuments({ slim: false }).catch(() => {});
}

export async function uploadDocument(file: File, documentType: DocumentType) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('document_type', documentType);

  const res = await authFetch(`${API_BASE_URL}/api/documents/upload`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Upload failed for ${file.name}`);
  }
  invalidateAdminDataCache();
  return res.json();
}

export async function uploadAdminMsa(file: File, assignedToId?: string) {
  const formData = new FormData();
  formData.append('file', file);
  if (assignedToId) formData.append('assigned_to_id', assignedToId);

  const res = await authFetch(`${API_BASE_URL}/api/documents/admin-upload`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) throw new Error('Admin upload failed');
  invalidateAdminDataCache();
  return res.json();
}

export async function assignMsa(documentId: string, assignedToId: string) {
  const res = await authFetch(`${API_BASE_URL}/api/documents/${documentId}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assigned_to_id: assignedToId })
  });

  if (!res.ok) throw new Error('Failed to assign MSA');
  invalidateAdminDataCache();
  return res.json();
}

export async function deleteMsa(documentId: string) {
  const res = await authFetch(`${API_BASE_URL}/api/documents/${documentId}`, {
    method: 'DELETE'
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Failed to delete MSA');
  }
  invalidateAdminDataCache();
  return res.json();
}
