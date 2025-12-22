/**
 * Phase 7: Domain Detail Drawer Data Contract
 * 
 * INVARIANTS:
 * - base is always populated when drawer opens
 * - scoreBreakdown loaded lazily on drawer open
 * - scoreBreakdown can be null if endpoint fails or not implemented
 * - UI MUST show explicit degraded state when breakdown unavailable
 * 
 * DEGRADED STATE HANDLING:
 * When isBreakdownUnavailable=true, UI must display:
 *   "Score breakdown unavailable (backend endpoint not yet implemented)"
 * Never silently fall back - user must know data is incomplete.
 * 
 * @see docs/PHASE_7_RESULTS_EXPLORATION_ARCHITECTURE.md Section 8.3
 */

import type { DomainRow } from './state';
import type { DomainScoreBreakdownResponse } from '@/lib/api-client/models';

// ============================================================================
// DRAWER DATA CONTRACT
// ============================================================================

/**
 * Complete domain data for drawer display
 * Combines DomainRow with lazy-loaded breakdown
 */
export interface DomainDrawerData {
  /** Base domain info (from list response) */
  readonly base: DomainRow;
  
  /** Score breakdown (lazy loaded from dedicated endpoint) */
  readonly scoreBreakdown: DomainScoreBreakdown | null;
  
  /** Loading state for breakdown fetch */
  readonly isLoadingBreakdown: boolean;
  
  /** Error message if breakdown fetch failed */
  readonly breakdownError: string | null;
  
  /** 
   * EXPLICIT DEGRADED STATE FLAG
   * 
   * True when score breakdown is unavailable (backend 500/501 or not implemented).
   * UI MUST show: "Score breakdown unavailable (backend)" when true.
   * 
   * This is distinct from isLoadingBreakdown (still fetching) and 
   * breakdownError (transient error that might be retryable).
   */
  readonly isBreakdownUnavailable: boolean;
}

// ============================================================================
// SCORE BREAKDOWN
// ============================================================================

/**
 * Score breakdown from backend API
 * Maps to DomainScoreBreakdownResponse schema
 * 
 * NOTE: Backend endpoint returns 500 "not yet implemented" as of Phase 7 start.
 * This contract is defined for when the endpoint is wired.
 * 
 * FALLBACK: If endpoint unavailable, show base richness data only.
 */
export interface DomainScoreBreakdown {
  /** Campaign this breakdown belongs to */
  readonly campaignId: string;
  
  /** Domain name */
  readonly domain: string;
  
  /** Final computed score (0-100) */
  readonly final: number;
  
  /** Individual component scores */
  readonly components: ScoreComponents;
  
  /** Applied weights from scoring profile (optional) */
  readonly weights?: Readonly<Record<string, number>>;
  
  /** Parked penalty factor (0-1, multiplied against final) */
  readonly parkedPenaltyFactor?: number;
}

/**
 * Individual score components
 * Each component is normalized 0-1
 */
export interface ScoreComponents {
  /** Keyword density in content */
  readonly density: number;
  
  /** Keyword coverage across page sections */
  readonly coverage: number;
  
  /** Inverse of parked confidence (1 = definitely not parked) */
  readonly non_parked: number;
  
  /** Normalized content length */
  readonly content_length: number;
  
  /** Keyword presence in title */
  readonly title_keyword: number;
  
  /** Content freshness indicator */
  readonly freshness: number;
  
  /** Experimental TF component (optional) */
  readonly tf_lite?: number;
}

// ============================================================================
// KEYWORD DETAIL (Extended view for drawer)
// ============================================================================

/**
 * Expanded keyword view for drawer display
 * More detail than the summary in DomainListItem
 */
export interface DomainKeywordDetail {
  /** The keyword string */
  readonly keyword: string;
  
  /** Number of times keyword appears */
  readonly hits: number;
  
  /** Relevance weight (0-1) */
  readonly weight: number;
  
  /** Where keyword was found */
  readonly positions: readonly KeywordPosition[];
  
  /** Sentiment classification (optional) */
  readonly sentiment?: 'positive' | 'neutral' | 'negative';
}

/**
 * Keyword position in document
 */
export type KeywordPosition = 'title' | 'h1' | 'h2' | 'body' | 'meta' | 'url';

// ============================================================================
// CONTACT SIGNALS (For future Phase 7.3+)
// ============================================================================

/**
 * Contact signal extracted from domain
 */
export interface DomainContactSignal {
  /** Type of contact */
  readonly type: ContactSignalType;
  
  /** The actual contact value */
  readonly value: string;
  
  /** Confidence score (0-1) */
  readonly confidence: number;
  
  /** Where on page it was found */
  readonly source: string;
}

/**
 * Contact signal types
 */
export type ContactSignalType = 'email' | 'phone' | 'social' | 'form';

// ============================================================================
// FACTORY & UTILITIES
// ============================================================================

/**
 * Create initial drawer data from a domain row
 */
export function createDrawerData(domain: DomainRow): DomainDrawerData {
  return {
    base: domain,
    scoreBreakdown: null,
    isLoadingBreakdown: false,
    breakdownError: null,
    isBreakdownUnavailable: false,
  };
}

/**
 * Convert API response to internal score breakdown type
 */
export function mapApiScoreBreakdown(
  response: DomainScoreBreakdownResponse
): DomainScoreBreakdown {
  return {
    campaignId: response.campaignId,
    domain: response.domain,
    final: response.components?.density ?? 0, // TODO: Map actual final score when available
    components: {
      density: response.components?.density ?? 0,
      coverage: response.components?.coverage ?? 0,
      non_parked: response.components?.non_parked ?? 0,
      content_length: response.components?.content_length ?? 0,
      title_keyword: response.components?.title_keyword ?? 0,
      freshness: response.components?.freshness ?? 0,
      tf_lite: response.components?.tf_lite,
    },
    parkedPenaltyFactor: response.parkedPenaltyFactor,
  };
}

/**
 * Extract richness score fallback from domain features
 * Used when score breakdown endpoint is unavailable.
 * 
 * IMPORTANT: When using this fallback, set isBreakdownUnavailable=true
 * and UI must show: "Score breakdown unavailable (backend)"
 * 
 * @returns Richness score from features, or null if not present
 */
export function extractRichnessFromDomain(domain: DomainRow): number | null {
  return domain.features?.richness?.score ?? null;
}
