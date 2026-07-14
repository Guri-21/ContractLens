import { API_BASE_URL } from './client';

export async function fetchBackendAnalyze() {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}/api/analyze`, { headers });
  if (!res.ok) throw new Error('Failed to fetch backend analysis findings');
  return res.json();
}
