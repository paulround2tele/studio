/**
 * Simple Feature Flags for Phase 1 UI Refactor
 * Handles environment variables and query parameter overrides
 */

// Extract query parameters for feature flag overrides
function getQueryParams(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  
  const params = new URLSearchParams(window.location.search);
  const ffParams = params.get('ff');
  
  if (!ffParams) return {};
  
  // Parse comma-separated feature flags: ?ff=flag1,flag2
  const flags: Record<string, string> = {};
  ffParams.split(',').forEach(flag => {
    const trimmed = flag.trim();
    if (trimmed) {
      flags[trimmed] = 'true';
    }
  });
  
  return flags;
}

/**
 * Get feature flag value with environment variable and query parameter support
 * @param name - Feature flag name (without NEXT_PUBLIC_ prefix)
 * @param defaultValue - Default value if flag is not set
 * @returns Feature flag value
 */
export function getFeatureFlag(name: string, defaultValue: string = 'false'): string {
  // Check query parameter override first (browser only)
  if (typeof window !== 'undefined') {
    const queryParams = getQueryParams();
    if (queryParams[name]) {
      return queryParams[name];
    }
  }
  
  // Check environment variable
  const envVar = `NEXT_PUBLIC_${name.toUpperCase()}`;
  const envValue = process.env[envVar];
  
  if (envValue !== undefined) {
    return envValue;
  }
  
  return defaultValue;
}

/**
 * Check if a feature flag is enabled (truthy)
 * @param name - Feature flag name
 * @param defaultValue - Default boolean value
 * @returns Whether the feature is enabled
 */
export function isFeatureEnabled(name: string, defaultValue: boolean = false): boolean {
  const value = getFeatureFlag(name, defaultValue.toString());
  
  // Handle various truthy values
  return value === 'true' || value === '1' || value === 'on' || value === 'enabled';
}

// Phase 1 feature flags
export const PHASE1_FLAGS = {
  CAMPAIGN_WIZARD_V1: 'CAMPAIGN_WIZARD_V1',
  CAMPAIGN_OVERVIEW_V2: 'CAMPAIGN_OVERVIEW_V2'
} as const;

// Phase 2 feature flags
export const PHASE2_FLAGS = {
  SHOW_LEGACY_DOMAINS_TABLE: 'SHOW_LEGACY_DOMAINS_TABLE'
} as const;

// Phase 7 feature flags (Backend Canonical Integration)
export const PHASE7_FLAGS = {
  ENABLE_BACKEND_CANONICAL: 'ENABLE_BACKEND_CANONICAL',
  ENABLE_TIMELINE_PAGINATION: 'ENABLE_TIMELINE_PAGINATION', 
  ENABLE_FORECAST_CUSTOM_HORIZON: 'ENABLE_FORECAST_CUSTOM_HORIZON'
} as const;

/**
 * Check if campaign wizard should be used (default enabled unless explicitly disabled)
 */
export function useCampaignWizard(): boolean {
  const flagValue = getFeatureFlag(PHASE1_FLAGS.CAMPAIGN_WIZARD_V1, 'true');
  
  // Kill switch behavior: disabled only if explicitly set to 'false'
  return flagValue !== 'false';
}

/**
 * Check if campaign overview V2 should be shown
 */
export function useCampaignOverviewV2(): boolean {
  return isFeatureEnabled(PHASE1_FLAGS.CAMPAIGN_OVERVIEW_V2, false);
}

/**
 * Check if legacy domains table should be shown (Phase 2)
 */
export function useShowLegacyDomainsTable(): boolean {
  return isFeatureEnabled(PHASE2_FLAGS.SHOW_LEGACY_DOMAINS_TABLE, false);
}

/**
 * Check if backend canonical integration is enabled (Phase 7)
 * Master flag for server-first resolution
 */
export function useBackendCanonical(): boolean {
  return isFeatureEnabled(PHASE7_FLAGS.ENABLE_BACKEND_CANONICAL, true);
}

/**
 * Check if timeline pagination is enabled (Phase 7)
 */
export function useTimelinePagination(): boolean {
  return isFeatureEnabled(PHASE7_FLAGS.ENABLE_TIMELINE_PAGINATION, true);
}

/**
 * Check if forecast custom horizon is enabled (Phase 7)
 */
export function useForecastCustomHorizon(): boolean {
  return isFeatureEnabled(PHASE7_FLAGS.ENABLE_FORECAST_CUSTOM_HORIZON, true);
}