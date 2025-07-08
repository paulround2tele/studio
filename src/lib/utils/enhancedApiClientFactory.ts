// src/lib/utils/enhancedApiClientFactory.ts
// Enhanced API client factory that preserves manual client business logic
// while using auto-generated OpenAPI clients

import { Configuration } from '@/lib/api-client/configuration';
import axios, { type AxiosInstance, type AxiosError } from 'axios';

// Import all generated API classes
import { AuthApi } from '@/lib/api-client/api/auth-api';
import { CampaignsApi } from '@/lib/api-client/api/campaigns-api';
import { KeywordSetsApi } from '@/lib/api-client/api/keyword-sets-api';
import { PersonasApi } from '@/lib/api-client/api/personas-api';
import { ProxiesApi } from '@/lib/api-client/api/proxies-api';
import { ProxyPoolsApi } from '@/lib/api-client/api/proxy-pools-api';
import { ConfigApi } from '@/lib/api-client/api/config-api';
import { HealthApi } from '@/lib/api-client/api/health-api';

// Professional backend URL detection (preserved from manual client)
// All routes standardized under /api/v2 for consistency
const getSyncBackendUrl = (): string => {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (configured && configured.trim()) {
    return configured;
  }
  
  if (typeof window !== 'undefined') {
    const { hostname, port, protocol } = window.location;
    
    if (port === '3000') {
      return `${protocol}//${hostname}:8080/api/v2`;
    }
    
    if ((hostname === 'localhost' || hostname === '127.0.0.1') && (!port || port === '80')) {
      return `${protocol}//${hostname}:8080/api/v2`;
    }
    
    return `${protocol}//${hostname}/api/v2`;
  }
  
  return 'http://localhost:8080/api/v2';
};

// Enhanced request configuration (preserved from manual client)
interface RequestConfig {
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

// Circuit breaker state for resilience
interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  onStateChange?: (state: 'CLOSED' | 'OPEN' | 'HALF_OPEN') => void;
}

class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        this.config.onStateChange?.('HALF_OPEN');
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.config.onStateChange?.('CLOSED');
    }
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.config.failureThreshold) {
      this.state = 'OPEN';
      this.config.onStateChange?.('OPEN');
    }
  }
}

/**
 * Enhanced API client that wraps generated APIs with sophisticated business logic
 * Preserves all retry logic, circuit breakers, and error handling from manual client
 */
export class EnhancedApiClient {
  private _detectedBackendUrl: string | null = null;
  private requestConfig: RequestConfig;
  private axiosInstance: AxiosInstance;
  private configuration: Configuration;
  private circuitBreaker: CircuitBreaker;

  // Generated API instances
  public readonly auth: AuthApi;
  public readonly campaigns: CampaignsApi;
  public readonly keywordSets: KeywordSetsApi;
  public readonly personas: PersonasApi;
  public readonly proxies: ProxiesApi;
  public readonly proxyPools: ProxyPoolsApi;
  public readonly configApi: ConfigApi;
  public readonly health: HealthApi;

  constructor(baseUrl?: string) {
    this._detectedBackendUrl = baseUrl || null;
    
    // Enhanced configuration with proper rate limiting (preserved)
    this.requestConfig = {
      timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000'),
      retryAttempts: parseInt(process.env.NEXT_PUBLIC_API_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.NEXT_PUBLIC_API_RETRY_DELAY || '2000'),
    };

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeoutMs: 60000,
      onStateChange: (state) => {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[EnhancedApiClient] Circuit breaker state: ${state}`);
        }
      }
    });

    // Create configured axios instance
    this.axiosInstance = this.createAxiosInstance();
    this.configuration = this.createConfiguration();

    // Initialize all generated API clients
    this.auth = new AuthApi(this.configuration, undefined, this.axiosInstance);
    this.campaigns = new CampaignsApi(this.configuration, undefined, this.axiosInstance);
    this.keywordSets = new KeywordSetsApi(this.configuration, undefined, this.axiosInstance);
    this.personas = new PersonasApi(this.configuration, undefined, this.axiosInstance);
    this.proxies = new ProxiesApi(this.configuration, undefined, this.axiosInstance);
    this.proxyPools = new ProxyPoolsApi(this.configuration, undefined, this.axiosInstance);
    this.configApi = new ConfigApi(this.configuration, undefined, this.axiosInstance);
    this.health = new HealthApi(this.configuration, undefined, this.axiosInstance);

    // Only log in debug mode
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG === 'true') {
      console.debug('Enhanced API Client Configuration:', {
        providedBaseUrl: baseUrl,
        willAutoDetect: !baseUrl && !process.env.NEXT_PUBLIC_API_URL?.trim(),
        environment: process.env.NODE_ENV
      });
    }
  }

  private getEffectiveBackendUrl(): string {
    if (this._detectedBackendUrl === null) {
      this._detectedBackendUrl = getSyncBackendUrl();
    }
    return this._detectedBackendUrl;
  }

  private getEffectiveBaseUrl(path: string): string {
    const baseUrl = this.getEffectiveBackendUrl();
    
    // Auth routes are served directly from backend root
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

  private createConfiguration(): Configuration {
    const baseUrl = this.getEffectiveBackendUrl();
    return new Configuration({
      basePath: baseUrl,
    });
  }

  private createAxiosInstance(): AxiosInstance {
    const baseUrl = this.getEffectiveBackendUrl();
    
    const instance = axios.create({
      baseURL: baseUrl,
      timeout: this.requestConfig.timeout,
      withCredentials: true, // Include cookies for session auth
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest', // Required for CSRF protection
      },
    });

    // Add sophisticated retry and error handling interceptors
    this.setupInterceptors(instance);
    
    return instance;
  }

  private setupInterceptors(instance: AxiosInstance) {
    // Request interceptor for debugging
    instance.interceptors.request.use(
      (config) => {
        if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG === 'true') {
          console.debug('🚀 API_CLIENT_DEBUG - Making request:', {
            method: config.method?.toUpperCase(),
            url: config.url,
            baseURL: config.baseURL,
            hasData: !!config.data
          });
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor with retry logic and circuit breaker
    instance.interceptors.response.use(
      (response) => {
        if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG === 'true') {
          console.debug('API_CLIENT_DEBUG - Response received:', {
            status: response.status,
            url: response.config.url,
            method: response.config.method?.toUpperCase()
          });
        }
        return response;
      },
      async (error: AxiosError) => {
        const config = error.config;
        
        if (!config) {
          return Promise.reject(error);
        }
        
        if (!('_retryCount' in config)) {
          (config as any)._retryCount = 0;
        }
        
        const retryCount = (config as any)._retryCount;
        
        // Handle rate limiting (429)
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : this.requestConfig.retryDelay * Math.pow(2, retryCount);
          
          if (retryCount < this.requestConfig.retryAttempts) {
            if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG === 'true') {
              console.debug(`API_CLIENT_DEBUG - Rate limited (429), retrying in ${delay}ms`);
            }
            
            (config as any)._retryCount = retryCount + 1;
            await new Promise(resolve => setTimeout(resolve, delay));
            return instance.request(config);
          }
        }
        
        // Don't retry client errors (4xx) except 429
        if (error.response?.status && error.response.status >= 400 && error.response.status < 500 && error.response.status !== 429) {
          return Promise.reject(error);
        }
        
        // Retry on server errors (5xx) and network errors
        if (retryCount < this.requestConfig.retryAttempts && (
          !error.response || // Network error
          error.response.status >= 500 || // Server error
          error.code === 'ECONNABORTED' // Timeout
        )) {
          const exponentialDelay = this.requestConfig.retryDelay * Math.pow(2, retryCount);
          const jitter = Math.random() * 0.1 * exponentialDelay;
          const delay = exponentialDelay + jitter;
          
          if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG === 'true') {
            console.debug(`API_CLIENT_DEBUG - Retrying in ${Math.round(delay)}ms (attempt ${retryCount + 1}/${this.requestConfig.retryAttempts})`);
          }
          
          (config as any)._retryCount = retryCount + 1;
          await new Promise(resolve => setTimeout(resolve, delay));
          return instance.request(config);
        }
        
        return Promise.reject(error);
      }
    );
  }

  /**
   * Execute API call with circuit breaker protection
   */
  async executeWithCircuitBreaker<T>(operation: () => Promise<T>): Promise<T> {
    return this.circuitBreaker.execute(operation);
  }

  /**
   * Legacy method compatibility - preserved API surface
   */
  async getCurrentUser() {
    return this.executeWithCircuitBreaker(() => this.auth.meGet());
  }

  async login(credentials: { email: string; password: string; rememberMe?: boolean }) {
    return this.executeWithCircuitBreaker(() => 
      this.auth.authLoginPost({
        email: credentials.email,
        password: credentials.password,
        rememberMe: credentials.rememberMe
      })
    );
  }

  async logout() {
    return this.executeWithCircuitBreaker(() => this.auth.authLogoutPost());
  }

  async listCampaigns() {
    return this.executeWithCircuitBreaker(() => this.campaigns.campaignsGet());
  }

  async getCampaignById(campaignId: string) {
    return this.executeWithCircuitBreaker(() => this.campaigns.campaignsCampaignIdGet(campaignId));
  }

  async createCampaign(data: any) {
    return this.executeWithCircuitBreaker(() => this.campaigns.campaignsPost(data));
  }

  // Note: Update campaign endpoint not available in generated API
  // If needed, this should be implemented when the backend provides a PUT endpoint
  async updateCampaign(_campaignId: string, _data: any) {
    throw new Error('Campaign update not implemented - no PUT endpoint available in generated API');
  }

  async deleteCampaign(campaignId: string) {
    return this.executeWithCircuitBreaker(() => this.campaigns.campaignsCampaignIdDelete(campaignId));
  }

  async startCampaign(campaignId: string) {
    return this.executeWithCircuitBreaker(() => this.campaigns.campaignsCampaignIdStartPost(campaignId));
  }

  async pauseCampaign(campaignId: string) {
    return this.executeWithCircuitBreaker(() => this.campaigns.campaignsCampaignIdPausePost(campaignId));
  }

  async resumeCampaign(campaignId: string) {
    return this.executeWithCircuitBreaker(() => this.campaigns.campaignsCampaignIdResumePost(campaignId));
  }

  async cancelCampaign(campaignId: string) {
    return this.executeWithCircuitBreaker(() => this.campaigns.campaignsCampaignIdCancelPost(campaignId));
  }

  // Add more legacy methods as needed...
}

// Export singleton instance
export const enhancedApiClient = new EnhancedApiClient();

// Legacy exports for backward compatibility
export const apiClient = enhancedApiClient;