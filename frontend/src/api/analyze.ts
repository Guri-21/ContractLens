import { API_BASE_URL, authFetch } from './client';
import { invalidateAdminDataCache } from './cache';

export async function fetchAllRisks() {
  const res = await authFetch(`${API_BASE_URL}/api/analyze`);
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
  const res = await authFetch(`${API_BASE_URL}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Failed to analyze the contract package');
  }
  invalidateAdminDataCache();
  return res.json();
}

