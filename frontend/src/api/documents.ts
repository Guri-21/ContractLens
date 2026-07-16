import { API_BASE_URL } from './client';
import { cachedRequest, invalidateAdminDataCache } from './cache';
import type { DocumentType } from '../lib/types';

export interface BackendDocument {
  id: string;
  name: string;
  document_type: DocumentType;
  status: string;
  uploaded_by_id?: string;
  uploader?: { id: string; email: string } | null;
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

export async function fetchBackendDocuments(options: { force?: boolean } = {}): Promise<BackendDocument[]> {
  return cachedRequest('documents:list', async () => {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}/api/documents`, { headers });
  if (!res.ok) throw new Error('Failed to fetch backend documents');
  return res.json();
  }, options);
}

export async function uploadDocument(file: File, documentType: DocumentType) {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('document_type', documentType);
  
  const res = await fetch(`${API_BASE_URL}/api/documents/upload`, {
    method: 'POST',
    headers,
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
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const formData = new FormData();
  formData.append('file', file);
  if (assignedToId) formData.append('assigned_to_id', assignedToId);
  
  const res = await fetch(`${API_BASE_URL}/api/documents/admin-upload`, {
    method: 'POST',
    headers,
    body: formData
  });
  
  if (!res.ok) throw new Error('Admin upload failed');
  invalidateAdminDataCache();
  return res.json();
}

export async function assignMsa(documentId: string, assignedToId: string) {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(`${API_BASE_URL}/api/documents/${documentId}/assign`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ assigned_to_id: assignedToId })
  });
  
  if (!res.ok) throw new Error('Failed to assign MSA');
  invalidateAdminDataCache();
  return res.json();
}

export async function deleteMsa(documentId: string) {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(`${API_BASE_URL}/api/documents/${documentId}`, {
    method: 'DELETE',
    headers
  });
  
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Failed to delete MSA');
  }
  invalidateAdminDataCache();
  return res.json();
}
