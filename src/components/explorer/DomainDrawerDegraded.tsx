/**
 * DomainDrawerDegraded - Explicit degraded state messaging
 * 
 * CRITICAL: Per Phase 7.3 directive, we must NEVER silently fall back.
 * When backend returns 500 for score breakdown, users must see this.
 * 
 * Messaging hierarchy:
 * 1. isBreakdownUnavailable=true → "Score breakdown unavailable (backend)"
 * 2. breakdownError → Show transient error with retry option
 * 3. isLoadingBreakdown → Show skeleton (handled by parent)
 * 
 * @see Phase 7.3 directive: "Surface degraded drawer state explicitly"
 */

'use client';

import React from 'react';
import { RefreshIcon } from '@/icons';
import { cn } from '@/lib/utils';
import Alert from '@/components/ta/ui/alert/Alert';
import Button from '@/components/ta/ui/button/Button';

// ============================================================================
// DEGRADED STATE TYPES
// ============================================================================

export type DegradedStateType = 
  | 'breakdown-unavailable'   // Backend 500/501 - permanent for now
  | 'breakdown-error'         // Transient error - can retry
  | 'partial-data';           // Some fields missing but usable

export interface DegradedStateConfig {
  type: DegradedStateType;
  message?: string;
  canRetry?: boolean;
  onRetry?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export interface DomainDrawerDegradedProps {
  /** Type of degraded state */
  type: DegradedStateType;
  /** Custom message (overrides default) */
  message?: string;
  /** Error details for transient errors */
  errorDetails?: string;
  /** Whether retry is available */
  canRetry?: boolean;
  /** Retry callback */
  onRetry?: () => void;
  /** Additional className */
  className?: string;
}

/**
 * Explicit degraded state messaging component
 * 
 * INVARIANT: Never hide degraded state - users must know when data is incomplete.
 */
export const DomainDrawerDegraded = React.memo(function DomainDrawerDegraded({
  type,
  message,
  errorDetails,
  canRetry = false,
  onRetry,
  className,
}: DomainDrawerDegradedProps) {
  // Default messages per type
  const defaultMessages: Record<DegradedStateType, string> = {
    'breakdown-unavailable': 'Score breakdown unavailable (backend endpoint not yet implemented)',
    'breakdown-error': 'Failed to load score breakdown',
    'partial-data': 'Some data could not be loaded',
  };

  const displayMessage = message ?? defaultMessages[type];

  // Visual treatment varies by severity - map to TailAdmin Alert variants
  const variants: Record<DegradedStateType, 'info' | 'error' | 'warning'> = {
    'breakdown-unavailable': 'info',
    'breakdown-error': 'error',
    'partial-data': 'warning',
  };

  const alertVariant = variants[type];
  const title = type === 'breakdown-unavailable' ? 'Limited Data' : 'Data Issue';
  
  // Build message with error details if present
  const fullMessage = errorDetails 
    ? `${displayMessage}\n${errorDetails}`
    : displayMessage;

  return (
    <div 
      className={cn('my-4', className)}
      data-testid="domain-drawer-degraded"
      data-degraded-type={type}
    >
      <Alert 
        variant={alertVariant}
        title={title}
        message={fullMessage}
      />
      
      {canRetry && onRetry && (
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={onRetry}
          data-testid="domain-drawer-degraded-retry"
          startIcon={<RefreshIcon className="w-3 h-3" />}
        >
          Retry
        </Button>
      )}
    </div>
  );
});

DomainDrawerDegraded.displayName = 'DomainDrawerDegraded';

// ============================================================================
// FALLBACK RICHNESS DISPLAY
// ============================================================================

export interface FallbackRichnessProps {
  /** Richness score from domain features (0-100) */
  score: number | null;
  /** Additional className */
  className?: string;
}

/**
 * Fallback richness display when breakdown is unavailable
 * Shows the aggregate score without component breakdown
 */
export const FallbackRichness = React.memo(function FallbackRichness({
  score,
  className,
}: FallbackRichnessProps) {
  if (score === null) {
    return (
      <div 
        className={cn("text-sm text-gray-500 dark:text-gray-400", className)}
        data-testid="domain-drawer-richness-unavailable"
      >
        Richness score not available
      </div>
    );
  }

  // Color based on score
  const getScoreColor = (s: number): string => {
    if (s >= 70) return 'text-green-600 dark:text-green-400';
    if (s >= 40) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div 
      className={cn("space-y-2", className)}
      data-testid="domain-drawer-richness-fallback"
    >
      <div className="flex items-baseline gap-2">
        <span className={cn("text-3xl font-bold tabular-nums", getScoreColor(score))}>
          {score}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">/ 100</span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Aggregate richness score from features
      </p>
    </div>
  );
});

FallbackRichness.displayName = 'FallbackRichness';
