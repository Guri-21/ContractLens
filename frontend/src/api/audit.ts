import { API_BASE_URL, authFetch } from './client';
import { cachedRequest } from './cache';

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
      const res = await authFetch(`${API_BASE_URL}/api/audit/`);
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      return res.json();
    },
    { force: options.force }
  );
};
