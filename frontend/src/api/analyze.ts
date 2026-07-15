import { API_BASE_URL } from './client';

export async function fetchAllRisks() {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}/api/analyze`, { headers });
  if (!res.ok) throw new Error('Failed to fetch backend analysis findings');
  return res.json();
}

export interface AnalysisPackageRequest {
  msaDocumentId: string;
  sowDocumentId: string;
  supportingDocumentIds: string[];
  playbookId: string;
  countryCode: string;
}

export async function fetchBackendAnalyze(payload: AnalysisPackageRequest) {
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
    body: JSON.stringify(payload)
  });
  
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Failed to analyze the contract package');
  }
  return res.json();
}

