/**
 * Temporary normalizer for API Contract Migration Plan Phase A-C
 * 
 * This adapter handles the transition period where some endpoints return
 * direct resources (migrated) while others still return SuccessEnvelope.
 * 
 * DELETION DEADLINE: Day 15 (enforced by CI)
 */

/**
 * Normalize any response to extract the actual data
 * @param raw Raw response from API
 * @returns Extracted data or throws error
 */
export function normalizeResponse<T>(raw: unknown): T {
  if (raw == null) throw new Error('Empty response');
  
  const r: any = raw;
  
  // Pattern 1: Direct resource (migrated endpoints)
  if (Array.isArray(r) || (typeof r === 'object' && !('success' in r) && !('error' in r))) {
    return r as T;
  }
  
  // Pattern 2: SuccessEnvelope (legacy endpoints during transition)
  if (r.success === true && 'data' in r) {
    // Intentionally handle double-wrapped envelope (known transitional state during migration)
    if (r.data && r.data.success === true && 'data' in r.data) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[contract] double-wrapped response detected – unwrapping');
      }
      return r.data.data as T;
    }
    return r.data as T;
  }
  
  // Pattern 3: Legacy success without data (health endpoints pre-migration)
  if (r.success === true && !('data' in r)) {
    return {} as T;
  }
  
  throw new Error('[contract] Unexpected response shape');
}

/**
 * Check if response has been migrated to direct format
 * @param response Raw response
 * @returns true if direct resource, false if still enveloped
 */
export function isDirectResponse(response: unknown): boolean {
  if (!response || typeof response !== 'object') return false;
  
  const r: any = response;
  return Array.isArray(r) || (!('success' in r) && !('error' in r));
}

/**
 * Get response data with transition awareness
 * @param response Raw response 
 * @returns Data or null on failure
 */
export function getTransitionData<T>(response: unknown): T | null {
  try {
    return normalizeResponse<T>(response);
  } catch (error) {
    console.warn('[normalizeResponse] Failed to extract data:', error);
    return null;
  }
}
