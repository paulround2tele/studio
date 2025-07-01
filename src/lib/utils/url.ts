/**
 * URL construction utilities for handling both relative and absolute base URLs
 * Fixes "Failed to construct 'URL': Invalid URL" errors when using relative URLs
 */

/**
 * Safely construct URL handling both relative and absolute base URLs
 * @param baseUrl - The base URL (can be relative like '/api/v2' or absolute like 'http://localhost:8080')
 * @param path - The path to append (like '/auth/login')
 * @returns A properly constructed URL object
 */
export function constructApiUrl(baseUrl: string, path: string): URL {
  const fullPath = `${baseUrl}${path}`;
  
  if (baseUrl.startsWith('http')) {
    // Absolute URL - use directly
    return new URL(fullPath);
  }
  
  // For relative URLs, use current origin
  const origin = getCurrentOrigin();
  return new URL(fullPath, origin);
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