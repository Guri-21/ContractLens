import { API_BASE_URL } from './client';

export interface AvailableUser {
  id: string;
  email: string;
  role: 'Admin' | 'Legal Reviewer' | 'Legal Advisor' | 'Compliance Officer';
  displayName: string;
}

export type AvailableUsersByRole = { admins: AvailableUser[]; advisors: AvailableUser[] };

const AVAILABLE_USERS_CACHE_KEY = 'contractlens.availableUsers.v1';
const SEEDED_AVAILABLE_USERS: AvailableUsersByRole = {
  admins: [
    {
      id: 'seeded-admin',
      email: 'admin@contractlens.com',
      role: 'Admin',
      displayName: 'Admin',
    },
  ],
  advisors: Array.from({ length: 5 }, (_, index) => {
    const advisorNumber = index + 1;
    return {
      id: `seeded-advisor-${advisorNumber}`,
      email: `advisor${advisorNumber}@contractlens.com`,
      role: 'Legal Reviewer',
      displayName: `Legal Advisor ${advisorNumber}`,
    };
  }),
};

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

export const fetchAvailableUsers = async (): Promise<AvailableUsersByRole> => {
  const res = await fetch(`${API_BASE_URL}/api/auth/available-users`);

  if (!res.ok) {
    throw new Error('Failed to load available users');
  }
  const users = await res.json();
  setCachedAvailableUsers(users);
  return users;
};

export function getCachedAvailableUsers(): AvailableUsersByRole | null {
  try {
    const raw = localStorage.getItem(AVAILABLE_USERS_CACHE_KEY);
    return raw ? JSON.parse(raw) as AvailableUsersByRole : SEEDED_AVAILABLE_USERS;
  } catch {
    return SEEDED_AVAILABLE_USERS;
  }
}

export function setCachedAvailableUsers(users: AvailableUsersByRole) {
  try {
    localStorage.setItem(AVAILABLE_USERS_CACHE_KEY, JSON.stringify(users));
  } catch {
    // Local storage can fail in private mode; the network result still works.
  }
}

export function invalidateAvailableUsersCache() {
  try {
    localStorage.removeItem(AVAILABLE_USERS_CACHE_KEY);
  } catch {
    // Ignore storage failures.
  }
};
