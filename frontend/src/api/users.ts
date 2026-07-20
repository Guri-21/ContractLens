import { API_BASE_URL, authFetch } from './client';
import { cachedRequest, invalidateAdminDataCache, peekCache } from './cache';
import { invalidateAvailableUsersCache } from './auth';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export interface UserResponse {
  id: string;
  email: string;
  role: string;
  status?: string; // Missing from backend right now, optional for integration
  assigned_docs?: { id: string; name: string; status: string }[];
}

export const fetchUsers = async (options: { force?: boolean } = {}): Promise<UserResponse[]> => {
  return cachedRequest('users:list', async () => {
  const res = await authFetch(`${API_BASE_URL}/api/users/`);
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
  }, options);
};

export const peekUsers = (): UserResponse[] | undefined => peekCache<UserResponse[]>('users:list');

export interface CreatedUserResponse {
  id: string;
  email: string;
  role: string;
  temporaryPassword?: string;
}

export const createUser = async (data: { email: string; role_id?: string; password?: string }): Promise<CreatedUserResponse> => {
  // This endpoint might not exist yet, keeping it integration-ready
  const res = await authFetch(`${API_BASE_URL}/api/users/`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Failed to create user');
  }
  invalidateAdminDataCache();
  invalidateAvailableUsersCache();
  return res.json();
};

export const deleteUser = async (id: string) => {
  const res = await authFetch(`${API_BASE_URL}/api/users/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Failed to delete user');
  }
  invalidateAdminDataCache();
  invalidateAvailableUsersCache();
  return res.json();
};
