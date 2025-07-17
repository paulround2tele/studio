import { serverSettingsApi } from '@/lib/api-client/client';
import {
  extractResponseData
} from '@/lib/utils/apiResponseHelpers';

export interface DNSConfig {
  resolvers: string[];
  queryTimeoutSeconds: number;
  maxDomainsPerRequest: number;
  resolverStrategy: string;
  resolversWeighted?: Record<string, number>;
  resolversPreferredOrder?: string[];
  concurrentQueriesPerDomain: number;
  queryDelayMinMs: number;
  queryDelayMaxMs: number;
  maxConcurrentGoroutines: number;
  rateLimitDps?: number;
  rateLimitBurst?: number;
}

export interface HTTPConfig {
  defaultUserAgent: string;
  userAgents?: string[];
  defaultHeaders?: Record<string, string>;
  requestTimeoutSeconds: number;
  maxRedirects: number;
  followRedirects?: boolean;
  maxDomainsPerRequest?: number;
  allowInsecureTLS: boolean;
  maxConcurrentGoroutines?: number;
  rateLimitDps?: number;
  rateLimitBurst?: number;
  maxBodyReadBytes?: number;
}

export interface LoggingConfig {
  level: string;
  enableFileLogging?: boolean;
  logDirectory?: string;
  maxFileSize?: number;
  maxBackups?: number;
  maxAge?: number;
  enableJSONFormat?: boolean;
  enableRequestLogging?: boolean;
  enablePerformanceLogging?: boolean;
}

export interface FeatureFlagsConfig {
  enableRealTimeUpdates: boolean;
  enableOfflineMode: boolean;
  enableAnalytics: boolean;
  enableDebugMode: boolean;
}

export interface AuthConfig {
  sessionTimeoutMinutes?: number;
  maxLoginAttempts?: number;
  lockoutDurationMinutes?: number;
  requirePasswordChange?: boolean;
  passwordMinLength?: number;
  enableTwoFactor?: boolean;
  [key: string]: unknown;
}

export interface WorkerConfig {
  numWorkers: number;
  // 🚀 WEBSOCKET PUSH MODEL: Removed pollIntervalSeconds - workers now use WebSocket push events
  errorRetryDelaySeconds?: number;
  maxJobRetries?: number;
  jobProcessingTimeoutMinutes?: number;
  batchSize?: number;
  maxRetries?: number;
  retryDelaySeconds?: number;
  dnsSubtaskConcurrency?: number;
  httpKeywordSubtaskConcurrency?: number;
}

export interface RateLimiterConfig {
  maxRequests: number;
  windowSeconds: number;
}

export interface ProxyManagerConfig {
  testTimeoutSeconds: number;
  testUrl: string;
  initialHealthCheckTimeoutSeconds: number;
  maxConcurrentInitialChecks: number;
}

export interface ServerConfig {
  port: string;
  streamChunkSize: number;
  ginMode: string;
}

class SettingsService {
  private static instance: SettingsService;
  private readonly basePath = "/config";

  static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  async getDNSConfig(): Promise<DNSConfig> {
    try {
      const axiosResponse = await serverSettingsApi.getDNSConfigGin();
      const config = extractResponseData<DNSConfig>(axiosResponse);
      return config || {} as DNSConfig;
    } catch (error: any) {
      console.error('[SettingsService] Error getting DNS configuration:', error);
      throw new Error(error.message || 'Failed to get DNS configuration');
    }
  }

  async updateDNSConfig(cfg: DNSConfig): Promise<void> {
    try {
      const axiosResponse = await serverSettingsApi.updateDNSConfigGin(cfg as any);
      extractResponseData<DNSConfig>(axiosResponse);
    } catch (error: any) {
      console.error('[SettingsService] Error updating DNS configuration:', error);
      throw new Error(error.message || 'Failed to update DNS configuration');
    }
  }

  async getHTTPConfig(): Promise<HTTPConfig> {
    try {
      const axiosResponse = await serverSettingsApi.getHTTPConfigGin();
      const config = extractResponseData<HTTPConfig>(axiosResponse);
      return config || {} as HTTPConfig;
    } catch (error: any) {
      console.error('[SettingsService] Error getting HTTP configuration:', error);
      throw new Error(error.message || 'Failed to get HTTP configuration');
    }
  }

  async updateHTTPConfig(cfg: HTTPConfig): Promise<void> {
    try {
      const axiosResponse = await serverSettingsApi.updateHTTPConfigGin(cfg as any);
      extractResponseData<HTTPConfig>(axiosResponse);
    } catch (error: any) {
      console.error('[SettingsService] Error updating HTTP configuration:', error);
      throw new Error(error.message || 'Failed to update HTTP configuration');
    }
  }

  async getLoggingConfig(): Promise<LoggingConfig> {
    try {
      const axiosResponse = await serverSettingsApi.getLoggingConfigGin();
      const config = extractResponseData<LoggingConfig>(axiosResponse);
      return config || {} as LoggingConfig;
    } catch (error: any) {
      console.error('[SettingsService] Error getting logging configuration:', error);
      throw new Error(error.message || 'Failed to get logging configuration');
    }
  }

  async updateLoggingConfig(cfg: LoggingConfig): Promise<void> {
    try {
      const axiosResponse = await serverSettingsApi.updateLoggingConfigGin(cfg as any);
      extractResponseData<LoggingConfig>(axiosResponse);
    } catch (error: any) {
      console.error('[SettingsService] Error updating logging configuration:', error);
      throw new Error(error.message || 'Failed to update logging configuration');
    }
  }

  async getWorkerConfig(): Promise<WorkerConfig> {
    try {
      const axiosResponse = await serverSettingsApi.getWorkerConfigGin();
      const config = extractResponseData<WorkerConfig>(axiosResponse);
      return config || {} as WorkerConfig;
    } catch (error: any) {
      console.error('[SettingsService] Error getting worker configuration:', error);
      throw new Error(error.message || 'Failed to get worker configuration');
    }
  }

  async updateWorkerConfig(cfg: WorkerConfig): Promise<void> {
    try {
      const axiosResponse = await serverSettingsApi.updateWorkerConfigGin(cfg as any);
      extractResponseData<WorkerConfig>(axiosResponse);
    } catch (error: any) {
      console.error('[SettingsService] Error updating worker configuration:', error);
      throw new Error(error.message || 'Failed to update worker configuration');
    }
  }

  async getRateLimiterConfig(): Promise<RateLimiterConfig> {
    try {
      const axiosResponse = await serverSettingsApi.getRateLimiterConfigGin();
      const config = extractResponseData<RateLimiterConfig>(axiosResponse);
      return config || {} as RateLimiterConfig;
    } catch (error: any) {
      console.error('[SettingsService] Error getting rate limiter configuration:', error);
      throw new Error(error.message || 'Failed to get rate limiter configuration');
    }
  }

  async updateRateLimiterConfig(cfg: RateLimiterConfig): Promise<void> {
    try {
      const axiosResponse = await serverSettingsApi.updateRateLimiterConfigGin(cfg as any);
      extractResponseData<RateLimiterConfig>(axiosResponse);
    } catch (error: any) {
      console.error('[SettingsService] Error updating rate limiter configuration:', error);
      throw new Error(error.message || 'Failed to update rate limiter configuration');
    }
  }

  async getProxyManagerConfig(): Promise<ProxyManagerConfig> {
    try {
      const axiosResponse = await serverSettingsApi.getProxyManagerConfigGin();
      const config = extractResponseData<ProxyManagerConfig>(axiosResponse);
      return config || {} as ProxyManagerConfig;
    } catch (error: any) {
      console.error('[SettingsService] Error getting proxy manager configuration:', error);
      throw new Error(error.message || 'Failed to get proxy manager configuration');
    }
  }

  async updateProxyManagerConfig(cfg: ProxyManagerConfig): Promise<void> {
    try {
      const axiosResponse = await serverSettingsApi.updateProxyManagerConfigGin(cfg as any);
      extractResponseData<ProxyManagerConfig>(axiosResponse);
    } catch (error: any) {
      console.error('[SettingsService] Error updating proxy manager configuration:', error);
      throw new Error(error.message || 'Failed to update proxy manager configuration');
    }
  }

  async getServerConfig(): Promise<ServerConfig> {
    try {
      const axiosResponse = await serverSettingsApi.getServerConfigGin();
      const config = extractResponseData<ServerConfig>(axiosResponse);
      return config || {} as ServerConfig;
    } catch (error: any) {
      console.error('[SettingsService] Error getting server configuration:', error);
      throw new Error(error.message || 'Failed to get server configuration');
    }
  }

  async updateServerConfig(cfg: Partial<ServerConfig>): Promise<void> {
    try {
      const axiosResponse = await serverSettingsApi.updateServerConfigGin(cfg as any);
      extractResponseData<ServerConfig>(axiosResponse);
    } catch (error: any) {
      console.error('[SettingsService] Error updating server configuration:', error);
      throw new Error(error.message || 'Failed to update server configuration');
    }
  }

  async getAuthConfig(): Promise<AuthConfig> {
    try {
      const axiosResponse = await serverSettingsApi.getAuthConfigGin();
      const config = extractResponseData<AuthConfig>(axiosResponse);
      return config || {} as AuthConfig;
    } catch (error: any) {
      console.error('[SettingsService] Error getting auth configuration:', error);
      throw new Error(error.message || 'Failed to get auth configuration');
    }
  }

  async updateAuthConfig(cfg: AuthConfig): Promise<void> {
    try {
      const axiosResponse = await serverSettingsApi.updateAuthConfigGin(cfg as any);
      extractResponseData<AuthConfig>(axiosResponse);
    } catch (error: any) {
      console.error('[SettingsService] Error updating auth configuration:', error);
      throw new Error(error.message || 'Failed to update auth configuration');
    }
  }

  async getFeatureFlags(): Promise<FeatureFlagsConfig> {
    // TODO: Fix once proper feature flags API endpoint is available
    try {
      const response = await serverSettingsApi.getServerConfigGin();
      return (response as any)?.featureFlags || {} as FeatureFlagsConfig;
    } catch (error) {
      console.warn('Feature flags API not available, using defaults:', error);
      return {} as FeatureFlagsConfig;
    }
  }

  async updateFeatureFlags(_flags: FeatureFlagsConfig): Promise<void> {
    // TODO: Fix once proper feature flags API endpoint is available
    console.warn('updateFeatureFlags not implemented - feature flags API endpoint missing');
    // await serverSettingsApi.updateServerConfig({ featureFlags: flags } as any);
  }
}

export const settingsService = SettingsService.getInstance();

export const getDNSConfig = () => settingsService.getDNSConfig();
export const updateDNSConfig = (cfg: DNSConfig) =>
  settingsService.updateDNSConfig(cfg);
export const getHTTPConfig = () => settingsService.getHTTPConfig();
export const updateHTTPConfig = (cfg: HTTPConfig) =>
  settingsService.updateHTTPConfig(cfg);
export const getLoggingConfig = () => settingsService.getLoggingConfig();
export const updateLoggingConfig = (cfg: LoggingConfig) =>
  settingsService.updateLoggingConfig(cfg);
export const getWorkerConfig = () => settingsService.getWorkerConfig();
export const updateWorkerConfig = (cfg: WorkerConfig) =>
  settingsService.updateWorkerConfig(cfg);
export const getRateLimiterConfig = () =>
  settingsService.getRateLimiterConfig();
export const updateRateLimiterConfig = (cfg: RateLimiterConfig) =>
  settingsService.updateRateLimiterConfig(cfg);
export const getProxyManagerConfig = () =>
  settingsService.getProxyManagerConfig();
export const updateProxyManagerConfig = (cfg: ProxyManagerConfig) =>
  settingsService.updateProxyManagerConfig(cfg);
export const getServerConfig = () => settingsService.getServerConfig();
export const updateServerConfig = (cfg: Partial<ServerConfig>) =>
  settingsService.updateServerConfig(cfg);
export const getFeatureFlags = () => settingsService.getFeatureFlags();
export const updateFeatureFlags = (flags: FeatureFlagsConfig) =>
  settingsService.updateFeatureFlags(flags);
