import apiClient from "./apiClient.production";

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
    const response = await apiClient.get<DNSConfig>(`${this.basePath}/dns`);
    return response.data as unknown as DNSConfig;
  }

  async updateDNSConfig(cfg: DNSConfig): Promise<void> {
    await apiClient.post(
      `${this.basePath}/dns`,
      cfg as unknown as Record<string, unknown>,
    );
  }

  async getHTTPConfig(): Promise<HTTPConfig> {
    const response = await apiClient.get<HTTPConfig>(`${this.basePath}/http`);
    return response.data as unknown as HTTPConfig;
  }

  async updateHTTPConfig(cfg: HTTPConfig): Promise<void> {
    await apiClient.post(
      `${this.basePath}/http`,
      cfg as unknown as Record<string, unknown>,
    );
  }

  async getLoggingConfig(): Promise<LoggingConfig> {
    const response = await apiClient.get<LoggingConfig>(
      `${this.basePath}/logging`,
    );
    return response.data as unknown as LoggingConfig;
  }

  async updateLoggingConfig(cfg: LoggingConfig): Promise<void> {
    await apiClient.post(
      `${this.basePath}/logging`,
      cfg as unknown as Record<string, unknown>,
    );
  }

  async getWorkerConfig(): Promise<WorkerConfig> {
    const response = await apiClient.get<WorkerConfig>(
      `${this.basePath}/worker`,
    );
    return response.data as unknown as WorkerConfig;
  }

  async updateWorkerConfig(cfg: WorkerConfig): Promise<void> {
    await apiClient.post(
      `${this.basePath}/worker`,
      cfg as unknown as Record<string, unknown>,
    );
  }

  async getRateLimiterConfig(): Promise<RateLimiterConfig> {
    const response = await apiClient.get<RateLimiterConfig>(
      `${this.basePath}/rate-limit`,
    );
    return response.data as unknown as RateLimiterConfig;
  }

  async updateRateLimiterConfig(cfg: RateLimiterConfig): Promise<void> {
    await apiClient.post(
      `${this.basePath}/rate-limit`,
      cfg as unknown as Record<string, unknown>,
    );
  }

  async getProxyManagerConfig(): Promise<ProxyManagerConfig> {
    const response = await apiClient.get<ProxyManagerConfig>(
      `${this.basePath}/proxy-manager`,
    );
    return response.data as unknown as ProxyManagerConfig;
  }

  async updateProxyManagerConfig(cfg: ProxyManagerConfig): Promise<void> {
    await apiClient.post(
      `${this.basePath}/proxy-manager`,
      cfg as unknown as Record<string, unknown>,
    );
  }

  async getFeatureFlags(): Promise<FeatureFlagsConfig> {
    const response = await apiClient.get<FeatureFlagsConfig>(
      `${this.basePath}/features`,
    );
    return response.data as unknown as FeatureFlagsConfig;
  }

  async updateFeatureFlags(flags: FeatureFlagsConfig): Promise<void> {
    await apiClient.post(
      `${this.basePath}/features`,
      flags as unknown as Record<string, unknown>,
    );
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
export const getFeatureFlags = () => settingsService.getFeatureFlags();
export const updateFeatureFlags = (flags: FeatureFlagsConfig) =>
  settingsService.updateFeatureFlags(flags);
