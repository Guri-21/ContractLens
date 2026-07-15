import { API_BASE_URL } from './client';

export interface DemoUser {
  id: string;
  email: string;
  role: 'Admin' | 'Legal Reviewer';
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

export const fetchDemoUsers = async (): Promise<{ admins: DemoUser[]; advisors: DemoUser[] }> => {
  const res = await fetch(`${API_BASE_URL}/api/auth/demo-users`);

  if (!res.ok) {
    throw new Error('Failed to load available demo users');
  }
  return res.json();
};
