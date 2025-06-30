import { apiClient as openApiClient } from '@/lib/api-client/client';

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

export interface WorkerConfig {
  numWorkers: number;
  pollIntervalSeconds: number;
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
  private readonly basePath = "/api/v2/config";

  static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  async getDNSConfig(): Promise<DNSConfig> {
    const response = await openApiClient.getDNSConfig();
    return response as unknown as DNSConfig;
  }

  async updateDNSConfig(cfg: DNSConfig): Promise<void> {
    await openApiClient.updateDNSConfig(cfg as any);
  }

  async getHTTPConfig(): Promise<HTTPConfig> {
    const response = await openApiClient.getHTTPConfig();
    return response as unknown as HTTPConfig;
  }

  async updateHTTPConfig(cfg: HTTPConfig): Promise<void> {
    await openApiClient.updateHTTPConfig(cfg as any);
  }

  async getLoggingConfig(): Promise<LoggingConfig> {
    const response = await openApiClient.getLoggingConfig();
    return response as unknown as LoggingConfig;
  }

  async updateLoggingConfig(cfg: LoggingConfig): Promise<void> {
    await openApiClient.updateLoggingConfig(cfg as any);
  }

  async getWorkerConfig(): Promise<WorkerConfig> {
    const response = await openApiClient.getWorkerConfig();
    return response as unknown as WorkerConfig;
  }

  async updateWorkerConfig(cfg: WorkerConfig): Promise<void> {
    await openApiClient.updateWorkerConfig(cfg as any);
  }

  async getRateLimiterConfig(): Promise<RateLimiterConfig> {
    const response = await openApiClient.getRateLimiterConfig();
    return response as unknown as RateLimiterConfig;
  }

  async updateRateLimiterConfig(cfg: RateLimiterConfig): Promise<void> {
    await openApiClient.updateRateLimiterConfig(cfg as any);
  }

  async getProxyManagerConfig(): Promise<ProxyManagerConfig> {
    const response = await openApiClient.getProxyManagerConfig();
    return response as unknown as ProxyManagerConfig;
  }

  async updateProxyManagerConfig(cfg: ProxyManagerConfig): Promise<void> {
    await openApiClient.updateProxyManagerConfig(cfg as any);
  }

  async getServerConfig(): Promise<ServerConfig> {
    const response = await openApiClient.getServerConfig();
    return response as unknown as ServerConfig;
  }

  async updateServerConfig(cfg: Partial<ServerConfig>): Promise<void> {
    await openApiClient.updateServerConfig(cfg as any);
  }

  async getAuthConfig(): Promise<any> {
    const response = await openApiClient.getAuthConfig();
    return response;
  }

  async updateAuthConfig(cfg: any): Promise<void> {
    await openApiClient.updateAuthConfig(cfg as any);
  }

  async getFeatureFlags(): Promise<FeatureFlagsConfig> {
    const response = await openApiClient.getFeatureFlags();
    return response as unknown as FeatureFlagsConfig;
  }

  async updateFeatureFlags(flags: FeatureFlagsConfig): Promise<void> {
    await openApiClient.updateFeatureFlags(flags as any);
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
