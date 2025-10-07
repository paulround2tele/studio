/**
 * Type-safe error handling utilities
 * 
 * Demonstrates proper typing to replace `any` usage in error handling
 */
import type { ApiError, ErrorEnvelope } from '../api-client/models';

// Minimal axios-style shape to avoid any casts
interface AxiosLikeError<E = unknown> {
  response?: {
    data?: E;
    status?: number;
  };
}

/**
 * Type guard to check if an error is an API error
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'timestamp' in error
  );
}

/**
 * Type guard to check if an error is an error envelope
 */
export function isErrorEnvelope(error: unknown): error is ErrorEnvelope {
  return (
    typeof error === 'object' &&
    error !== null &&
    'success' in error &&
    'error' in error &&
    'requestId' in error &&
    (error as ErrorEnvelope).success === false
  );
}

/**
 * Extract error message from various error types without using `any`
 * 
 * @example
 * // Avoid unsafe casts like direct property drilling through unknown error objects
 * const message = extractErrorMessage(error);
 */
export function extractErrorMessage(error: unknown): string {
  // Check if it's a string
  if (typeof error === 'string') {
    return error;
  }
  
  // Check if it's an ErrorEnvelope
  if (isErrorEnvelope(error)) {
    return error.error.message;
  }
  
  // Check if it's an ApiError directly
  if (isApiError(error)) {
    return error.message;
  }
  
  // Check if it's an axios error with our API error structure
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in (error as AxiosLikeError) &&
    typeof (error as AxiosLikeError).response === 'object' &&
    (error as AxiosLikeError).response?.data !== undefined
  ) {
    const responseData = (error as AxiosLikeError).response?.data as unknown;

    if (isErrorEnvelope(responseData)) {
      return responseData.error.message;
    }

    if (isApiError(responseData)) {
      return responseData.message;
    }

    // Narrow generic objects with message
    if (
      typeof responseData === 'object' &&
      responseData !== null &&
      'message' in responseData &&
      typeof (responseData as { message?: unknown }).message === 'string'
    ) {
      return (responseData as { message: string }).message;
    }

    // Nested data.message pattern
    if (
      typeof responseData === 'object' &&
      responseData !== null &&
      'data' in responseData &&
      typeof (responseData as { data?: unknown }).data === 'object' &&
      (responseData as { data?: { message?: unknown } }).data !== null &&
      typeof ((responseData as { data: { message?: unknown } }).data.message) === 'string'
    ) {
      return ((responseData as { data: { message: string } }).data.message);
    }
  }
  
  // Check for basic error objects
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Error).message === 'string'
  ) {
    return (error as Error).message;
  }
  
  return 'An unknown error occurred';
}

/**
 * Example of how to refactor the campaign edit page error handling
 * 
 * Before:
 * const description = extractErrorMessage(error) || 'Campaign data could not be loaded or found.';
 * 
 * After:
 * const description = extractErrorMessage(error) || 'Campaign data could not be loaded or found.';
 */