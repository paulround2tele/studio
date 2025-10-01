/**
 * Frontend API Response Helpers
 * Post-migration utilities for handling direct API responses (no envelopes)
 * 
 * Note: Envelope extraction utilities have been removed as part of API contract modernization.
 * All 2xx responses now return direct payloads without envelope wrappers.
 */

// ===================================================================
// DIRECT RESPONSE HANDLING (Post-Envelope Migration)
// ===================================================================

/**
 * Extract error message from Axios error response
 */
export function getAxiosErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as any;
    if (axiosError.response?.data?.error) {
      return axiosError.response.data.error;
    }
    if (axiosError.response?.statusText) {
      return `HTTP ${axiosError.response.status}: ${axiosError.response.statusText}`;
    }
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'Unknown error occurred';
}

/**
 * Handle API errors consistently for direct response format
 */
export function handleApiError(error: unknown, context: string = 'API call'): never {
  console.error(`[ApiResponseHelpers] ${context} failed:`, error);
  const message = getAxiosErrorMessage(error);
  throw new Error(`${context}: ${message}`);
}

// ===================================================================
// LEGACY ENVELOPE UTILITIES (ARCHIVED - NO LONGER USED)
// ===================================================================

// The following functions were used during the envelope-based API era
// and are kept for reference but should not be used in new code.
// All new API endpoints return direct payloads.

/*
// ARCHIVED: extractResponseData - no longer needed for direct responses
export function extractResponseData<T>(response: unknown): T | null {
  // This function was used to unwrap SuccessEnvelope responses
  // All 2xx responses now return direct payloads
  console.warn('[DEPRECATED] extractResponseData is no longer needed - API returns direct payloads');
  return null;
}
*/