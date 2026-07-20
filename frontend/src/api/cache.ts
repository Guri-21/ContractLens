type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const DEFAULT_TTL_MS = 120_000;
const SETTINGS_KEY = 'contractlens-platform-settings';
const memoryCache = new Map<string, CacheEntry<unknown>>();
const inflightRequests = new Map<string, Promise<unknown>>();

export async function cachedRequest<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: { ttlMs?: number; force?: boolean } = {},
): Promise<T> {
  const scopedKey = scopedCacheKey(key);
  const cacheConfig = readCacheConfig();
  const now = Date.now();
  const cached = memoryCache.get(scopedKey) as CacheEntry<T> | undefined;

  if (!cacheConfig.enabled || options.force) {
    const value = await fetcher();
    if (cacheConfig.enabled) {
      memoryCache.set(scopedKey, {
        value,
        expiresAt: Date.now() + (options.ttlMs ?? cacheConfig.ttlMs),
      });
    }
    return value;
  }

  // Fresh hit — return immediately
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  // Stale-while-revalidate: return stale data immediately, refresh in background
  if (cached && !inflightRequests.has(scopedKey)) {
    const ttl = options.ttlMs ?? cacheConfig.ttlMs;
    const revalidate = fetcher()
      .then((value) => {
        memoryCache.set(scopedKey, { value, expiresAt: Date.now() + ttl });
        return value;
      })
      .finally(() => inflightRequests.delete(scopedKey));
    inflightRequests.set(scopedKey, revalidate);
    return cached.value;
  }

  if (inflightRequests.has(scopedKey)) {
    return inflightRequests.get(scopedKey) as Promise<T>;
  }

  const request = fetcher()
    .then((value) => {
      memoryCache.set(scopedKey, {
        value,
        expiresAt: Date.now() + (options.ttlMs ?? cacheConfig.ttlMs),
      });
      return value;
    })
    .finally(() => {
      inflightRequests.delete(scopedKey);
    });

  inflightRequests.set(scopedKey, request);
  return request;
}

/**
 * Synchronous read of whatever is currently cached for `key`, or undefined.
 * Returns the value even if it is stale — callers use this to render instantly
 * on mount while cachedRequest() refreshes in the background. No network.
 */
export function peekCache<T>(key: string): T | undefined {
  const entry = memoryCache.get(scopedCacheKey(key)) as CacheEntry<T> | undefined;
  return entry?.value;
}

export function invalidateApiCache(prefix?: string) {
  const scopedPrefix = prefix ? scopedCacheKey(prefix) : undefined;
  for (const key of memoryCache.keys()) {
    if (!scopedPrefix || key.startsWith(scopedPrefix)) {
      memoryCache.delete(key);
    }
  }
  for (const key of inflightRequests.keys()) {
    if (!scopedPrefix || key.startsWith(scopedPrefix)) {
      inflightRequests.delete(key);
    }
  }
}

export function invalidateAdminDataCache() {
  invalidateApiCache('documents');
  invalidateApiCache('users');
  invalidateApiCache('admin-analytics');
  invalidateApiCache('audit');
}

export function clearApiCache() {
  memoryCache.clear();
  inflightRequests.clear();
}

function scopedCacheKey(key: string): string {
  let owner = 'anonymous';
  try {
    owner = localStorage.getItem('email') || owner;
  } catch {
    owner = 'anonymous';
  }
  return `${owner}:${key}`;
}

function readCacheConfig(): { enabled: boolean; ttlMs: number } {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { enabled: true, ttlMs: DEFAULT_TTL_MS };
    const settings = JSON.parse(raw);
    const ttlSeconds = Number(settings.cacheTtlSeconds);
    return {
      enabled: settings.cacheEnabled !== false,
      ttlMs: Number.isFinite(ttlSeconds) ? Math.max(5, ttlSeconds) * 1000 : DEFAULT_TTL_MS,
    };
  } catch {
    return { enabled: true, ttlMs: DEFAULT_TTL_MS };
  }
}
