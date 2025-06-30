/**
 * @fileOverview Legacy configuration compatibility layer
 * Provides backward compatibility while transitioning to the new environment system
 */

import { getApiConfig, setApiBaseUrlOverride as setEnvApiOverride } from './config/environment';

interface AppConfig {
  apiBaseUrl: string;
}

let loadedConfig: AppConfig | null = null;
let configPromise: Promise<AppConfig> | null = null;

// Fallback API base URL if config.json is missing or invalid.
const FALLBACK_API_BASE_URL = '/api';

async function fetchAppConfig(): Promise<AppConfig> {
  if (loadedConfig) {
    return loadedConfig;
  }

  // If a fetch is already in progress, return that promise
  if (configPromise) {
    return configPromise;
  }

  configPromise = (async () => {
    try {
      // First try the new environment configuration
      const envConfig = getApiConfig();
      if (envConfig.baseUrl) {
        loadedConfig = { apiBaseUrl: envConfig.baseUrl };
        return loadedConfig;
      }

      // Fallback to legacy config.json approach
      const response = await fetch('/config.json');
      if (!response.ok) {
        console.warn(
          `Failed to load /config.json (status: ${response.status}). Using fallback API base URL: ${FALLBACK_API_BASE_URL}`
        );
        return { apiBaseUrl: FALLBACK_API_BASE_URL };
      }
      const config = await response.json();
      if (typeof config.apiBaseUrl !== 'string' || config.apiBaseUrl.trim() === '') {
        console.warn(
          `Invalid or empty apiBaseUrl in /config.json. Using fallback API base URL: ${FALLBACK_API_BASE_URL}`
        );
        return { apiBaseUrl: FALLBACK_API_BASE_URL };
      }
      loadedConfig = config;
      return config;
    } catch (error) {
      console.warn(
        `Error fetching or parsing configuration: ${error}. Using fallback API base URL: ${FALLBACK_API_BASE_URL}`
      );
      return { apiBaseUrl: FALLBACK_API_BASE_URL };
    } finally {
      configPromise = null;
    }
  })();
  return configPromise;
}

/**
 * Retrieves the API base URL.
 * Uses the environment configuration system
 * @returns {Promise<string>} The determined API base URL.
 */
export async function getApiBaseUrl(): Promise<string> {
  const apiConfig = getApiConfig();
  return apiConfig.baseUrl;
}

/**
 * Sets or clears the API base URL override in localStorage.
 * Uses the environment configuration system
 * @param {string | null} url The URL to set, or null to remove the override.
 */
export function setApiBaseUrlOverride(url: string | null): void {
  setEnvApiOverride(url);
}
