import { API_BASE_URL } from './client';
import { clearApiCache } from './cache';

export type PlatformSettings = {
  indianLawGrounding: boolean;
  autoSaveAnalysis: boolean;
  showProgressiveResults: boolean;
  cacheEnabled: boolean;
  cacheTtlSeconds: number;
  strictRefusalMode: boolean;
};

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export async function fetchPlatformSettings(): Promise<PlatformSettings> {
  const res = await fetch(`${API_BASE_URL}/api/settings/`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch platform settings');
  return res.json();
}

export async function savePlatformSettings(settings: PlatformSettings): Promise<PlatformSettings> {
  const res = await fetch(`${API_BASE_URL}/api/settings/`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to save platform settings');
  clearApiCache();
  return res.json();
}
