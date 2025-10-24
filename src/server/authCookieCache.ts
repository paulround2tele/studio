type CacheEntry = { value: boolean; expiresAt: number };

type _CacheStore = {
  get: (key: string) => CacheEntry | undefined;
  set: (key: string, entry: CacheEntry) => void;
};

declare global {
  var __authCookieCache: Map<string, CacheEntry> | undefined;
}

const DEFAULT_TTL_MS = 2000; // 2s to smooth over rapid reloads without stale auth

function getStore(): Map<string, CacheEntry> {
  if (!globalThis.__authCookieCache) {
    globalThis.__authCookieCache = new Map();
  }
  return globalThis.__authCookieCache;
}

export function getCachedHasSession(cookieValue: string | undefined, ttlMs = DEFAULT_TTL_MS): boolean | null {
  const key = cookieValue || '__no_cookie__';
  const store = getStore();
  const now = Date.now();
  const entry = store.get(key);
  if (entry && entry.expiresAt > now) {
    return entry.value;
  }
  return null;
}

export function setCachedHasSession(cookieValue: string | undefined, hasSession: boolean, ttlMs = DEFAULT_TTL_MS): void {
  const key = cookieValue || '__no_cookie__';
  const store = getStore();
  store.set(key, { value: hasSession, expiresAt: Date.now() + ttlMs });
}
