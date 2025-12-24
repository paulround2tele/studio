/**
 * Phase 7.5: Feature Flags for Domain Explorer Migration
 * 
 * Controls gradual rollout of new explorer components.
 * Enables A/B testing and safe rollback.
 * 
 * USAGE:
 * ```tsx
 * import { useExplorerFeatureFlags } from '@/lib/features/explorerFlags';
 * 
 * const { useNewExplorer, useNewDrawer, useNewActions } = useExplorerFeatureFlags();
 * ```
 * 
 * @see Phase 7.5 Integration & Deprecation
 */

// ============================================================================
// FEATURE FLAG KEYS
// ============================================================================

export const EXPLORER_FLAGS = {
  /** Use new CampaignDomainsExplorer instead of legacy DomainsList */
  USE_NEW_EXPLORER: 'phase7.useNewExplorer',
  /** Use new DomainDrawer instead of legacy RichnessBreakdownModal */
  USE_NEW_DRAWER: 'phase7.useNewDrawer',
  /** Use new DomainActionsBar */
  USE_NEW_ACTIONS: 'phase7.useNewActions',
  /** Use new ResultsOverview instead of legacy LeadResultsPanel */
  USE_NEW_OVERVIEW: 'phase7.useNewOverview',
  /** Fetch authoritative score breakdown from backend */
  USE_AUTHORITATIVE_BREAKDOWN: 'phase7.useAuthoritativeBreakdown',
} as const;

// ============================================================================
// DEFAULT VALUES
// ============================================================================

/**
 * Default flag values
 * Set to true when ready for production rollout
 */
export const DEFAULT_FLAG_VALUES: Record<keyof typeof EXPLORER_FLAGS, boolean> = {
  USE_NEW_EXPLORER: true,  // Phase 7.5 complete - enable by default
  USE_NEW_DRAWER: true,    // Phase 7.3 complete - enable by default
  USE_NEW_ACTIONS: true,   // Phase 7.4 complete - enable by default
  USE_NEW_OVERVIEW: true,  // Phase 7.5 complete - enable by default
  USE_AUTHORITATIVE_BREAKDOWN: true, // Phase 7 backend validated - E2E confirmed 2025-12-23
};

// ============================================================================
// STORAGE HELPERS
// ============================================================================

const STORAGE_PREFIX = 'domainflow.flags.';

/**
 * Get flag value from localStorage with fallback
 */
function getFlagValue(key: string, defaultValue: boolean): boolean {
  if (typeof window === 'undefined') {
    return defaultValue;
  }
  
  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (stored === null) {
      return defaultValue;
    }
    return stored === 'true';
  } catch {
    return defaultValue;
  }
}

/**
 * Set flag value in localStorage
 */
function setFlagValue(key: string, value: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, String(value));
  } catch {
    // Ignore storage errors
  }
}

// ============================================================================
// HOOKS
// ============================================================================

import { useState, useCallback, useMemo, useEffect } from 'react';

export interface ExplorerFeatureFlags {
  /** Use new CampaignDomainsExplorer */
  useNewExplorer: boolean;
  /** Use new DomainDrawer */
  useNewDrawer: boolean;
  /** Use new DomainActionsBar */
  useNewActions: boolean;
  /** Use new ResultsOverview */
  useNewOverview: boolean;
  /** Fetch authoritative score breakdown from backend */
  useAuthoritativeBreakdown: boolean;
  /** Toggle a specific flag */
  toggleFlag: (flag: keyof typeof EXPLORER_FLAGS) => void;
  /** Reset all flags to defaults */
  resetFlags: () => void;
}

/**
 * Hook for accessing explorer feature flags
 */
export function useExplorerFeatureFlags(): ExplorerFeatureFlags {
  const [flags, setFlags] = useState(() => ({
    useNewExplorer: getFlagValue(EXPLORER_FLAGS.USE_NEW_EXPLORER, DEFAULT_FLAG_VALUES.USE_NEW_EXPLORER),
    useNewDrawer: getFlagValue(EXPLORER_FLAGS.USE_NEW_DRAWER, DEFAULT_FLAG_VALUES.USE_NEW_DRAWER),
    useNewActions: getFlagValue(EXPLORER_FLAGS.USE_NEW_ACTIONS, DEFAULT_FLAG_VALUES.USE_NEW_ACTIONS),
    useNewOverview: getFlagValue(EXPLORER_FLAGS.USE_NEW_OVERVIEW, DEFAULT_FLAG_VALUES.USE_NEW_OVERVIEW),
    useAuthoritativeBreakdown: getFlagValue(EXPLORER_FLAGS.USE_AUTHORITATIVE_BREAKDOWN, DEFAULT_FLAG_VALUES.USE_AUTHORITATIVE_BREAKDOWN),
  }));

  // Sync with localStorage on mount
  useEffect(() => {
    setFlags({
      useNewExplorer: getFlagValue(EXPLORER_FLAGS.USE_NEW_EXPLORER, DEFAULT_FLAG_VALUES.USE_NEW_EXPLORER),
      useNewDrawer: getFlagValue(EXPLORER_FLAGS.USE_NEW_DRAWER, DEFAULT_FLAG_VALUES.USE_NEW_DRAWER),
      useNewActions: getFlagValue(EXPLORER_FLAGS.USE_NEW_ACTIONS, DEFAULT_FLAG_VALUES.USE_NEW_ACTIONS),
      useNewOverview: getFlagValue(EXPLORER_FLAGS.USE_NEW_OVERVIEW, DEFAULT_FLAG_VALUES.USE_NEW_OVERVIEW),
      useAuthoritativeBreakdown: getFlagValue(EXPLORER_FLAGS.USE_AUTHORITATIVE_BREAKDOWN, DEFAULT_FLAG_VALUES.USE_AUTHORITATIVE_BREAKDOWN),
    });
  }, []);

  const toggleFlag = useCallback((flag: keyof typeof EXPLORER_FLAGS) => {
    const flagKey = EXPLORER_FLAGS[flag];
    const currentValue = getFlagValue(flagKey, DEFAULT_FLAG_VALUES[flag]);
    const newValue = !currentValue;
    
    setFlagValue(flagKey, newValue);
    
    setFlags(prev => {
      const stateKey = flag === 'USE_NEW_EXPLORER' ? 'useNewExplorer' :
                       flag === 'USE_NEW_DRAWER' ? 'useNewDrawer' :
                       flag === 'USE_NEW_ACTIONS' ? 'useNewActions' :
                       flag === 'USE_NEW_OVERVIEW' ? 'useNewOverview' :
                       'useAuthoritativeBreakdown';
      return { ...prev, [stateKey]: newValue };
    });
  }, []);

  const resetFlags = useCallback(() => {
    Object.entries(EXPLORER_FLAGS).forEach(([key, flagKey]) => {
      setFlagValue(flagKey, DEFAULT_FLAG_VALUES[key as keyof typeof EXPLORER_FLAGS]);
    });
    
    setFlags({
      useNewExplorer: DEFAULT_FLAG_VALUES.USE_NEW_EXPLORER,
      useNewDrawer: DEFAULT_FLAG_VALUES.USE_NEW_DRAWER,
      useNewActions: DEFAULT_FLAG_VALUES.USE_NEW_ACTIONS,
      useNewOverview: DEFAULT_FLAG_VALUES.USE_NEW_OVERVIEW,
      useAuthoritativeBreakdown: DEFAULT_FLAG_VALUES.USE_AUTHORITATIVE_BREAKDOWN,
    });
  }, []);

  return useMemo(() => ({
    ...flags,
    toggleFlag,
    resetFlags,
  }), [flags, toggleFlag, resetFlags]);
}

// ============================================================================
// STATIC HELPERS (for SSR)
// ============================================================================

/**
 * Get all flag values (for SSR or static checks)
 */
export function getExplorerFlags(): Record<string, boolean> {
  return {
    useNewExplorer: getFlagValue(EXPLORER_FLAGS.USE_NEW_EXPLORER, DEFAULT_FLAG_VALUES.USE_NEW_EXPLORER),
    useNewDrawer: getFlagValue(EXPLORER_FLAGS.USE_NEW_DRAWER, DEFAULT_FLAG_VALUES.USE_NEW_DRAWER),
    useNewActions: getFlagValue(EXPLORER_FLAGS.USE_NEW_ACTIONS, DEFAULT_FLAG_VALUES.USE_NEW_ACTIONS),
    useNewOverview: getFlagValue(EXPLORER_FLAGS.USE_NEW_OVERVIEW, DEFAULT_FLAG_VALUES.USE_NEW_OVERVIEW),
    useAuthoritativeBreakdown: getFlagValue(EXPLORER_FLAGS.USE_AUTHORITATIVE_BREAKDOWN, DEFAULT_FLAG_VALUES.USE_AUTHORITATIVE_BREAKDOWN),
  };
}

/**
 * Check if new explorer should be used (SSR-safe)
 */
export function shouldUseNewExplorer(): boolean {
  return getFlagValue(EXPLORER_FLAGS.USE_NEW_EXPLORER, DEFAULT_FLAG_VALUES.USE_NEW_EXPLORER);
}
