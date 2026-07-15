import { API_BASE_URL } from './client';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const fetchAuditLogs = async () => {
  const res = await fetch(`${API_BASE_URL}/api/audit/`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch audit logs');
  return res.json();
};
