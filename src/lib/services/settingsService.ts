import apiClient from './apiClient.production';

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
  rateLimitDps: number;
  rateLimitBurst: number;
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
}

class SettingsService {
  private static instance: SettingsService;
  private readonly basePath = '/api/v2/config';

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
    await apiClient.post(`${this.basePath}/dns`, cfg as unknown as Record<string, unknown>);
  }

  async getHTTPConfig(): Promise<HTTPConfig> {
    const response = await apiClient.get<HTTPConfig>(`${this.basePath}/http`);
    return response.data as unknown as HTTPConfig;
  }

  async updateHTTPConfig(cfg: HTTPConfig): Promise<void> {
    await apiClient.post(`${this.basePath}/http`, cfg as unknown as Record<string, unknown>);
  }

  async getLoggingConfig(): Promise<LoggingConfig> {
    const response = await apiClient.get<LoggingConfig>(`${this.basePath}/logging`);
    return response.data as unknown as LoggingConfig;
  }

  async updateLoggingConfig(cfg: LoggingConfig): Promise<void> {
    await apiClient.post(`${this.basePath}/logging`, cfg as unknown as Record<string, unknown>);
  }
}

export const settingsService = SettingsService.getInstance();

export const getDNSConfig = () => settingsService.getDNSConfig();
export const updateDNSConfig = (cfg: DNSConfig) => settingsService.updateDNSConfig(cfg);
export const getHTTPConfig = () => settingsService.getHTTPConfig();
export const updateHTTPConfig = (cfg: HTTPConfig) => settingsService.updateHTTPConfig(cfg);
export const getLoggingConfig = () => settingsService.getLoggingConfig();
export const updateLoggingConfig = (cfg: LoggingConfig) => settingsService.updateLoggingConfig(cfg);
