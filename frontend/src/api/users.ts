import { API_BASE_URL } from './client';

export interface UserDTO {
  id: string;
  email: string;
  role: string;
  name?: string;
  status?: string;
  lastActive?: string;
  password?: string;
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

export async function fetchUsers(): Promise<UserDTO[]> {
  const res = await fetch(`${API_BASE_URL}/api/users/`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch backend users');
  return res.json();
}

export async function createUser(user: UserDTO): Promise<UserDTO> {
  const res = await fetch(`${API_BASE_URL}/api/users/`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      email: user.email,
      role: user.role,
      password: user.password || 'password123'
    })
  });
  if (!res.ok) throw new Error('Failed to create user in backend');
  return res.json();
}

export async function updateUser(id: string, user: UserDTO): Promise<UserDTO> {
  const res = await fetch(`${API_BASE_URL}/api/users/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({
      email: user.email,
      role: user.role
    })
  });
  if (!res.ok) throw new Error('Failed to update user in backend');
  return res.json();
}

export async function deleteUser(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/users/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Failed to delete user in backend');
}
