import { API_BASE_URL } from './client';

export interface PlaybookRule {
  id?: string;
  title: string;
  description: string;
  is_active?: boolean;
}

function getHeaders() {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchPlaybookRules(): Promise<PlaybookRule[]> {
  const res = await fetch(`${API_BASE_URL}/api/playbook/`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch playbook rules');
  return res.json();
}

export async function createPlaybookRule(rule: PlaybookRule): Promise<PlaybookRule> {
  const res = await fetch(`${API_BASE_URL}/api/playbook/`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(rule)
  });
  if (!res.ok) throw new Error('Failed to create playbook rule');
  return res.json();
}

export async function updatePlaybookRule(id: string, rule: PlaybookRule): Promise<PlaybookRule> {
  const res = await fetch(`${API_BASE_URL}/api/playbook/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(rule)
  });
  if (!res.ok) throw new Error('Failed to update playbook rule');
  return res.json();
}

export async function deletePlaybookRule(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/playbook/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Failed to delete playbook rule');
}
