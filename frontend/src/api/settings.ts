import { API_BASE_URL, authFetch } from './client';
import { clearApiCache } from './cache';

export type PlatformSettings = {
  indianLawGrounding: boolean;
  autoSaveAnalysis: boolean;
  showProgressiveResults: boolean;
  cacheEnabled: boolean;
  cacheTtlSeconds: number;
  strictRefusalMode: boolean;
};

export async function fetchPlatformSettings(): Promise<PlatformSettings> {
  const res = await authFetch(`${API_BASE_URL}/api/settings/`);
  if (!res.ok) throw new Error('Failed to fetch platform settings');
  return res.json();
}

export async function savePlatformSettings(settings: PlatformSettings): Promise<PlatformSettings> {
  const res = await authFetch(`${API_BASE_URL}/api/settings/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to save platform settings');
  clearApiCache();
  return res.json();
}
