import { API_BASE_URL } from './client';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export interface UserResponse {
  id: string;
  email: string;
  role: string;
  status?: string; // Missing from backend right now, optional for integration
}

export const fetchUsers = async (): Promise<UserResponse[]> => {
  const res = await fetch(`${API_BASE_URL}/api/users/`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
};

export const createUser = async (data: { email: string; role_id?: string; password?: string }) => {
  // This endpoint might not exist yet, keeping it integration-ready
  const res = await fetch(`${API_BASE_URL}/api/users/`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create user');
  return res.json();
};
