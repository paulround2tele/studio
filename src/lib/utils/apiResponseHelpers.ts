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

// Legacy envelope utilities were completely removed (extractResponseData, etc.).
// Any attempt to reintroduce them should fail drift tests / spectral rules.