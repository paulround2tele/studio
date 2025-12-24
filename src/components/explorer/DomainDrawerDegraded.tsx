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
import { AlertTriangle, RefreshCw, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

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
    'breakdown-unavailable': 'Score breakdown not available yet (domain pending analysis)',
    'breakdown-error': 'Failed to load score breakdown',
    'partial-data': 'Some data could not be loaded',
  };

  const displayMessage = message ?? defaultMessages[type];

  // Visual treatment varies by severity
  const variants: Record<DegradedStateType, { icon: React.ElementType; variant: 'default' | 'destructive' }> = {
    'breakdown-unavailable': { icon: Info, variant: 'default' },
    'breakdown-error': { icon: AlertCircle, variant: 'destructive' },
    'partial-data': { icon: AlertTriangle, variant: 'default' },
  };

  const { icon: Icon, variant } = variants[type];

  return (
    <Alert 
      variant={variant}
      className={cn('my-4', className)}
      data-testid="domain-drawer-degraded"
      data-degraded-type={type}
    >
      <Icon className="h-4 w-4" />
      <AlertTitle className="text-sm font-medium">
        {type === 'breakdown-unavailable' ? 'Limited Data' : 'Data Issue'}
      </AlertTitle>
      <AlertDescription className="mt-1 text-sm">
        <span>{displayMessage}</span>
        
        {errorDetails && (
          <span className="block mt-1 text-xs text-muted-foreground font-mono">
            {errorDetails}
          </span>
        )}

        {canRetry && onRetry && (
          <Button
            variant="outline"
            size="sm"
            className="mt-2 h-7 text-xs"
            onClick={onRetry}
            data-testid="domain-drawer-degraded-retry"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
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
        className={cn("text-sm text-muted-foreground", className)}
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
        <span className="text-sm text-muted-foreground">/ 100</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Aggregate richness score from features
      </p>
    </div>
  );
});

FallbackRichness.displayName = 'FallbackRichness';
