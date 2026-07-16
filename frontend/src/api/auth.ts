import { API_BASE_URL } from './client';

export interface AvailableUser {
  id: string;
  email: string;
  role: 'Admin' | 'Legal Reviewer' | 'Legal Advisor' | 'Compliance Officer';
  displayName: string;
}

export const login = async (username: string, password: string) => {
  const params = new URLSearchParams();
  params.append('username', username);
  params.append('password', password);

  const res = await fetch(`${API_BASE_URL}/api/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to login');
  }
  return res.json();
};

export const fetchAvailableUsers = async (): Promise<{ admins: AvailableUser[]; advisors: AvailableUser[] }> => {
  const res = await fetch(`${API_BASE_URL}/api/auth/available-users`);

  if (!res.ok) {
    throw new Error('Failed to load available users');
  }
  return res.json();
};
