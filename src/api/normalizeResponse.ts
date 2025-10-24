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
interface SuccessEnvelope<D = unknown> { success: true; data?: D; error?: never }
interface _ErrorEnvelope { success: false; error: unknown }

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSuccessEnvelope(value: unknown): value is SuccessEnvelope {
  return isObject(value) && value.success === true;
}

export function normalizeResponse<T>(raw: unknown): T {
  if (raw == null) throw new Error('Empty response');

  // Pattern 1: Direct resource (migrated endpoints) – object/array without envelope markers
  if (
    Array.isArray(raw) ||
    (isObject(raw) && !('success' in raw) && !('error' in raw))
  ) {
    return raw as T; // Caller supplied T expectation; upstream generator defines shape
  }

  if (isSuccessEnvelope(raw)) {
    const data = raw.data;
    // Double-wrapped transitional shape
    if (isSuccessEnvelope(data)) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[contract] double-wrapped response detected – unwrapping');
      }
      return (data.data ?? ({} as unknown)) as T;
    }
    if (data !== undefined) return data as T;
    // Legacy success without data (health endpoints)
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
  return !!(
    response &&
    (Array.isArray(response) || (isObject(response) && !('success' in response) && !('error' in response)))
  );
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
