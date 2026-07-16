import { API_BASE_URL } from './client';

export interface AuditLogDTO {
  id: string;
  user_id: string;
  action: string;
  target_type: string;
  target_id?: string | null;
  timestamp: string;
  user?: {
    email: string;
    role?: {
      name: string;
    };
  };
}

export async function fetchAuditLogs(): Promise<AuditLogDTO[]> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}/api/audit/`, { headers });
  if (!res.ok) throw new Error('Failed to fetch backend audit logs');
  return res.json();
}
