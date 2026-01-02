/**
 * DomainDrawerRichness - Richness score display with breakdown
 * 
 * Displays:
 * - Aggregate richness score (always available from domain.features.richness)
 * - Score breakdown components (when available)
 * - Degraded state messaging (when breakdown unavailable)
 * 
 * INVARIANT: Per Phase 7.3, when isBreakdownUnavailable=true:
 *   - Show FallbackRichness with aggregate score
 *   - Show DomainDrawerDegraded with explicit messaging
 *   - Never silently hide the breakdown section
 * 
 * @see Phase 7.3 directive: "Respect degraded backend state"
 */

'use client';

import React from 'react';
import { TrendingUpIcon, ActivityIcon, GaugeIcon } from '@/icons';
import { cn } from '@/lib/utils';
import type { DomainRow } from '@/types/explorer/state';
import type { DomainScoreBreakdown, ScoreComponents } from '@/types/explorer/drawer';
import { DomainDrawerDegraded, FallbackRichness } from './DomainDrawerDegraded';
import { DomainDrawerSkeleton } from './DomainDrawerSkeleton';

// ============================================================================
// SCORE COMPONENT DISPLAY
// ============================================================================

interface ScoreBarProps {
  label: string;
  value: number; // 0-1
  description?: string;
}

const ScoreBar = React.memo(function ScoreBar({ label, value, description }: ScoreBarProps) {
  const percentage = Math.round(value * 100);
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-500 dark:text-gray-400">{label}</span>
        <span className="font-medium tabular-nums text-gray-800 dark:text-white">{percentage}%</span>
      </div>
      <div 
        className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700"
        data-testid={`score-bar-${label.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <div 
          className="h-2 rounded-full bg-brand-500" 
          style={{ width: `${percentage}%` }} 
        />
      </div>
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      )}
    </div>
  );
});

ScoreBar.displayName = 'ScoreBar';

// ============================================================================
// BREAKDOWN DISPLAY
// ============================================================================

interface BreakdownDisplayProps {
  breakdown: DomainScoreBreakdown;
}

const BreakdownDisplay = React.memo(function BreakdownDisplay({ 
  breakdown,
}: BreakdownDisplayProps) {
  const { components, final, parkedPenaltyFactor } = breakdown;

  // Component descriptions for tooltips
  const componentMeta: Record<keyof ScoreComponents, { label: string; description: string }> = {
    density: { label: 'Keyword Density', description: 'Keyword concentration in content' },
    coverage: { label: 'Coverage', description: 'Keyword presence across page sections' },
    non_parked: { label: 'Non-Parked', description: 'Confidence domain is not parked' },
    content_length: { label: 'Content Length', description: 'Normalized content volume' },
    title_keyword: { label: 'Title Keywords', description: 'Keywords in page title' },
    freshness: { label: 'Freshness', description: 'Content recency indicator' },
    tf_lite: { label: 'TF Score', description: 'Experimental term frequency' },
  };

  return (
    <div className="space-y-4" data-testid="domain-drawer-breakdown">
      {/* Final score */}
      <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-2">
          <GaugeIcon className="h-5 w-5 text-brand-500" />
          <span className="font-medium text-gray-800 dark:text-white">Final Score</span>
        </div>
        <span className="text-2xl font-bold tabular-nums text-gray-800 dark:text-white">{final}</span>
      </div>

      {/* Parked penalty if applied */}
      {parkedPenaltyFactor !== undefined && parkedPenaltyFactor < 1 && (
        <div className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <ActivityIcon className="h-4 w-4" />
          Parked penalty applied: {Math.round((1 - parkedPenaltyFactor) * 100)}% reduction
        </div>
      )}

      {/* Component breakdown */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <TrendingUpIcon className="h-4 w-4" />
          Score Components
        </h4>
        
        {(Object.keys(components) as Array<keyof ScoreComponents>)
          .filter(key => components[key] !== undefined)
          .map(key => (
            <ScoreBar
              key={key}
              label={componentMeta[key]?.label ?? key}
              value={components[key] ?? 0}
              description={componentMeta[key]?.description}
            />
          ))
        }
      </div>
    </div>
  );
});

BreakdownDisplay.displayName = 'BreakdownDisplay';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export interface DomainDrawerRichnessProps {
  /** Domain data from explorer state */
  domain: DomainRow;
  /** Score breakdown (lazy loaded) */
  scoreBreakdown: DomainScoreBreakdown | null;
  /** Loading state for breakdown */
  isLoadingBreakdown: boolean;
  /** True when breakdown endpoint unavailable */
  isBreakdownUnavailable: boolean;
  /** Error from breakdown fetch */
  breakdownError: string | null;
  /** Retry callback for transient errors */
  onRetryBreakdown?: () => void;
  /** Additional className */
  className?: string;
}

/**
 * Richness score display with breakdown
 * Handles all states: loading, available, degraded, error
 */
export const DomainDrawerRichness = React.memo(function DomainDrawerRichness({
  domain,
  scoreBreakdown,
  isLoadingBreakdown,
  isBreakdownUnavailable,
  breakdownError,
  onRetryBreakdown,
  className,
}: DomainDrawerRichnessProps) {
  // Extract fallback score from domain features
  const fallbackScore = domain.features?.richness?.score ?? null;

  return (
    <div className={cn("rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]", className)} data-testid="domain-drawer-richness">
      <div className="p-4 pb-2">
        <h3 className="text-base font-semibold flex items-center gap-2 text-gray-800 dark:text-white">
          <GaugeIcon className="h-4 w-4" />
          Richness Score
        </h3>
      </div>
      
      <div className="p-4 pt-0 space-y-4">
        {/* Loading state */}
        {isLoadingBreakdown && (
          <DomainDrawerSkeleton variant="breakdown-only" />
        )}

        {/* Full breakdown available */}
        {!isLoadingBreakdown && scoreBreakdown && (
          <BreakdownDisplay breakdown={scoreBreakdown} />
        )}

        {/* Breakdown unavailable - show fallback with explicit messaging */}
        {!isLoadingBreakdown && !scoreBreakdown && isBreakdownUnavailable && (
          <>
            <FallbackRichness score={fallbackScore} />
            <DomainDrawerDegraded
              type="breakdown-unavailable"
            />
          </>
        )}

        {/* Transient error - can retry */}
        {!isLoadingBreakdown && !scoreBreakdown && breakdownError && !isBreakdownUnavailable && (
          <>
            <FallbackRichness score={fallbackScore} />
            <DomainDrawerDegraded
              type="breakdown-error"
              errorDetails={breakdownError}
              canRetry={!!onRetryBreakdown}
              onRetry={onRetryBreakdown}
            />
          </>
        )}

        {/* No breakdown, no error, not loading, not unavailable - initial state */}
        {!isLoadingBreakdown && !scoreBreakdown && !breakdownError && !isBreakdownUnavailable && (
          <FallbackRichness score={fallbackScore} />
        )}
      </div>
    </div>
  );
});

DomainDrawerRichness.displayName = 'DomainDrawerRichness';
