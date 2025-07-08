/**
 * Configuration module exports
 * Provides centralized access to all configuration functions
 */

export {
  getEnvironmentConfig,
  getApiConfig,
  getAuthConfig,
  getWebSocketConfig,
  getSecurityConfig,
  getFeatureFlags,
  getPerformanceConfig,
  getCurrentEnvironmentName,
  validateConfiguration,
  setApiBaseUrlOverride,
  setDebugModeOverride,
  getApiBaseUrl,
  getApiBaseUrlSync
} from './environment';

// Default exports for common usage
export { getApiBaseUrl as default } from './environment';