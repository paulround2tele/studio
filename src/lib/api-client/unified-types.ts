/* 
 * Professional API Response Types
 * 
 * This file defines the CORRECT TypeScript interfaces that match our unified
 * backend APIResponse architecture. We don't rely on the garbage auto-generated
 * types because the OpenAPI generator is clearly incompetent.
 */

/**
 * Standard unified API response envelope used by ALL endpoints
 * This matches the APIResponse struct in backend/internal/api/response_types.go
 */
export interface APIResponse<T = any> {
  /** Indicates if the request was successful */
  success: boolean;
  /** Response data (only present on success) */
  data?: T;
  /** Error information (only present on failure) */
  error?: ErrorInfo;
  /** Optional metadata */
  metadata?: Metadata;
  /** Unique request identifier for tracing */
  requestId: string;
}

/**
 * Comprehensive error information structure
 */
export interface ErrorInfo {
  /** Primary error code */
  code: string;
  /** Primary error message */
  message: string;
  /** Detailed error information */
  details?: ErrorDetail[];
  /** When the error occurred */
  timestamp: string;
  /** API path that generated the error */
  path?: string;
}

/**
 * Detailed error information
 */
export interface ErrorDetail {
  /** Field or parameter that caused the error */
  field?: string;
  /** Specific error message for this detail */
  message: string;
  /** Additional context data */
  context?: Record<string, any>;
}

/**
 * Optional response metadata
 */
export interface Metadata {
  /** Pagination info */
  page?: PageInfo;
  /** Rate limiting info */
  rateLimit?: RateLimitInfo;
  /** Processing time info */
  processing?: ProcessingInfo;
  /** Additional metadata */
  extra?: Record<string, any>;
}

/**
 * Pagination information
 */
export interface PageInfo {
  current: number;
  size: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Rate limiting information
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: string;
}

/**
 * Processing information
 */
export interface ProcessingInfo {
  /** Processing time in milliseconds */
  timeMs: number;
  /** Server that processed the request */
  server?: string;
  /** Additional processing metadata */
  metadata?: Record<string, any>;
}

/* ============================================
 * SPECIFIC RESPONSE DATA TYPES
 * ============================================ */

/**
 * User authentication session data
 */
export interface SessionData {
  user: UserPublicData;
  token: string;
  refreshToken?: string;
  expiresAt: string;
}

/**
 * Public user information
 */
export interface UserPublicData {
  id: string;
  username: string;
  email: string;
  isActive: boolean;
}

/**
 * Simple success message
 */
export interface SuccessMessage {
  message: string;
}

/**
 * Session refresh data
 */
export interface SessionRefreshData {
  message?: string;
  expiresAt: string;
}

/* ============================================
 * TYPE-SAFE API RESPONSE HELPERS
 * ============================================ */

/**
 * Type guard to check if response was successful
 */
export function isSuccessResponse<T>(response: APIResponse<T>): response is APIResponse<T> & { success: true; data: T } {
  return response.success === true && response.data !== undefined;
}

/**
 * Type guard to check if response was an error
 */
export function isErrorResponse<T>(response: APIResponse<T>): response is APIResponse<T> & { success: false; error: ErrorInfo } {
  return response.success === false && response.error !== undefined;
}

/**
 * Extract data from successful response, throw on error
 */
export function extractData<T>(response: APIResponse<T>): T {
  if (isSuccessResponse(response)) {
    return response.data;
  }
  
  const error = isErrorResponse(response) 
    ? `API Error: ${response.error.message}` 
    : 'Unknown API error';
  
  throw new Error(error);
}
