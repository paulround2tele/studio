/**
 * @fileOverview Clean configuration using environment system
 * Direct integration with environment configuration
 */

import { getApiConfig, setApiBaseUrlOverride as setEnvApiOverride } from './config/environment';

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
