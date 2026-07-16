import { API_BASE_URL } from './client';
import { cachedRequest } from './cache';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export type AuditLogResponse = {
  id: string;
  user_id: string;
  action: string;
  target_type: string;
  target_id?: string | null;
  timestamp: string;
};

export const fetchAuditLogs = async (options: { force?: boolean } = {}) => {
  return cachedRequest<AuditLogResponse[]>(
    'audit:list',
    async () => {
      const res = await fetch(`${API_BASE_URL}/api/audit/`, {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      return res.json();
    },
    { force: options.force }
  );
};
