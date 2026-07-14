import { API_BASE_URL } from './client';

export async function fetchAllRisks() {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}/api/analyze`, { headers });
  if (!res.ok) throw new Error('Failed to fetch backend analysis findings');
  return res.json();
}

export async function fetchBackendAnalyze(documentIds: string[], playbookId: string, countryCode: string) {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}/api/analyze`, { 
    method: 'POST',
    headers,
    body: JSON.stringify({ documentIds, playbookId, countryCode })
  });
  
  if (!res.ok) throw new Error('Failed to fetch backend analysis findings');
  return res.json();
}

