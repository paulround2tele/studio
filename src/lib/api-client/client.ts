import type { paths, components } from './types';

// Simplified backend URL detection using environment variables
const getBackendUrl = (): string => {
  // If explicitly configured, use it
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (configured && configured.trim()) {
    return configured;
  }
  
  // Auto-detect based on current location (simplified from environment.ts logic)
  if (typeof window !== 'undefined') {
    const { hostname, port, protocol } = window.location;
    
    // If frontend is on port 3000 (Next.js dev), backend is on 8080
    if (port === '3000') {
      return `${protocol}//${hostname}:8080`;
    }
    
    // If localhost without specific port, use standard backend port
    if ((hostname === 'localhost' || hostname === '127.0.0.1') && (!port || port === '80')) {
      return `${protocol}//${hostname}:8080`;
    }
    
    // For production or other environments, use same origin or standard ports
    if (!port || port === '80' || port === '443') {
      return `${protocol}//${hostname}`;
    }
    
    // Fallback: assume backend is on port 8080 for development
    return `${protocol}//${hostname}:8080`;
  }
  
  // SSR fallback
  return 'http://localhost:8080';
};

const constructApiUrl = (baseUrl: string, path: string): URL => {
  const fullPath = `${baseUrl}${path}`;
  
  if (baseUrl.startsWith('http')) {
    // Absolute URL - use directly
    return new URL(fullPath);
  }
  
  // For relative URLs, use current origin
  const origin = typeof window !== 'undefined'
    ? window.location.origin
    : 'http://localhost:3000'; // Fallback for SSR
    
  return new URL(fullPath, origin);
};

// Local error serialization utility
const serializeError = (obj: unknown): string => {
  if (obj === null || obj === undefined) {
    return String(obj);
  }

  // Handle Error instances - extract non-enumerable properties
  if (obj instanceof Error) {
    const errorData: Record<string, unknown> = {
      name: obj.name,
      message: obj.message,
      stack: obj.stack,
    };
    
    // Include cause if available (modern Error objects)
    if ('cause' in obj && obj.cause !== undefined) {
      errorData.cause = obj.cause;
    }
    
    // Include any custom enumerable properties
    for (const [key, value] of Object.entries(obj)) {
      if (!(key in errorData)) {
        errorData[key] = value;
      }
    }
    
    return JSON.stringify(errorData, null, 2);
  }

  // Handle Event instances - extract relevant non-enumerable properties
  if (obj instanceof Event) {
    const eventData: Record<string, unknown> = {
      type: obj.type,
      isTrusted: obj.isTrusted,
      timeStamp: obj.timeStamp,
    };
    
    // Add target information if available
    if (obj.target) {
      eventData.target = obj.target.constructor?.name || 'Unknown';
    }
    
    return JSON.stringify(eventData, null, 2);
  }

  // Handle generic objects with circular reference protection
  try {
    const seen = new WeakSet();
    const result = JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular Reference]';
        }
        seen.add(value);
      }
      return value;
    }, 2);
    
    // If JSON.stringify returns '{}' for an object, try to extract some properties manually
    if (result === '{}' && typeof obj === 'object' && obj !== null) {
      const keys = Object.getOwnPropertyNames(obj);
      if (keys.length > 0) {
        const extractedProps: Record<string, unknown> = {};
        keys.slice(0, 10).forEach(key => { // Limit to first 10 properties
          try {
            const descriptor = Object.getOwnPropertyDescriptor(obj, key);
            if (descriptor) {
              extractedProps[key] = descriptor.value;
            }
          } catch {
            extractedProps[key] = '[Unable to access]';
          }
        });
        return JSON.stringify(extractedProps, null, 2);
      }
    }
    
    return result;
  } catch (_error) {
    // Fallback for objects that can't be serialized
    return `[Object: ${obj.constructor?.name || 'Unknown'}]`;
  }
};

// Type-safe API client using openapi-typescript generated types
type ApiPaths = paths;

// Extract operation types from paths
type GetOperationResponse<T> = T extends {
  responses: { 200: { content: { 'application/json': infer R } } }
} ? R : unknown;

type PostOperationResponse<T> = T extends {
  responses: { 200: { content: { 'application/json': infer R } } } | { 201: { content: { 'application/json': infer R } } }
} ? R : unknown;

type PutOperationResponse<T> = T extends {
  responses: { 200: { content: { 'application/json': infer R } } }
} ? R : unknown;

type DeleteOperationResponse<T> = T extends {
  responses: { 200: { content: { 'application/json': infer R } } }
} ? R : unknown;

type OperationRequestBody<T> = T extends {
  requestBody: { content: { 'application/json': infer R } }
} ? R : never;

// Enhanced request configuration
interface RequestConfig {
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export class ApiClient {
  private _detectedBackendUrl: string | null = null;
  private config: RequestConfig;

  constructor(baseUrl?: string) {
    // Store explicit baseUrl if provided
    this._detectedBackendUrl = baseUrl || null;
    
    // RATE LIMIT FIX: Enhanced configuration with proper rate limiting
    this.config = {
      timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000'),
      retryAttempts: parseInt(process.env.NEXT_PUBLIC_API_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.NEXT_PUBLIC_API_RETRY_DELAY || '2000'), // Increased base delay
    };
    
    // Only log API client configuration in debug mode
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG === 'true') {
      console.debug('API Client Configuration:', {
        providedBaseUrl: baseUrl,
        willAutoDetect: !baseUrl && !process.env.NEXT_PUBLIC_API_URL?.trim(),
        environment: process.env.NODE_ENV
      });
    }
  }
  
  /**
   * Get effective backend URL with auto-detection
   */
  private getEffectiveBackendUrl(): string {
    if (this._detectedBackendUrl === null) {
      this._detectedBackendUrl = getBackendUrl();
    }
    return this._detectedBackendUrl;
  }

  // Handle different routing structures for auth vs API routes
  private getEffectiveBaseUrl(path: string): string {
    const baseUrl = this.getEffectiveBackendUrl();
    
    // Auth routes (/auth/*) are served directly from backend root
    if (path.startsWith('/auth') || path.startsWith('/me') || path.startsWith('/change-password')) {
      return baseUrl;
    }
    
    // API routes need /api/v2 prefix if not already included
    if (baseUrl.endsWith('/api/v2')) {
      return baseUrl;
    } else {
      return `${baseUrl}/api/v2`;
    }
  }

  // Enhanced request method with retry logic and better error handling
  private async request<TResponse = unknown>(
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    options?: {
      params?: Record<string, string | number | boolean>;
      body?: unknown;
      headers?: Record<string, string>;
    }
  ): Promise<TResponse> {
    // Handle different routing structures: auth routes vs API routes
    const effectiveBaseUrl = this.getEffectiveBaseUrl(path);
    const url = constructApiUrl(effectiveBaseUrl, path);
    
    // Add query parameters
    if (options?.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    let lastError: Error | null = null;

    // Retry logic with exponential backoff
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        // Only log detailed request info in debug mode
        if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG === 'true') {
          console.debug('🚀 API_CLIENT_DEBUG - Making request attempt:');
          console.debug(`  Attempt: ${attempt}, Method: ${method}, URL: ${url.toString()}`);
          console.debug(`  BaseURL: ${effectiveBaseUrl}, Path: ${path}, HasBody: ${!!options?.body}`);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url.toString(), {
          method,
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest', // Required for session-based CSRF protection
            ...options?.headers,
          },
          body: options?.body ? JSON.stringify(options.body) : undefined,
          credentials: 'include', // Include cookies for session auth
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG === 'true') {
          console.debug('API_CLIENT_DEBUG - Response received:');
          console.debug(`  Attempt: ${attempt}, Status: ${response.status} ${response.statusText}`);
          console.debug(`  OK: ${response.ok}, URL: ${response.url}`);
        }

        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch (jsonError) {
            console.error('API_CLIENT_DEBUG - Failed to parse error response as JSON:', jsonError);
            errorData = {
              message: `HTTP ${response.status}: ${response.statusText}`,
              status: response.status,
              url: response.url
            };
          }
          
          // Ensure error message is always a string to prevent "[object Object]"
          const rawMessage = errorData.message || errorData.error;
          let errorMessage: string;
          
          if (typeof rawMessage === 'string') {
            errorMessage = rawMessage;
          } else if (rawMessage && typeof rawMessage === 'object') {
            // Use our serialization utility for objects
            errorMessage = serializeError(rawMessage);
          } else {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
          
          const error = new Error(errorMessage);
          
          // RATE LIMIT FIX: Special handling for 429 Too Many Requests
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            const delay = retryAfter ? parseInt(retryAfter) * 1000 : this.config.retryDelay * Math.pow(2, attempt);
            
            if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG === 'true') {
              console.debug(`API_CLIENT_DEBUG - Rate limited (429), retrying in ${delay}ms (attempt ${attempt}/${this.config.retryAttempts})`);
            }
            
            if (attempt < this.config.retryAttempts) {
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
          }
          
          // Don't retry on other client errors (4xx), only on server errors (5xx) and network issues
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            throw error;
          }
          
          lastError = error;
          
          // Retry on server errors with exponential backoff + jitter
          if (attempt < this.config.retryAttempts) {
            const exponentialDelay = this.config.retryDelay * Math.pow(2, attempt - 1);
            const jitter = Math.random() * 0.1 * exponentialDelay; // Add 10% jitter
            const delay = exponentialDelay + jitter;
            
            if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG === 'true') {
              console.debug(`API_CLIENT_DEBUG - Server error, retrying in ${Math.round(delay)}ms (attempt ${attempt}/${this.config.retryAttempts})`);
            }
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          throw error;
        }

        const responseData = await response.json();
        if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG === 'true') {
          console.debug('API_CLIENT_DEBUG - Successful response parsed:', {
            url: url.toString(),
            method: method,
            status: response.status,
            responseType: typeof responseData,
            responseKeys: responseData && typeof responseData === 'object' ? Object.keys(responseData) : null,
            responseKeysCount: responseData && typeof responseData === 'object' ? Object.keys(responseData).length : 0,
            isEmptyObject: responseData && typeof responseData === 'object' && Object.keys(responseData).length === 0,
            responseData: responseData
          });
        }
        
        // 🔧 CRITICAL: Check for empty object responses which indicate backend issues
        if (responseData && typeof responseData === 'object' && Object.keys(responseData).length === 0) {
          console.warn('⚠️ API_CLIENT_DEBUG - Empty object response detected:', {
            url: url.toString(),
            method: method,
            status: response.status,
            possibleCauses: [
              'Authentication/authorization issue',
              'Backend returning empty response',
              'Database connection problem',
              'Backend not properly handling request'
            ]
          });
        }
        
        return responseData;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Handle network errors and timeouts with retry
        if (error instanceof Error && (
          error.name === 'AbortError' ||
          error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError')
        )) {
          if (attempt < this.config.retryAttempts) {
            console.warn('API_CLIENT_DEBUG - Network error, retrying:');
            console.warn(`  Attempt: ${attempt}/${this.config.retryAttempts}, URL: ${url.toString()}, Method: ${method}`);
            console.warn('  Error:', serializeError(error));
            
            // RATE LIMIT FIX: Enhanced exponential backoff with jitter for network errors
            const exponentialDelay = this.config.retryDelay * Math.pow(2, attempt - 1);
            const jitter = Math.random() * 0.1 * exponentialDelay;
            const delay = exponentialDelay + jitter;
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          } else {
            // Final attempt failed - log as error
            console.error('API_CLIENT_DEBUG - Network error (final attempt):');
            console.error(`  Attempt: ${attempt}/${this.config.retryAttempts}, URL: ${url.toString()}, Method: ${method}`);
            console.error('  Error Details:', serializeError(error));
            throw lastError;
          }
        }
        
        // For non-network errors, log as error and throw immediately (no retry)
        console.error('API_CLIENT_DEBUG - Non-network error:');
        console.error(`  Attempt: ${attempt}, URL: ${url.toString()}, Method: ${method}`);
        console.error('  Error Details:', serializeError(error));
        throw lastError;
      }
    }

    // If we get here, all retries failed
    throw lastError || new Error('Request failed after all retry attempts');
  }

  // AUTH API METHODS
  async login(credentials: OperationRequestBody<ApiPaths['/auth/login']['post']>) {
    return this.request<PostOperationResponse<ApiPaths['/auth/login']['post']>>(
      '/auth/login', 
      'POST', 
      { body: credentials }
    );
  }

  async logout() {
    return this.request<PostOperationResponse<ApiPaths['/auth/logout']['post']>>(
      '/auth/logout', 
      'POST'
    );
  }

  async refreshSession() {
    return this.request<PostOperationResponse<ApiPaths['/auth/refresh']['post']>>(
      '/auth/refresh', 
      'POST'
    );
  }

  async getCurrentUser() {
    try {
      // DIAGNOSTIC: Log API client state before request
      const effectiveBackendUrl = this.getEffectiveBackendUrl();
      const finalBaseUrl = this.getEffectiveBaseUrl('/me');
      
      console.log('[DIAGNOSTIC] getCurrentUser API call details:', {
        effectiveBackendUrl,
        finalBaseUrl,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'SSR'
      });

      return await this.request<GetOperationResponse<ApiPaths['/me']['get']>>(
        '/me',
        'GET'
      );
    } catch (error) {
      // DIAGNOSTIC: Enhanced error logging
      console.error('[DIAGNOSTIC] getCurrentUser failed:', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        timestamp: new Date().toISOString(),
        effectiveBaseUrl: this.getEffectiveBackendUrl(),
        finalBaseUrl: this.getEffectiveBaseUrl('/me')
      });

      // Handle 401 responses gracefully for authentication checks
      if (error instanceof Error && error.message.includes('401')) {
        if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG === 'true') {
          console.debug('API_CLIENT_DEBUG - Authentication check: No valid session (401)');
        }
        return null;
      }
      // Re-throw other errors
      throw error;
    }
  }

  async changePassword(data: OperationRequestBody<ApiPaths['/change-password']['post']>) {
    return this.request<PostOperationResponse<ApiPaths['/change-password']['post']>>(
      '/change-password', 
      'POST', 
      { body: data }
    );
  }

  // CAMPAIGN API METHODS
  async listCampaigns() {
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG === 'true') {
      console.debug('🔧 [API_CLIENT] Starting listCampaigns request...');
    }
    try {
      const result = this.request<GetOperationResponse<ApiPaths['/campaigns']['get']>>(
        '/campaigns',
        'GET'
      );
      if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG === 'true') {
        console.debug('🔧 [API_CLIENT] listCampaigns request initiated');
      }
      return result;
    } catch (error) {
      console.error('❌ [API_CLIENT] listCampaigns failed:', error);
      throw error;
    }
  }

  async createCampaign(data: OperationRequestBody<ApiPaths['/campaigns']['post']>) {
    return this.request<PostOperationResponse<ApiPaths['/campaigns']['post']>>(
      '/campaigns', 
      'POST', 
      { body: data }
    );
  }

  async getCampaignById(campaignId: string) {
    return this.request<GetOperationResponse<ApiPaths['/campaigns/{campaignId}']['get']>>(
      `/campaigns/${campaignId}`, 
      'GET'
    );
  }

  async deleteCampaign(campaignId: string) {
    return this.request<DeleteOperationResponse<ApiPaths['/campaigns/{campaignId}']['delete']>>(
      `/campaigns/${campaignId}`, 
      'DELETE'
    );
  }

  async bulkDeleteCampaigns(data: OperationRequestBody<ApiPaths['/campaigns']['delete']>) {
    return this.request<DeleteOperationResponse<ApiPaths['/campaigns']['delete']>>(
      '/campaigns',
      'DELETE',
      { body: data }
    );
  }

  async startCampaign(campaignId: string) {
    return this.request<PostOperationResponse<ApiPaths['/campaigns/{campaignId}/start']['post']>>(
      `/campaigns/${campaignId}/start`, 
      'POST'
    );
  }

  async pauseCampaign(campaignId: string) {
    return this.request<PostOperationResponse<ApiPaths['/campaigns/{campaignId}/pause']['post']>>(
      `/campaigns/${campaignId}/pause`, 
      'POST'
    );
  }

  async resumeCampaign(campaignId: string) {
    return this.request<PostOperationResponse<ApiPaths['/campaigns/{campaignId}/resume']['post']>>(
      `/campaigns/${campaignId}/resume`, 
      'POST'
    );
  }

  async cancelCampaign(campaignId: string) {
    return this.request<PostOperationResponse<ApiPaths['/campaigns/{campaignId}/cancel']['post']>>(
      `/campaigns/${campaignId}/cancel`, 
      'POST'
    );
  }

  async getCampaignGeneratedDomains(campaignId: string, params?: { limit?: number; cursor?: number }) {
    return this.request<GetOperationResponse<ApiPaths['/campaigns/{campaignId}/results/generated-domains']['get']>>(
      `/campaigns/${campaignId}/results/generated-domains`, 
      'GET',
      { params }
    );
  }

  async getCampaignDNSValidationResults(campaignId: string, params?: { limit?: number; cursor?: string }) {
    return this.request<GetOperationResponse<ApiPaths['/campaigns/{campaignId}/results/dns-validation']['get']>>(
      `/campaigns/${campaignId}/results/dns-validation`, 
      'GET',
      { params }
    );
  }

  async getCampaignHTTPKeywordResults(campaignId: string, params?: { limit?: number; cursor?: string }) {
    return this.request<GetOperationResponse<ApiPaths['/campaigns/{campaignId}/results/http-keyword']['get']>>(
      `/campaigns/${campaignId}/results/http-keyword`, 
      'GET',
      { params }
    );
  }

  // PERSONA API METHODS
  async listPersonas() {
    return this.request<GetOperationResponse<ApiPaths['/personas']['get']>>(
      '/personas',
      'GET'
    );
  }

  async createPersona(data: OperationRequestBody<ApiPaths['/personas']['post']>) {
    return this.request<PostOperationResponse<ApiPaths['/personas']['post']>>(
      '/personas',
      'POST',
      { body: data }
    );
  }

  async getPersonaById(id: string) {
    return this.request<GetOperationResponse<ApiPaths['/personas/{id}']['get']>>(
      `/personas/${id}`,
      'GET'
    );
  }

  async updatePersona(id: string, data: OperationRequestBody<ApiPaths['/personas/{id}']['put']>) {
    return this.request<PutOperationResponse<ApiPaths['/personas/{id}']['put']>>(
      `/personas/${id}`,
      'PUT',
      { body: data }
    );
  }

  async deletePersona(id: string) {
    return this.request<DeleteOperationResponse<ApiPaths['/personas/{id}']['delete']>>(
      `/personas/${id}`,
      'DELETE'
    );
  }

  async testPersona(id: string) {
    return this.request<PostOperationResponse<ApiPaths['/personas/{id}/test']['post']>>(
      `/personas/${id}/test`,
      'POST'
    );
  }

  // PROXY API METHODS
  async listProxies() {
    return this.request<GetOperationResponse<ApiPaths['/proxies']['get']>>(
      '/proxies',
      'GET'
    );
  }

  async createProxy(data: OperationRequestBody<ApiPaths['/proxies']['post']>) {
    return this.request<PostOperationResponse<ApiPaths['/proxies']['post']>>(
      '/proxies',
      'POST',
      { body: data }
    );
  }

  async updateProxy(proxyId: string, data: OperationRequestBody<ApiPaths['/proxies/{proxyId}']['put']>) {
    return this.request<PutOperationResponse<ApiPaths['/proxies/{proxyId}']['put']>>(
      `/proxies/${proxyId}`,
      'PUT',
      { body: data }
    );
  }

  async deleteProxy(proxyId: string) {
    return this.request<DeleteOperationResponse<ApiPaths['/proxies/{proxyId}']['delete']>>(
      `/proxies/${proxyId}`,
      'DELETE'
    );
  }

  async testProxy(proxyId: string) {
    return this.request<PostOperationResponse<ApiPaths['/proxies/{proxyId}/test']['post']>>(
      `/proxies/${proxyId}/test`,
      'POST'
    );
  }

  async forceProxyHealthCheck(proxyId: string) {
    return this.request<PostOperationResponse<ApiPaths['/proxies/{proxyId}/health-check']['post']>>(
      `/proxies/${proxyId}/health-check`,
      'POST'
    );
  }

  async forceAllProxiesHealthCheck() {
    return this.request<PostOperationResponse<ApiPaths['/proxies/health-check']['post']>>(
      '/proxies/health-check',
      'POST'
    );
  }

  async getProxyStatuses() {
    return this.request<GetOperationResponse<ApiPaths['/proxies/status']['get']>>(
      '/proxies/status',
      'GET'
    );
  }

  // PROXY POOL API METHODS
  async listProxyPools() {
    return this.request<GetOperationResponse<ApiPaths['/proxy-pools']['get']>>(
      '/proxy-pools',
      'GET'
    );
  }

  async createProxyPool(data: OperationRequestBody<ApiPaths['/proxy-pools']['post']>) {
    return this.request<PostOperationResponse<ApiPaths['/proxy-pools']['post']>>(
      '/proxy-pools',
      'POST',
      { body: data }
    );
  }

  async updateProxyPool(poolId: string, data: OperationRequestBody<ApiPaths['/proxy-pools/{poolId}']['put']>) {
    return this.request<PutOperationResponse<ApiPaths['/proxy-pools/{poolId}']['put']>>(
      `/proxy-pools/${poolId}`,
      'PUT',
      { body: data }
    );
  }

  async deleteProxyPool(poolId: string) {
    return this.request<DeleteOperationResponse<ApiPaths['/proxy-pools/{poolId}']['delete']>>(
      `/proxy-pools/${poolId}`,
      'DELETE'
    );
  }

  async addProxyToPool(poolId: string, data: OperationRequestBody<ApiPaths['/proxy-pools/{poolId}/proxies']['post']>) {
    return this.request<PostOperationResponse<ApiPaths['/proxy-pools/{poolId}/proxies']['post']>>(
      `/proxy-pools/${poolId}/proxies`,
      'POST',
      { body: data }
    );
  }

  async removeProxyFromPool(poolId: string, proxyId: string) {
    return this.request<DeleteOperationResponse<ApiPaths['/proxy-pools/{poolId}/proxies/{proxyId}']['delete']>>(
      `/proxy-pools/${poolId}/proxies/${proxyId}`,
      'DELETE'
    );
  }

  // KEYWORD SET API METHODS
  async listKeywordSets(params?: { limit?: number; offset?: number; isEnabled?: boolean }) {
    return this.request<GetOperationResponse<ApiPaths['/keywords/sets']['get']>>(
      '/keywords/sets',
      'GET',
      { params }
    );
  }

  async createKeywordSet(data: OperationRequestBody<ApiPaths['/keywords/sets']['post']>) {
    return this.request<PostOperationResponse<ApiPaths['/keywords/sets']['post']>>(
      '/keywords/sets',
      'POST',
      { body: data }
    );
  }

  async getKeywordSetById(setId: string) {
    return this.request<GetOperationResponse<ApiPaths['/keywords/sets/{setId}']['get']>>(
      `/keywords/sets/${setId}`,
      'GET'
    );
  }

  async updateKeywordSet(setId: string, data: OperationRequestBody<ApiPaths['/keywords/sets/{setId}']['put']>) {
    return this.request<PutOperationResponse<ApiPaths['/keywords/sets/{setId}']['put']>>(
      `/keywords/sets/${setId}`,
      'PUT',
      { body: data }
    );
  }

  async deleteKeywordSet(setId: string) {
    return this.request<DeleteOperationResponse<ApiPaths['/keywords/sets/{setId}']['delete']>>(
      `/keywords/sets/${setId}`,
      'DELETE'
    );
  }

  // CONFIG API METHODS
  async getFeatureFlags() {
    return this.request<GetOperationResponse<ApiPaths['/config/features']['get']>>(
      '/config/features',
      'GET'
    );
  }

  async updateFeatureFlags(data: OperationRequestBody<ApiPaths['/config/features']['post']>) {
    return this.request<PostOperationResponse<ApiPaths['/config/features']['post']>>(
      '/config/features',
      'POST',
      { body: data }
    );
  }

  // CONFIG API METHODS - All configurations with proper typing
  async getDNSConfig() {
    return this.request<GetOperationResponse<ApiPaths['/api/v2/config/dns']['get']>>(
      '/config/dns',
      'GET'
    );
  }

  async updateDNSConfig(data: OperationRequestBody<ApiPaths['/api/v2/config/dns']['post']>) {
    return this.request<PostOperationResponse<ApiPaths['/api/v2/config/dns']['post']>>(
      '/config/dns',
      'POST',
      { body: data }
    );
  }

  async getHTTPConfig() {
    return this.request<GetOperationResponse<ApiPaths['/api/v2/config/http']['get']>>(
      '/config/http',
      'GET'
    );
  }

  async updateHTTPConfig(data: OperationRequestBody<ApiPaths['/api/v2/config/http']['post']>) {
    return this.request<PostOperationResponse<ApiPaths['/api/v2/config/http']['post']>>(
      '/config/http',
      'POST',
      { body: data }
    );
  }

  async getLoggingConfig() {
    return this.request<GetOperationResponse<ApiPaths['/api/v2/config/logging']['get']>>(
      '/config/logging',
      'GET'
    );
  }

  async updateLoggingConfig(data: OperationRequestBody<ApiPaths['/api/v2/config/logging']['post']>) {
    return this.request<PostOperationResponse<ApiPaths['/api/v2/config/logging']['post']>>(
      '/config/logging',
      'POST',
      { body: data }
    );
  }

  async getWorkerConfig() {
    return this.request<GetOperationResponse<ApiPaths['/api/v2/config/worker']['get']>>(
      '/config/worker',
      'GET'
    );
  }

  async updateWorkerConfig(data: OperationRequestBody<ApiPaths['/api/v2/config/worker']['post']>) {
    return this.request<PostOperationResponse<ApiPaths['/api/v2/config/worker']['post']>>(
      '/config/worker',
      'POST',
      { body: data }
    );
  }

  async getRateLimiterConfig() {
    return this.request<GetOperationResponse<ApiPaths['/api/v2/config/rate-limit']['get']>>(
      '/config/rate-limit',
      'GET'
    );
  }

  async updateRateLimiterConfig(data: OperationRequestBody<ApiPaths['/api/v2/config/rate-limit']['post']>) {
    return this.request<PostOperationResponse<ApiPaths['/api/v2/config/rate-limit']['post']>>(
      '/config/rate-limit',
      'POST',
      { body: data }
    );
  }

  async getProxyManagerConfig() {
    return this.request<GetOperationResponse<ApiPaths['/api/v2/config/proxy-manager']['get']>>(
      '/config/proxy-manager',
      'GET'
    );
  }

  async updateProxyManagerConfig(data: OperationRequestBody<ApiPaths['/api/v2/config/proxy-manager']['post']>) {
    return this.request<PostOperationResponse<ApiPaths['/api/v2/config/proxy-manager']['post']>>(
      '/config/proxy-manager',
      'POST',
      { body: data }
    );
  }

  async getServerConfig() {
    return this.request<GetOperationResponse<ApiPaths['/api/v2/config/server']['get']>>(
      '/config/server',
      'GET'
    );
  }

  async updateServerConfig(data: OperationRequestBody<ApiPaths['/api/v2/config/server']['put']>) {
    return this.request<PutOperationResponse<ApiPaths['/api/v2/config/server']['put']>>(
      '/config/server',
      'PUT',
      { body: data }
    );
  }

  async getAuthConfig() {
    return this.request<GetOperationResponse<ApiPaths['/api/v2/config/auth']['get']>>(
      '/config/auth',
      'GET'
    );
  }

  async updateAuthConfig(data: OperationRequestBody<ApiPaths['/api/v2/config/auth']['post']>) {
    return this.request<PostOperationResponse<ApiPaths['/api/v2/config/auth']['post']>>(
      '/config/auth',
      'POST',
      { body: data }
    );
  }

  // HEALTH API METHODS (note: health endpoints are at root level, not under /api/v2)
  async healthCheck() {
    const baseUrl = this.getEffectiveBackendUrl();
    const url = constructApiUrl(baseUrl, '/health');
    
    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout for health checks
      });
      
      if (response.ok) {
        return await response.json();
      } else {
        throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  async livenessCheck() {
    const baseUrl = this.getEffectiveBackendUrl();
    const url = constructApiUrl(baseUrl, '/health/live');
    
    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      return response.ok;
    } catch (error) {
      console.error('Liveness check failed:', error);
      return false;
    }
  }

  async readinessCheck() {
    const baseUrl = this.getEffectiveBackendUrl();
    const url = constructApiUrl(baseUrl, '/health/ready');
    
    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      return response.ok;
    } catch (error) {
      console.error('Readiness check failed:', error);
      return false;
    }
  }

  async ping() {
    const baseUrl = this.getEffectiveBackendUrl();
    const url = constructApiUrl(baseUrl, '/ping');
    
    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        return await response.json();
      } else {
        throw new Error(`Ping failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Ping failed:', error);
      throw error;
    }
  }
}

// Export a default instance
export const apiClient = new ApiClient();

// Legacy function aliases for backward compatibility
export const getCampaigns = () => apiClient.listCampaigns();
export const getCampaignById = (id: string) => apiClient.getCampaignById(id);
export const getGeneratedDomainsForCampaign = (campaignId: string, params?: { limit?: number; cursor?: number }) =>
  apiClient.getCampaignGeneratedDomains(campaignId, params);
export const getDnsCampaignDomains = (campaignId: string, params?: { limit?: number; cursor?: string }) =>
  apiClient.getCampaignDNSValidationResults(campaignId, params);
export const getHttpCampaignItems = (campaignId: string, params?: { limit?: number; cursor?: string }) =>
  apiClient.getCampaignHTTPKeywordResults(campaignId, params);
export const startCampaignPhase = (campaignId: string) => apiClient.startCampaign(campaignId);
export const pauseCampaign = (campaignId: string) => apiClient.pauseCampaign(campaignId);
export const resumeCampaign = (campaignId: string) => apiClient.resumeCampaign(campaignId);
export const stopCampaign = (campaignId: string) => apiClient.cancelCampaign(campaignId);

// Chain campaign method - assuming this creates a follow-up campaign
export const chainCampaign = async (_campaignId: string) => {
  // This would need to be implemented based on business logic
  // For now, we'll throw an error to indicate it needs implementation
  throw new Error('chainCampaign not yet implemented - needs business logic definition');
};

// Export generated types for use in services
export type {
  components,
  paths as ApiPaths,
  GetOperationResponse,
  PostOperationResponse,
  PutOperationResponse,
  DeleteOperationResponse,
  OperationRequestBody
};
