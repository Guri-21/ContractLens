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
