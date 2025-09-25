/**
 * Temporary normalizer – remove by Phase D.
 */
export function normalizeResponse<T>(raw: unknown): T {
  if (raw == null) throw new Error('Empty response');
  const r: any = raw;
  if (Array.isArray(r) || (typeof r === 'object' && !('success' in r) && !('error' in r))) {
    return r as T;
  }
  if (r.success === true && 'data' in r) {
    if (r.data && r.data.success === true && 'data' in r.data) {
      if (process.env.NODE_ENV !== 'production') console.warn('[contract] double-wrapped response detected – unwrapping');
      return r.data.data as T;
    }
    return r.data as T;
  }
  if (r.success === true && !('data' in r)) {
    return {} as T;
  }
  throw new Error('[contract] Unexpected response shape');
}
