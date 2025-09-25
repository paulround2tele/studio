/**
 * Frontend API Response Helpers
 * Centralized utilities for handling the unified backend envelope format
 * { success: boolean, data: T, error: ErrorInfo | null, requestId: string }
 *
 * BULK-ONLY STRATEGY: All responses must use unified envelope format
 */

// Using internal envelope types; do not depend on missing legacy ErrorInfo model

// ===================================================================
// PROPER TYPESCRIPT INTERFACES FOR API RESPONSE HANDLING
// ===================================================================

/**
 * Backend envelope format for all API responses
 */
export interface BackendEnvelope<T = unknown> {
  success: boolean;
  data?: T;
  error?: string | null;
  requestId?: string;
  message?: string;
}

/**
 * Axios response wrapper containing backend envelope
 */
export interface AxiosResponseWrapper<T = unknown> {
  status: number;
  statusText: string;
  data: BackendEnvelope<T>;
  headers: Record<string, any>;
}

/**
 * Type guard to check if response has Axios structure
 */
function isAxiosResponse<T>(response: unknown): response is AxiosResponseWrapper<T> {
  return !!(
    response &&
    typeof response === 'object' &&
    'status' in response &&
    'data' in response &&
    typeof (response as any).status === 'number'
  );
}

/**
 * Type guard to check if response has backend envelope structure
 */
function isBackendEnvelope<T>(response: unknown): response is BackendEnvelope<T> {
  return !!(
    response &&
    typeof response === 'object' &&
    'success' in response &&
    typeof (response as any).success === 'boolean'
  );
}

/**
 * Extract data from unified backend envelope format
 * BULK-ONLY STRATEGY: Handles only unified envelope format with optional Axios wrapper
 */
export function extractResponseData<T>(response: unknown): T | null {
  // 🐛 DEBUG: Logging type safety validation - apiResponseHelpers.ts:15
  console.log('[DEBUG] extractResponseData called with response type:', typeof response);
  
  if (!response || typeof response !== 'object') {
    console.log('[DEBUG] Invalid response format - not an object');
    return null;
  }

  let apiResponse: BackendEnvelope<T>;
  
  // ✅ FIXED: Using proper type guards instead of 'any' casting
  if (isAxiosResponse<T>(response)) {
    console.log('[DEBUG] Detected Axios response wrapper');
    const httpStatus = response.status;
    if (httpStatus >= 200 && httpStatus < 300) {
      apiResponse = response.data;
    } else {
      throw new Error(`HTTP error status: ${httpStatus}`);
    }
  } else if (isBackendEnvelope<T>(response)) {
    console.log('[DEBUG] Detected direct backend envelope');
    apiResponse = response;
  } else {
    console.log('[DEBUG] Unknown response format');
    throw new Error('Invalid response format: missing unified envelope structure');
  }
  
  // BULK-ONLY STRATEGY: Only handle unified envelope format
  if (apiResponse && typeof apiResponse === 'object' && 'success' in apiResponse && 'data' in apiResponse) {
    if (apiResponse.success === true) {
      // 🔥 CRITICAL FIX: Handle double-wrapped backend envelope structure
      // Backend returns: { success, data: { success, data: ACTUAL_DATA } }
      // Frontend needs: ACTUAL_DATA (could be array, object, etc.)
      const extractedData = apiResponse.data;
      
      // Check if this is a double-wrapped envelope (data contains another envelope)
      if (extractedData && typeof extractedData === 'object' &&
          'success' in extractedData && 'data' in extractedData &&
          (extractedData as any).success === true) {
        console.log('[DEBUG] Detected double-wrapped envelope, extracting nested data');
        return (extractedData as any).data as T;
      }
      
      // Single envelope case (normal)
      return extractedData as T;
    } else {
      throw new Error(apiResponse.error || 'Unknown API error');
    }
  }
  
  // BULK-ONLY STRATEGY: No legacy fallbacks - all responses must use unified envelope format
  throw new Error('Invalid response format: missing unified envelope structure');
}

/**
 * Check if response indicates success
 * BULK-ONLY STRATEGY: Only handles unified envelope format
 */
export function isResponseSuccess(response: unknown): boolean {
  if (!response || typeof response !== 'object') {
    return false;
  }

  let apiResponse: BackendEnvelope;
  
  // ✅ FIXED: Using proper type guards instead of 'any' casting
  if (isAxiosResponse(response)) {
    const httpStatus = response.status;
    if (httpStatus < 200 || httpStatus >= 300) {
      return false;
    }
    apiResponse = response.data;
  } else if (isBackendEnvelope(response)) {
    apiResponse = response;
  } else {
    return false;
  }
  
  // BULK-ONLY STRATEGY: Only check unified envelope format
  if (apiResponse && typeof apiResponse === 'object' && 'success' in apiResponse) {
    return apiResponse.success === true;
  }
  
  // BULK-ONLY STRATEGY: No legacy fallbacks - all responses must use unified envelope format
  return false;
}

/**
 * Extract error message from response
 * BULK-ONLY STRATEGY: Only handles unified envelope format
 */
export function getResponseError(response: unknown): string | null {
  if (!response || typeof response !== 'object') {
    return 'Invalid response format - missing unified envelope structure';
  }

  let apiResponse: BackendEnvelope;
  
  // ✅ FIXED: Using proper type guards instead of 'any' casting
  if (isAxiosResponse(response)) {
    const httpStatus = response.status;
    if (httpStatus < 200 || httpStatus >= 300) {
      return `HTTP error: ${httpStatus}`;
    }
    apiResponse = response.data;
  } else if (isBackendEnvelope(response)) {
    apiResponse = response;
  } else {
    return 'Invalid response format - missing unified envelope structure';
  }
  
  // BULK-ONLY STRATEGY: Only check unified envelope format
  if (apiResponse && typeof apiResponse === 'object' && 'success' in apiResponse) {
    if (apiResponse.success === false) {
      return apiResponse.error || 'Unknown API error';
    }
    return null; // Success case
  }
  
  // BULK-ONLY STRATEGY: Missing envelope structure is an error
  return 'Invalid response format - missing unified envelope structure';
}

/**
 * Transform any response to standardized ApiResponse format
 */
export function toApiResponse<T>(response: unknown, defaultErrorMessage: string = 'Unknown error'): { success: boolean; data?: T; error?: string; requestId: string } {
  const requestId = globalThis.crypto?.randomUUID?.() || Math.random().toString(36);
  
  try {
    if (isResponseSuccess(response)) {
      const data = extractResponseData<T>(response);
      return {
        success: true,
        data: data!,
        error: undefined,
        requestId
      };
    } else {
      const error = getResponseError(response);
      return {
        success: false,
        data: undefined as T,
        error: error || defaultErrorMessage,
        requestId
      };
    }
  } catch (error) {
    return {
      success: false,
      data: undefined as T,
      error: error instanceof Error ? error.message : defaultErrorMessage,
      requestId
    };
  }
}

/**
 * Handle API errors consistently
 */
export function handleApiError(error: unknown, context: string = 'API call'): never {
  console.error(`[ApiResponseHelpers] ${context} failed:`, error);
  
  if (error instanceof Error) {
    throw error;
  }
  
  if (typeof error === 'string') {
    throw new Error(error);
  }
  
  if (error && typeof error === 'object') {
    // ✅ FIXED: Using proper type guards instead of 'any' casting
    
    // Handle axios error
    if ('response' in error && error.response) {
      const responseError = getResponseError(error.response);
      if (responseError) {
        throw new Error(responseError);
      }
    }
    
    // Handle unified envelope error
    if ('error' in error && typeof (error as { error: unknown }).error === 'string') {
      throw new Error((error as { error: string }).error);
    }
  }
  
  throw new Error(`${context} failed with unknown error`);
}

/**
 * Utility for safer API calls with unified response handling
 * SIMPLIFIED: Backend handles all authentication redirects
 */
export async function safeApiCall<T>(
  apiCall: () => Promise<unknown>,
  context: string = 'API call'
): Promise<{ success: boolean; data?: T; error?: string; requestId: string }> {
  try {
    const response = await apiCall();
    return toApiResponse<T>(response);
  } catch (error) {
    console.error(`[ApiResponseHelpers] ${context} failed:`, error);
    
    // SIMPLIFIED: All errors are handled the same way
    // Backend middleware handles authentication redirects
    return {
      success: false,
      data: undefined as T,
      error: error instanceof Error ? error.message : `${context} failed`,
      requestId: globalThis.crypto?.randomUUID?.() || Math.random().toString(36)
    };
  }
}

/**
 * Batch process multiple API responses
 */
export function processBatchResponses<T>(
  responses: unknown[],
  context: string = 'Batch API call'
): { success: boolean; data?: T[]; error?: string; requestId: string } {
  const requestId = globalThis.crypto?.randomUUID?.() || Math.random().toString(36);
  const results: T[] = [];
  const errors: string[] = [];
  
  for (let i = 0; i < responses.length; i++) {
    try {
      if (isResponseSuccess(responses[i])) {
        const data = extractResponseData<T>(responses[i]);
        if (data !== null) {
          results.push(data);
        }
      } else {
        const error = getResponseError(responses[i]);
        errors.push(`Item ${i}: ${error || 'Unknown error'}`);
      }
    } catch (error) {
      errors.push(`Item ${i}: ${error instanceof Error ? error.message : 'Processing error'}`);
    }
  }
  
  if (errors.length > 0) {
    console.warn(`[ApiResponseHelpers] ${context} had ${errors.length} errors:`, errors);
  }
  
  return {
    success: errors.length === 0,
    data: results,
    error: errors.length > 0 ? errors.join('; ') : undefined,
    requestId
  };
}