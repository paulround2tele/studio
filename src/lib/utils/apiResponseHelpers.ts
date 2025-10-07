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
    const response = error.response;
    if (response && typeof response === 'object') {
      // Check for error in response data
      if ('data' in response && response.data && typeof response.data === 'object' && 'error' in response.data) {
        return String(response.data.error);
      }
      // Check for status text
      if ('statusText' in response && 'status' in response) {
        return `HTTP ${response.status}: ${response.statusText}`;
      }
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