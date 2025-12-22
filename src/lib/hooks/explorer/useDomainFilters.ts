/**
 * Phase 7: Domain Filters Hook with URL Sync
 * 
 * This hook manages filter state with bidirectional URL synchronization.
 * All filter changes are reflected in the URL, and URL changes update filters.
 * 
 * INVARIANTS:
 * - Filter state ALWAYS matches URL params
 * - Invalid URL params are ignored (not set in state)
 * - Empty/default values are NOT written to URL (keeps URLs clean)
 * 
 * NUQS HYDRATION BEHAVIOR (SSR/CSR):
 * nuqs v2.4.1+ with NuqsAdapter handles hydration internally:
 * - SSR: Returns default values (URL not available on server)
 * - CSR: Hydrates from actual URL on mount, triggers re-render if different
 * - This is safe for our use case: first render uses defaults, second uses URL
 * - No flash of wrong content because filters drive server-side queries
 * 
 * @see docs/PHASE_7_RESULTS_EXPLORATION_ARCHITECTURE.md Section 8.2
 * @see https://nuqs.47ng.com/docs/server-side-rendering
 */

'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import { 
  useQueryState, 
  parseAsString, 
  parseAsBoolean,
  createParser,
} from 'nuqs';

import type { 
  DomainFilters, 
  DomainStatusFilter, 
  LeadStatusFilter,
  WarningsFilter,
} from '@/types/explorer/filters';

import {
  FILTER_URL_KEYS,
  DEFAULT_DOMAIN_FILTERS,
  isDomainStatusFilter,
  isLeadStatusFilter,
  isWarningsFilter,
  isValidScore,
  countActiveFilters,
} from '@/types/explorer/filters';

// ============================================================================
// CUSTOM PARSERS
// ============================================================================

/**
 * Parser for domain status filter values
 */
const parseAsDomainStatus = createParser<DomainStatusFilter>({
  parse: (value) => isDomainStatusFilter(value) ? value : null,
  serialize: (value) => value,
});

/**
 * Parser for lead status filter values
 */
const parseAsLeadStatus = createParser<LeadStatusFilter>({
  parse: (value) => isLeadStatusFilter(value) ? value : null,
  serialize: (value) => value,
});

/**
 * Parser for warnings filter values
 */
const parseAsWarnings = createParser<WarningsFilter>({
  parse: (value) => isWarningsFilter(value) ? value : null,
  serialize: (value) => value,
});

/**
 * Parser for score values (0-100)
 */
const parseAsScore = createParser<number>({
  parse: (value) => {
    const num = parseInt(value, 10);
    return isValidScore(num) ? num : null;
  },
  serialize: (value) => String(value),
});

// ============================================================================
// HOOK RETURN TYPE
// ============================================================================

export interface UseDomainFiltersReturn {
  /** Current filter state (derived from URL) */
  filters: DomainFilters;
  
  /** Count of non-default filters active */
  activeFilterCount: number;
  
  /** Set a single filter value */
  setFilter: <K extends keyof DomainFilters>(key: K, value: DomainFilters[K]) => void;
  
  /** Set multiple filters at once */
  setFilters: (filters: Partial<DomainFilters>) => void;
  
  /** Clear a specific filter */
  clearFilter: (key: keyof DomainFilters) => void;
  
  /** Reset all filters to defaults */
  resetFilters: () => void;
  
  /** Check if filters are at default values */
  isDefault: boolean;
  
  /**
   * True after first client-side render when URL params are hydrated.
   * nuqs returns defaults on SSR, then hydrates from URL on CSR mount.
   * Safe to use filters immediately, but this flag available if UI needs
   * to show loading state during hydration.
   */
  isHydrated: boolean;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Hook for managing domain filters with URL synchronization
 * 
 * Usage:
 * ```tsx
 * const { filters, setFilter, resetFilters, isHydrated } = useDomainFilters();
 * ```
 */
export function useDomainFilters(): UseDomainFiltersReturn {
  // === Hydration Safety Guard ===
  // Track when client-side hydration is complete
  const [isHydrated, setIsHydrated] = useState(false);
  
  useEffect(() => {
    // Mark hydrated after first client-side render
    // nuqs will have hydrated URL params by this point
    setIsHydrated(true);
  }, []);
  
  // === URL State Bindings ===
  // Each filter maps to a URL parameter using compact keys
  
  const [dnsStatus, setDnsStatus] = useQueryState(
    FILTER_URL_KEYS.dnsStatus,
    parseAsDomainStatus.withDefault(DEFAULT_DOMAIN_FILTERS.dnsStatus ?? null as unknown as DomainStatusFilter)
  );
  
  const [httpStatus, setHttpStatus] = useQueryState(
    FILTER_URL_KEYS.httpStatus,
    parseAsDomainStatus.withDefault(DEFAULT_DOMAIN_FILTERS.httpStatus ?? null as unknown as DomainStatusFilter)
  );
  
  const [leadStatus, setLeadStatus] = useQueryState(
    FILTER_URL_KEYS.leadStatus,
    parseAsLeadStatus
  );
  
  const [minScore, setMinScore] = useQueryState(
    FILTER_URL_KEYS.minScore,
    parseAsScore
  );
  
  const [maxScore, setMaxScore] = useQueryState(
    FILTER_URL_KEYS.maxScore,
    parseAsScore
  );
  
  const [notParked, setNotParked] = useQueryState(
    FILTER_URL_KEYS.notParked,
    parseAsBoolean
  );
  
  const [hasContact, setHasContact] = useQueryState(
    FILTER_URL_KEYS.hasContact,
    parseAsBoolean
  );
  
  const [hasKeywords, setHasKeywords] = useQueryState(
    FILTER_URL_KEYS.hasKeywords,
    parseAsBoolean
  );
  
  const [keyword, setKeyword] = useQueryState(
    FILTER_URL_KEYS.keyword,
    parseAsString
  );
  
  const [domainSearch, setDomainSearch] = useQueryState(
    FILTER_URL_KEYS.domainSearch,
    parseAsString
  );
  
  const [dnsReason, setDnsReason] = useQueryState(
    FILTER_URL_KEYS.dnsReason,
    parseAsString
  );
  
  const [httpReason, setHttpReason] = useQueryState(
    FILTER_URL_KEYS.httpReason,
    parseAsString
  );
  
  const [warnings, setWarnings] = useQueryState(
    FILTER_URL_KEYS.warnings,
    parseAsWarnings.withDefault(DEFAULT_DOMAIN_FILTERS.warnings ?? null as unknown as WarningsFilter)
  );
  
  // === Derived Filter Object ===
  const filters = useMemo<DomainFilters>(() => {
    // Build object using spread to avoid readonly issues
    const result = {
      ...(dnsStatus ? { dnsStatus } : {}),
      ...(httpStatus ? { httpStatus } : {}),
      ...(leadStatus ? { leadStatus } : {}),
      ...(minScore !== null ? { minScore } : {}),
      ...(maxScore !== null ? { maxScore } : {}),
      ...(notParked !== null ? { notParked } : {}),
      ...(hasContact !== null ? { hasContact } : {}),
      ...(hasKeywords !== null ? { hasKeywords } : {}),
      ...(keyword ? { keyword } : {}),
      ...(domainSearch ? { domainSearch } : {}),
      ...(dnsReason ? { dnsReason } : {}),
      ...(httpReason ? { httpReason } : {}),
      ...(warnings ? { warnings } : {}),
    } satisfies DomainFilters;
    
    return result;
  }, [
    dnsStatus, httpStatus, leadStatus,
    minScore, maxScore,
    notParked, hasContact, hasKeywords,
    keyword, domainSearch,
    dnsReason, httpReason,
    warnings,
  ]);
  
  // === Filter Count ===
  const activeFilterCount = useMemo(
    () => countActiveFilters(filters),
    [filters]
  );
  
  // === Set Single Filter ===
  const setFilter = useCallback(<K extends keyof DomainFilters>(
    key: K, 
    value: DomainFilters[K]
  ) => {
    // Map filter key to setter
    switch (key) {
      case 'dnsStatus':
        setDnsStatus(value as DomainStatusFilter | null);
        break;
      case 'httpStatus':
        setHttpStatus(value as DomainStatusFilter | null);
        break;
      case 'leadStatus':
        setLeadStatus(value as LeadStatusFilter | null);
        break;
      case 'minScore':
        setMinScore(value as number | null);
        break;
      case 'maxScore':
        setMaxScore(value as number | null);
        break;
      case 'notParked':
        setNotParked(value as boolean | null);
        break;
      case 'hasContact':
        setHasContact(value as boolean | null);
        break;
      case 'hasKeywords':
        setHasKeywords(value as boolean | null);
        break;
      case 'keyword':
        setKeyword(value as string | null);
        break;
      case 'domainSearch':
        setDomainSearch(value as string | null);
        break;
      case 'dnsReason':
        setDnsReason(value as string | null);
        break;
      case 'httpReason':
        setHttpReason(value as string | null);
        break;
      case 'warnings':
        setWarnings(value as WarningsFilter | null);
        break;
    }
  }, [
    setDnsStatus, setHttpStatus, setLeadStatus,
    setMinScore, setMaxScore,
    setNotParked, setHasContact, setHasKeywords,
    setKeyword, setDomainSearch,
    setDnsReason, setHttpReason,
    setWarnings,
  ]);
  
  // === Set Multiple Filters ===
  const setFilters = useCallback((updates: Partial<DomainFilters>) => {
    // Apply all updates
    for (const [key, value] of Object.entries(updates)) {
      setFilter(key as keyof DomainFilters, value);
    }
  }, [setFilter]);
  
  // === Clear Single Filter ===
  const clearFilter = useCallback((key: keyof DomainFilters) => {
    setFilter(key, undefined as DomainFilters[typeof key]);
  }, [setFilter]);
  
  // === Reset All Filters ===
  const resetFilters = useCallback(() => {
    // Set all to defaults (which clears URL params for undefined values)
    setDnsStatus(DEFAULT_DOMAIN_FILTERS.dnsStatus ?? null);
    setHttpStatus(DEFAULT_DOMAIN_FILTERS.httpStatus ?? null);
    setLeadStatus(DEFAULT_DOMAIN_FILTERS.leadStatus ?? null);
    setMinScore(DEFAULT_DOMAIN_FILTERS.minScore ?? null);
    setMaxScore(DEFAULT_DOMAIN_FILTERS.maxScore ?? null);
    setNotParked(DEFAULT_DOMAIN_FILTERS.notParked ?? null);
    setHasContact(DEFAULT_DOMAIN_FILTERS.hasContact ?? null);
    setHasKeywords(DEFAULT_DOMAIN_FILTERS.hasKeywords ?? null);
    setKeyword(DEFAULT_DOMAIN_FILTERS.keyword ?? null);
    setDomainSearch(DEFAULT_DOMAIN_FILTERS.domainSearch ?? null);
    setDnsReason(DEFAULT_DOMAIN_FILTERS.dnsReason ?? null);
    setHttpReason(DEFAULT_DOMAIN_FILTERS.httpReason ?? null);
    setWarnings(DEFAULT_DOMAIN_FILTERS.warnings ?? null);
  }, [
    setDnsStatus, setHttpStatus, setLeadStatus,
    setMinScore, setMaxScore,
    setNotParked, setHasContact, setHasKeywords,
    setKeyword, setDomainSearch,
    setDnsReason, setHttpReason,
    setWarnings,
  ]);
  
  // === Is Default Check ===
  const isDefault = activeFilterCount === 0;
  
  return {
    filters,
    activeFilterCount,
    setFilter,
    setFilters,
    clearFilter,
    resetFilters,
    isDefault,
    isHydrated,
  };
}
