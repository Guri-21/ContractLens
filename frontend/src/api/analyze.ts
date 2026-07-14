import { API_BASE_URL } from './client';

export async function fetchBackendAnalyze() {
  const res = await fetch(`${API_BASE_URL}/api/analyze`);
  if (!res.ok) throw new Error('Failed to fetch backend analysis findings');
  return res.json();
}
