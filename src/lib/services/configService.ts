// src/lib/services/configService.ts
// Production Config Service - Feature flags and configuration management

import { enhancedApiClient } from '@/lib/utils/enhancedApiClientFactory';
import type { components } from '@/lib/api-client/types';

// Use generated types
export type FeatureFlags = components['schemas']['FeatureFlags'];

// Import unified API response wrapper
import type { ApiResponse } from '@/lib/types';
export type ConfigResponse<T = unknown> = ApiResponse<T>;

// Import additional OpenAPI config types
export type AuthConfig = components['schemas']['AuthConfig'];
export type DNSConfig = components['schemas']['DNSConfig'];
export type HTTPConfig = components['schemas']['HTTPConfig'];

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
      const response = await enhancedApiClient.executeWithCircuitBreaker(() =>
        enhancedApiClient.configApi.configFeaturesGet()
      );
      return {
        status: 'success',
        data: response.data as FeatureFlags,
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
      const response = await enhancedApiClient.executeWithCircuitBreaker(() =>
        enhancedApiClient.configApi.configFeaturesPost(flags)
      );
      return {
        status: 'success',
        data: response.data as FeatureFlags,
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