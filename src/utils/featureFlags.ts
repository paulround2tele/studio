/**
 * Feature Flags Utility
 * Simple helper for environment-based feature flags with dev query param override
 */

/**
 * Check if a feature flag is enabled
 * @param name - Feature flag name (will be prefixed with NEXT_PUBLIC_)
 * @param defaultValue - Default value if flag is not set
 * @returns boolean indicating if feature is enabled
 */
export function isFlagEnabled(name: string, defaultValue: boolean = false): boolean {
  // Check for dev query param override (e.g., ?flags=overview_v2,wizard_off)
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const flagsParam = urlParams.get('flags');
    
    if (flagsParam) {
      const flags = flagsParam.split(',').map(f => f.trim());
      const enableFlag = name.toLowerCase().replace(/_/g, '_');
      const disableFlag = `${enableFlag}_off`;
      
      if (flags.includes(enableFlag)) return true;
      if (flags.includes(disableFlag)) return false;
    }
  }

  // Check environment variable
  const envKey = `NEXT_PUBLIC_${name.toUpperCase()}`;
  const envValue = process.env[envKey];
  
  if (envValue !== undefined) {
    return envValue === 'true' || envValue === '1';
  }
  
  return defaultValue;
}

/**
 * Feature flag constants
 */
export const FEATURE_FLAGS = {
  CAMPAIGN_OVERVIEW_V2: 'CAMPAIGN_OVERVIEW_V2',
  CAMPAIGN_WIZARD_V1: 'CAMPAIGN_WIZARD_V1',
} as const;