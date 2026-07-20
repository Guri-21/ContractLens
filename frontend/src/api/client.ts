export const API_BASE_URL = 'http://localhost:8000';

/**
 * Single in-flight refresh promise so that a burst of parallel 401s triggers
 * only ONE call to /api/auth/refresh (avoids a refresh stampede).
 */
let refreshPromise: Promise<string | null> | null = null;

function clearAuthAndRedirect(): void {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('role');
    localStorage.removeItem('email');
  } catch {
    // localStorage may be unavailable in private mode; redirect still works.
  }
  // Hard redirect so all in-memory state (caches, React tree) is reset cleanly.
  if (window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem('token', data.access_token);
      if (data.role) localStorage.setItem('role', data.role);
      if (data.email) localStorage.setItem('email', data.email);
      return data.access_token as string;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * fetch() wrapper that attaches the bearer token and, on a 401, transparently
 * refreshes the access token once and retries the original request. If refresh
 * fails, it clears auth and redirects to /login instead of silently 401-ing.
 */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('token');
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let res = await fetch(input, { ...init, headers });
  if (res.status !== 401) return res;

  // 401 — attempt a single shared refresh, then retry once.
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  const newToken = await refreshPromise;

  if (!newToken) {
    clearAuthAndRedirect();
    return res; // caller sees the original 401
  }

  const retryHeaders = new Headers(init.headers || {});
  retryHeaders.set('Authorization', `Bearer ${newToken}`);
  res = await fetch(input, { ...init, headers: retryHeaders });
  if (res.status === 401) {
    clearAuthAndRedirect();
  }
  return res;
}
