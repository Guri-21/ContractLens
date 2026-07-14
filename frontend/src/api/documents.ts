import { API_BASE_URL } from './client';

export async function fetchBackendDocuments() {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}/api/documents`, { headers });
  if (!res.ok) throw new Error('Failed to fetch backend documents');
  return res.json();
}

export async function uploadDocument(file: File) {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const formData = new FormData();
  formData.append('file', file);
  
  const res = await fetch(`${API_BASE_URL}/api/documents/upload`, {
    method: 'POST',
    headers,
    body: formData
  });
  
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

