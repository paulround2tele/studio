// src/lib/services/configService.ts
// Production Config Service - Feature flags and configuration management

import type { components } from '@/lib/api-client/types';
import { featureFlagsApi } from '@/lib/api-client/client';
import { randomUUID } from 'crypto';

// Use pre-configured FeatureFlagsApi instance
const configApi = featureFlagsApi;

// Use generated types
export type FeatureFlags = components['schemas']['FeatureFlags'];

// Import unified API response wrapper
import type { ApiResponse } from '@/lib/types';
export type ConfigResponse<T = unknown> = ApiResponse<T>;

// Import additional OpenAPI config types
export type AuthConfig = components['schemas']['AuthConfig'];
export type DNSConfig = components['schemas']['DNSValidatorConfigJSON'];
export type HTTPConfig = components['schemas']['HTTPValidatorConfigJSON'];

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
      const response = await configApi.getFeatureFlags();
      // OpenAPI client returns the unified APIResponse in response.data
      const apiResponse = response.data as any;
      
      if (apiResponse.success === false) {
        return {
          success: false,
          error: apiResponse.error || 'Unknown error',
          requestId: apiResponse.requestId || randomUUID()
        };
      }
      
      return {
        success: true,
        data: apiResponse.data as FeatureFlags,
        error: null,
        requestId: apiResponse.requestId || randomUUID(),
        message: apiResponse.message
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: randomUUID()
      };
    }
  }

  async updateFeatureFlags(flags: FeatureFlags): Promise<ConfigResponse<FeatureFlags>> {
    try {
      const response = await configApi.updateFeatureFlags(flags);
      // OpenAPI client returns the unified APIResponse in response.data
      const apiResponse = response.data as any;
      
      if (apiResponse.success === false) {
        return {
          success: false,
          error: apiResponse.error || 'Unknown error',
          requestId: apiResponse.requestId || randomUUID()
        };
      }
      
      return {
        success: true,
        data: apiResponse.data as FeatureFlags,
        error: null,
        requestId: apiResponse.requestId || randomUUID(),
        message: apiResponse.message
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: randomUUID()
      };
    }
  }

  async isFeatureEnabled(feature: keyof FeatureFlags): Promise<boolean> {
    try {
      const response = await this.getFeatureFlags();
      if (response.success === true && response.data) {
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