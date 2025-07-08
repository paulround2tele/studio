/**
 * Dynamic URL construction with intelligent backend auto-detection
 * Now uses centralized backend detection service to prevent 429 rate limiting
 */

import { getBackendUrl as getCentralizedBackendUrl } from '@/lib/services/backendDetection';

/**
 * Auto-detect backend URL based on environment and availability
 * @deprecated Use centralized backend detection service instead
 */
export async function detectBackendUrl(): Promise<string> {
  console.warn('[DEPRECATED] detectBackendUrl() is deprecated. Use centralized backend detection service.');
  return await getCentralizedBackendUrl();
}

/**
 * Get backend URL with smart detection
 * Now uses centralized service to prevent request flooding
 */
export async function getBackendUrl(): Promise<string> {
  return await getCentralizedBackendUrl();
}

/**
 * Check if a backend is available at the given URL
 */
export async function pingBackend(baseUrl: string): Promise<boolean> {
  try {
    const healthUrl = `${baseUrl}/health`;
    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
      headers: { 'Accept': 'application/json' }
    });
    
    return response.ok;
  } catch (_error) {
    return false;
  }
}

/**
 * Fallback URL construction when auto-detection fails
 */
export function getFallbackUrl(path: string): string {
  if (typeof window !== 'undefined') {
    // In browser, try same origin first
    return `${window.location.origin}${path}`;
  }
  
  // In SSR, assume standard development setup
  return process.env.NODE_ENV === 'development' 
    ? `http://localhost:8080${path}`
    : path; // Relative URL for production
}

/**
 * Safely construct URL handling both relative and absolute base URLs
 * @param baseUrl - The base URL (can be relative like '/api/v2' or absolute like 'http://localhost:8080')
 * @param path - The path to append (like '/auth/login')
 * @returns A properly constructed URL object
 */
export function constructApiUrl(baseUrl: string, path: string): URL {
  const fullPath = `${baseUrl}${path}`;
  
  if (baseUrl.startsWith('http')) {
    // Absolute URL - use directly (development with explicit backend URL)
    return new URL(fullPath);
  }
  
  // Relative URL - use current origin (production where frontend/backend same origin)
  const origin = typeof window !== 'undefined'
    ? window.location.origin
    : 'http://localhost:3000'; // Fallback for SSR
    
  return new URL(fullPath, origin);
}

/**
 * Detect if we're in development mode with separate frontend/backend servers
 */
export function isDevelopmentMode(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Get current origin safely for both client and server environments
 * @param request - Optional request object for server-side origin detection
 * @returns The current origin URL
 */
export function getCurrentOrigin(request?: Request): string {
  // Client-side: use window.location.origin
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Server-side: extract from request or use default
  if (request) {
    try {
      return new URL(request.url).origin;
    } catch {
      // Fallback if request.url is malformed
      return 'http://localhost:3000';
    }
  }
  
  // Ultimate fallback for SSR without request
  return 'http://localhost:3000';
}

/**
 * Safely construct a URL for Next.js middleware redirects
 * Handles both localhost and external domains (like ngrok)
 * @param path - The path to redirect to (like '/login')
 * @param request - The NextRequest object
 * @returns A properly constructed URL for redirects
 */
export function constructRedirectUrl(path: string, request: { url: string; nextUrl?: { origin?: string } }): URL {
  // Try to use nextUrl.origin first (most reliable for Next.js)
  if (request.nextUrl?.origin) {
    return new URL(path, request.nextUrl.origin);
  }
  
  // Fallback to extracting origin from request.url
  try {
    const requestUrl = new URL(request.url);
    return new URL(path, requestUrl.origin);
  } catch {
    // Ultimate fallback
    return new URL(path, 'http://localhost:3000');
  }
}

/**
 * Check if a URL is absolute (starts with http/https)
 * @param url - The URL to check
 * @returns True if the URL is absolute
 */
export function isAbsoluteUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Validate and normalize a base URL
 * @param baseUrl - The base URL to validate
 * @returns The normalized base URL
 */
export function normalizeBaseUrl(baseUrl: string): string {
  // Remove trailing slash for consistency
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}