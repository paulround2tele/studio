/**
 * Phase 7: Domain Filters Schema
 * 
 * INVARIANTS:
 * - Filters are ANDed together (all must match)
 * - Empty string values treated as unset
 * - URL serialization uses compact keys (dns, http, min, etc.)
 * - Changing any filter resets page to 1
 * - Filters are ALWAYS server-side (no client filtering)
 * - External consumers receive ReadonlyDomainFilters to prevent mutation
 * 
 * @see docs/PHASE_7_RESULTS_EXPLORATION_ARCHITECTURE.md Section 8.2
 */

// ============================================================================
// TYPE UTILITIES
// ============================================================================

/**
 * Helper type to strip readonly from properties.
 * Used internally for object spread operations while maintaining
 * readonly contract at API boundaries.
 * 
 * SAFETY JUSTIFICATION: All hook returns and external APIs use ReadonlyDomainFilters.
 * Only internal utility functions (mergeFilters, etc.) use mutable version for
 * convenient object spreading during immutable update patterns.
 */
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

// ============================================================================
// STATUS FILTER TYPES
// ============================================================================

/**
 * Domain status filter values
 * Maps directly to backend enum: domain_dns_status_enum, domain_http_status_enum
 */
export type DomainStatusFilter = 'pending' | 'ok' | 'error' | 'timeout';

/**
 * Lead status filter values
 * Maps to backend enum: domain_lead_status_enum
 */
export type LeadStatusFilter = 'pending' | 'match' | 'no_match' | 'error' | 'timeout';

/**
 * Warnings filter options
 */
export type WarningsFilter = 'all' | 'has' | 'none';

// ============================================================================
// MAIN FILTER INTERFACE
// ============================================================================

/**
 * Complete filter state schema - all fields optional, absent = no filter
 * 
 * This interface defines the complete filter surface for domain exploration.
 * All fields are optional - undefined means "no filter applied".
 * 
 * INTERNAL USE: Use this interface for utility functions that need mutation.
 * EXTERNAL USE: Use ReadonlyDomainFilters for hook returns and public APIs.
 * 
 * @see ReadonlyDomainFilters - The immutable public contract
 */
export interface DomainFilters {
  // === Status Filters (enum-constrained) ===
  /** DNS validation status filter */
  dnsStatus?: DomainStatusFilter;
  /** HTTP validation status filter */
  httpStatus?: DomainStatusFilter;
  /** Lead extraction status filter */
  leadStatus?: LeadStatusFilter;
  
  // === Score Filters ===
  /** Minimum richness score (0-100, inclusive) */
  minScore?: number;
  /** Maximum richness score (0-100, inclusive) */
  maxScore?: number;
  
  // === Boolean Filters ===
  /** Exclude parked domains (is_parked=true) */
  notParked?: boolean;
  /** Require contact signals present */
  hasContact?: boolean;
  /** Require keywords present (unique_count > 0) */
  hasKeywords?: boolean;
  
  // === Text Search Filters ===
  /** Keyword substring match */
  keyword?: string;
  /** Domain name search (ILIKE %search%) */
  domainSearch?: string;
  
  // === Reason Filters (for debugging) ===
  /** Exact DNS reason match: NXDOMAIN, SERVFAIL, etc. */
  dnsReason?: string;
  /** Exact HTTP reason match: TIMEOUT, TLS_ERROR, etc. */
  httpReason?: string;
  
  // === Display Filters ===
  /** Warnings filter mode */
  warnings?: WarningsFilter;
}

/**
 * Immutable filter contract for external consumers
 * 
 * All hook returns and public APIs should use this type.
 * Ensures consumers cannot accidentally mutate filter state.
 */
export type ReadonlyDomainFilters = Readonly<DomainFilters>;

// ============================================================================
// SMART DEFAULTS
// ============================================================================

/**
 * Default filters that surface high-signal domains
 * Users see quality results immediately, can expand manually.
 * 
 * PRODUCT INTENT:
 * - Hide noise (DNS/HTTP failures) unless explicitly requested
 * - Surface domains ready for lead evaluation
 */
export const DEFAULT_DOMAIN_FILTERS: Readonly<DomainFilters> = {
  dnsStatus: 'ok',    // Hide DNS failures
  httpStatus: 'ok',   // Hide HTTP failures  
  warnings: 'all',    // Show all (user can filter)
  // Everything else undefined = no filter
} as const;

/**
 * Empty filters (no filtering applied)
 * Use for "show everything" mode
 */
export const EMPTY_DOMAIN_FILTERS: Readonly<DomainFilters> = {} as const;

// ============================================================================
// URL SERIALIZATION
// ============================================================================

/**
 * URL parameter key mapping (compact for cleaner URLs)
 * 
 * Example URL: ?dns=ok&http=ok&min=50&np=1&kw=marketing
 */
export const FILTER_URL_KEYS = {
  dnsStatus: 'dns',
  httpStatus: 'http',
  leadStatus: 'lead',
  minScore: 'min',
  maxScore: 'max',
  notParked: 'np',
  hasContact: 'hc',
  hasKeywords: 'hk',
  keyword: 'kw',
  domainSearch: 'q',
  dnsReason: 'dr',
  httpReason: 'hr',
  warnings: 'w',
} as const satisfies Record<keyof DomainFilters, string>;

/**
 * Reverse mapping for URL parsing
 */
export const URL_KEY_TO_FILTER = Object.fromEntries(
  Object.entries(FILTER_URL_KEYS).map(([k, v]) => [v, k])
) as Record<string, keyof DomainFilters>;

// ============================================================================
// TYPE GUARDS & VALIDATION
// ============================================================================

/**
 * Valid DNS/HTTP status values
 */
const VALID_STATUS_VALUES: readonly DomainStatusFilter[] = ['pending', 'ok', 'error', 'timeout'];

/**
 * Valid lead status values
 */
const VALID_LEAD_STATUS_VALUES: readonly LeadStatusFilter[] = ['pending', 'match', 'no_match', 'error', 'timeout'];

/**
 * Valid warnings filter values
 */
const VALID_WARNINGS_VALUES: readonly WarningsFilter[] = ['all', 'has', 'none'];

/**
 * Type guard for DomainStatusFilter
 */
export function isDomainStatusFilter(value: unknown): value is DomainStatusFilter {
  return typeof value === 'string' && VALID_STATUS_VALUES.includes(value as DomainStatusFilter);
}

/**
 * Type guard for LeadStatusFilter
 */
export function isLeadStatusFilter(value: unknown): value is LeadStatusFilter {
  return typeof value === 'string' && VALID_LEAD_STATUS_VALUES.includes(value as LeadStatusFilter);
}

/**
 * Type guard for WarningsFilter
 */
export function isWarningsFilter(value: unknown): value is WarningsFilter {
  return typeof value === 'string' && VALID_WARNINGS_VALUES.includes(value as WarningsFilter);
}

/**
 * Validate score is in valid range
 */
export function isValidScore(value: unknown): value is number {
  return typeof value === 'number' && value >= 0 && value <= 100 && Number.isFinite(value);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Count non-default filters (for UI badge display)
 */
export function countActiveFilters(filters: DomainFilters): number {
  const defaults = DEFAULT_DOMAIN_FILTERS;
  let count = 0;
  
  for (const key of Object.keys(filters) as Array<keyof DomainFilters>) {
    const value = filters[key];
    const defaultValue = defaults[key];
    
    // Count if value exists and differs from default
    if (value !== undefined && value !== defaultValue) {
      count++;
    }
  }
  
  return count;
}

/**
 * Check if filters equal defaults (no custom filtering)
 */
export function isDefaultFilters(filters: DomainFilters): boolean {
  return countActiveFilters(filters) === 0;
}

/**
 * Merge partial filters into existing filters
 * Returns new object (immutable)
 */
export function mergeFilters(
  current: DomainFilters, 
  updates: Partial<DomainFilters>
): DomainFilters {
  const merged = { ...current };
  
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) {
      delete merged[key as keyof DomainFilters];
    } else {
      (merged as Record<string, unknown>)[key] = value;
    }
  }
  
  return merged;
}

/**
 * Convert filters to API query parameters
 * Only includes non-empty values
 */
export function filtersToApiParams(filters: DomainFilters): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {};
  
  if (filters.dnsStatus) params.dnsStatus = filters.dnsStatus;
  if (filters.httpStatus) params.httpStatus = filters.httpStatus;
  if (filters.leadStatus) params.leadStatus = filters.leadStatus;
  if (filters.minScore !== undefined) params.minScore = filters.minScore;
  if (filters.maxScore !== undefined) params.maxScore = filters.maxScore;
  if (filters.notParked !== undefined) params.notParked = filters.notParked;
  if (filters.hasContact !== undefined) params.hasContact = filters.hasContact;
  if (filters.hasKeywords !== undefined) params.hasKeywords = filters.hasKeywords;
  if (filters.keyword) params.keyword = filters.keyword;
  if (filters.domainSearch) params.domainSearch = filters.domainSearch;
  if (filters.dnsReason) params.dnsReason = filters.dnsReason;
  if (filters.httpReason) params.httpReason = filters.httpReason;
  if (filters.warnings && filters.warnings !== 'all') params.warnings = filters.warnings;
  
  return params;
}
