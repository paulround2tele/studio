import { configurationApi, configApi } from '@/lib/api-client/client';
import {
  safeApiCall
} from '@/lib/utils/apiResponseHelpers';

// Using appropriate API clients for different config operations
// ConfigurationApi for system configs, ConfigApi for feature flags
const configClient = configurationApi;
const featureFlagsClient = configApi;

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
    const result = await safeApiCall<DNSConfig>(
      () => configClient.getDNSConfigGin(),
      'Getting DNS configuration'
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to get DNS configuration');
    }
    
    return result.data || {} as DNSConfig;
  }

  async updateDNSConfig(cfg: DNSConfig): Promise<void> {
    const result = await safeApiCall<DNSConfig>(
      () => configClient.updateDNSConfigGin(cfg as any),
      'Updating DNS configuration'
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update DNS configuration');
    }
  }

  async getHTTPConfig(): Promise<HTTPConfig> {
    const result = await safeApiCall<HTTPConfig>(
      () => configClient.getHTTPConfigGin(),
      'Getting HTTP configuration'
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to get HTTP configuration');
    }
    
    return result.data || {} as HTTPConfig;
  }

  async updateHTTPConfig(cfg: HTTPConfig): Promise<void> {
    const result = await safeApiCall<HTTPConfig>(
      () => configClient.updateHTTPConfigGin(cfg as any),
      'Updating HTTP configuration'
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update HTTP configuration');
    }
  }

  async getLoggingConfig(): Promise<LoggingConfig> {
    const result = await safeApiCall<LoggingConfig>(
      () => configClient.getLoggingConfigGin(),
      'Getting logging configuration'
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to get logging configuration');
    }
    
    return result.data || {} as LoggingConfig;
  }

  async updateLoggingConfig(cfg: LoggingConfig): Promise<void> {
    const result = await safeApiCall<LoggingConfig>(
      () => configClient.updateLoggingConfigGin(cfg as any),
      'Updating logging configuration'
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update logging configuration');
    }
  }

  async getWorkerConfig(): Promise<WorkerConfig> {
    const result = await safeApiCall<WorkerConfig>(
      () => configClient.getWorkerConfigGin(),
      'Getting worker configuration'
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to get worker configuration');
    }
    
    return result.data || {} as WorkerConfig;
  }

  async updateWorkerConfig(cfg: WorkerConfig): Promise<void> {
    const result = await safeApiCall<WorkerConfig>(
      () => configClient.updateWorkerConfigGin(cfg as any),
      'Updating worker configuration'
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update worker configuration');
    }
  }

  async getRateLimiterConfig(): Promise<RateLimiterConfig> {
    const result = await safeApiCall<RateLimiterConfig>(
      () => configClient.getRateLimiterConfigGin(),
      'Getting rate limiter configuration'
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to get rate limiter configuration');
    }
    
    return result.data || {} as RateLimiterConfig;
  }

  async updateRateLimiterConfig(cfg: RateLimiterConfig): Promise<void> {
    const result = await safeApiCall<RateLimiterConfig>(
      () => configClient.updateRateLimiterConfigGin(cfg as any),
      'Updating rate limiter configuration'
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update rate limiter configuration');
    }
  }

  async getProxyManagerConfig(): Promise<ProxyManagerConfig> {
    const result = await safeApiCall<ProxyManagerConfig>(
      () => configClient.getProxyManagerConfigGin(),
      'Getting proxy manager configuration'
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to get proxy manager configuration');
    }
    
    return result.data || {} as ProxyManagerConfig;
  }

  async updateProxyManagerConfig(cfg: ProxyManagerConfig): Promise<void> {
    const result = await safeApiCall<ProxyManagerConfig>(
      () => configClient.updateProxyManagerConfigGin(cfg as any),
      'Updating proxy manager configuration'
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update proxy manager configuration');
    }
  }

  async getServerConfig(): Promise<ServerConfig> {
    const result = await safeApiCall<ServerConfig>(
      () => configClient.getServerConfigGin(),
      'Getting server configuration'
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to get server configuration');
    }
    
    return result.data || {} as ServerConfig;
  }

  async updateServerConfig(cfg: Partial<ServerConfig>): Promise<void> {
    const result = await safeApiCall<ServerConfig>(
      () => configClient.updateServerConfigGin(cfg as any),
      'Updating server configuration'
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update server configuration');
    }
  }

  async getAuthConfig(): Promise<AuthConfig> {
    const result = await safeApiCall<AuthConfig>(
      () => configClient.getAuthConfigGin(),
      'Getting auth configuration'
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to get auth configuration');
    }
    
    return result.data || {} as AuthConfig;
  }

  async updateAuthConfig(cfg: AuthConfig): Promise<void> {
    const result = await safeApiCall<AuthConfig>(
      () => configClient.updateAuthConfigGin(cfg as any),
      'Updating auth configuration'
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update auth configuration');
    }
  }

  async getFeatureFlags(): Promise<FeatureFlagsConfig> {
    // TODO: Fix once proper feature flags API endpoint is available
    try {
      const response = await featureFlagsClient.getServerConfigGin();
      return (response as any)?.featureFlags || {} as FeatureFlagsConfig;
    } catch (error) {
      console.warn('Feature flags API not available, using defaults:', error);
      return {} as FeatureFlagsConfig;
    }
  }

  async updateFeatureFlags(_flags: FeatureFlagsConfig): Promise<void> {
    // TODO: Fix once proper feature flags API endpoint is available
    console.warn('updateFeatureFlags not implemented - feature flags API endpoint missing');
    // await featureFlagsClient.updateServerConfig({ featureFlags: flags } as any);
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
