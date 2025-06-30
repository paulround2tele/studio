// src/lib/services/configService.ts
// Production Config Service - Feature flags and configuration management

import { apiClient, type components } from '@/lib/api-client/client';

// Use generated types
export type FeatureFlags = components['schemas']['FeatureFlags'];

// Response wrapper types
export interface ConfigResponse<T = unknown> {
  status: 'success' | 'error';
  data?: T;
  error?: string;
  message?: string;
}

class ConfigService {
  private static instance: ConfigService;

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  async getFeatureFlags(): Promise<ConfigResponse<FeatureFlags>> {
    try {
      const result = await apiClient.getFeatureFlags();
      return {
        status: 'success',
        data: result as FeatureFlags,
        message: 'Feature flags retrieved successfully'
      };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updateFeatureFlags(flags: FeatureFlags): Promise<ConfigResponse<FeatureFlags>> {
    try {
      const result = await apiClient.updateFeatureFlags(flags);
      return {
        status: 'success',
        data: result as FeatureFlags,
        message: 'Feature flags updated successfully'
      };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async isFeatureEnabled(feature: keyof FeatureFlags): Promise<boolean> {
    try {
      const response = await this.getFeatureFlags();
      if (response.status === 'success' && response.data) {
        return Boolean(response.data[feature]);
      }
      return false;
    } catch (error) {
      console.warn(`Failed to check feature flag '${String(feature)}':`, error);
      return false;
    }
  }
}

// Export singleton and functions
export const configService = ConfigService.getInstance();

export const getFeatureFlags = () => configService.getFeatureFlags();
export const updateFeatureFlags = (flags: FeatureFlags) => configService.updateFeatureFlags(flags);
export const isFeatureEnabled = (feature: keyof FeatureFlags) => configService.isFeatureEnabled(feature);

export default configService;