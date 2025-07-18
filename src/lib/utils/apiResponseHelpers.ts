/**
 * Frontend API Response Helpers
 * Centralized utilities for handling the unified backend envelope format
 * { success: boolean, data: T, error: string | null, requestId: string }
 *
 * BULK-ONLY STRATEGY: All responses must use unified envelope format
 */

import type { ApiResponse } from '@/lib/types';

/**
 * Extract data from unified backend envelope format
 * BULK-ONLY STRATEGY: Handles only unified envelope format with optional Axios wrapper
 */
export function extractResponseData<T>(response: unknown): T | null {
  if (!response || typeof response !== 'object') {
    return null;
  }

  let apiResponse = response as any;
  
  // Handle Axios wrapper if present
  if ('status' in response && 'data' in response && typeof response.status === 'number') {
    const httpStatus = response.status as number;
    if (httpStatus >= 200 && httpStatus < 300) {
      apiResponse = (response as any).data;
    } else {
      throw new Error(`HTTP error status: ${httpStatus}`);
    }
  }
  
  // BULK-ONLY STRATEGY: Only handle unified envelope format
  if (apiResponse && typeof apiResponse === 'object' && 'success' in apiResponse && 'data' in apiResponse) {
    if (apiResponse.success === true) {
      return apiResponse.data as T;
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

  let apiResponse = response as any;
  
  // Handle Axios wrapper
  if ('status' in response && 'data' in response && typeof response.status === 'number') {
    const httpStatus = response.status as number;
    if (httpStatus < 200 || httpStatus >= 300) {
      return false;
    }
    apiResponse = (response as any).data;
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

  let apiResponse = response as any;
  
  // Handle Axios wrapper
  if ('status' in response && 'data' in response && typeof response.status === 'number') {
    const httpStatus = response.status as number;
    if (httpStatus < 200 || httpStatus >= 300) {
      return `HTTP error: ${httpStatus}`;
    }
    apiResponse = (response as any).data;
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
export function toApiResponse<T>(response: unknown, defaultErrorMessage: string = 'Unknown error'): ApiResponse<T> {
  const requestId = globalThis.crypto?.randomUUID?.() || Math.random().toString(36);
  
  try {
    if (isResponseSuccess(response)) {
      const data = extractResponseData<T>(response);
      return {
        success: true,
        data: data!,
        error: null,
        requestId
      };
    } else {
      const error = getResponseError(response);
      return {
        success: false,
        data: undefined as any,
        error: error || defaultErrorMessage,
        requestId
      };
    }
  } catch (error) {
    return {
      success: false,
      data: undefined as any,
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
    const errorObj = error as any;
    
    // Handle axios error
    if (errorObj.response?.data) {
      const responseError = getResponseError(errorObj.response);
      if (responseError) {
        throw new Error(responseError);
      }
    }
    
    // Handle unified envelope error
    if ('error' in errorObj && typeof errorObj.error === 'string') {
      throw new Error(errorObj.error);
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
): Promise<ApiResponse<T>> {
  try {
    const response = await apiCall();
    return toApiResponse<T>(response);
  } catch (error) {
    console.error(`[ApiResponseHelpers] ${context} failed:`, error);
    
    // SIMPLIFIED: All errors are handled the same way
    // Backend middleware handles authentication redirects
    return {
      success: false,
      data: undefined as any,
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
): ApiResponse<T[]> {
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
    error: errors.length > 0 ? errors.join('; ') : null,
    requestId
  };
}