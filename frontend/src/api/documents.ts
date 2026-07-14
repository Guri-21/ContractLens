import { API_BASE_URL } from './client';

export async function fetchBackendDocuments() {
  const res = await fetch(`${API_BASE_URL}/api/documents`);
  if (!res.ok) throw new Error('Failed to fetch backend documents');
  return res.json();
}
