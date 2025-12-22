/**
 * DataGate Component (Phase 4)
 * Progressive disclosure - shows content only when condition is met
 * Otherwise shows a contextual placeholder or nothing
 * 
 * @see docs/CAMPAIGN_UI_REFACTOR_PLAN.md - Phase 4: Progressive Disclosure Gates
 */

import React from 'react';

export interface DataGatePlaceholderProps {
  /** Current campaign/execution phase for context */
  currentPhase?: string;
  /** Custom class for styling */
  className?: string;
}

export interface DataGateProps {
  /** Condition that must be true to show children */
  condition: boolean;
  /** Content to render when condition is true */
  children: React.ReactNode;
  /** Optional placeholder to show when condition is false. If undefined, renders nothing. */
  placeholder?: React.ReactNode | ((props: DataGatePlaceholderProps) => React.ReactNode);
  /** Current phase context passed to placeholder */
  currentPhase?: string;
  /** Container className */
  className?: string;
  /** Whether to preserve layout space when hidden (false = collapse) */
  preserveSpace?: boolean;
}

/**
 * Generic gate component for progressive disclosure.
 * Shows children only when condition is met.
 * 
 * Usage:
 * ```tsx
 * <DataGate condition={funnelData.generated > 0} placeholder={<FunnelPlaceholder />}>
 *   <FunnelSnapshot data={funnelData} />
 * </DataGate>
 * ```
 */
export function DataGate({
  condition,
  children,
  placeholder,
  currentPhase,
  className,
  preserveSpace = false,
}: DataGateProps) {
  if (condition) {
    return <>{children}</>;
  }

  // No placeholder and condition is false - render nothing
  if (!placeholder) {
    return preserveSpace ? <div className={className} /> : null;
  }

  // Render placeholder
  const placeholderContent = typeof placeholder === 'function'
    ? placeholder({ currentPhase, className })
    : placeholder;

  return <>{placeholderContent}</>;
}

/**
 * Type-safe gate for funnel data
 * Shows content only when domains have been generated
 */
export interface FunnelGateProps {
  /** Funnel data - gate opens when generated > 0 */
  funnelData: { generated: number } | null | undefined;
  children: React.ReactNode;
  placeholder?: React.ReactNode;
  currentPhase?: string;
}

export function FunnelGate({ funnelData, children, placeholder, currentPhase }: FunnelGateProps) {
  const hasData = Boolean(funnelData && funnelData.generated > 0);
  return (
    <DataGate 
      condition={hasData} 
      placeholder={placeholder}
      currentPhase={currentPhase}
    >
      {children}
    </DataGate>
  );
}

/**
 * Type-safe gate for lead results
 * Shows content only when HTTP validation has produced valid domains
 */
export interface LeadsGateProps {
  /** Funnel data - gate opens when httpValid > 0 */
  funnelData: { httpValid: number } | null | undefined;
  children: React.ReactNode;
  placeholder?: React.ReactNode;
  currentPhase?: string;
}

export function LeadsGate({ funnelData, children, placeholder, currentPhase }: LeadsGateProps) {
  const hasData = Boolean(funnelData && funnelData.httpValid > 0);
  return (
    <DataGate 
      condition={hasData} 
      placeholder={placeholder}
      currentPhase={currentPhase}
    >
      {children}
    </DataGate>
  );
}

/**
 * Type-safe gate for KPI/metrics data
 * Shows content only when domains have been analyzed
 */
export interface KpiGateProps {
  /** Metrics data - gate opens when totalAnalyzed > 0 */
  metricsData: { totalAnalyzed: number } | null | undefined;
  children: React.ReactNode;
  placeholder?: React.ReactNode;
  currentPhase?: string;
}

export function KpiGate({ metricsData, children, placeholder, currentPhase }: KpiGateProps) {
  const hasData = Boolean(metricsData && metricsData.totalAnalyzed > 0);
  return (
    <DataGate 
      condition={hasData} 
      placeholder={placeholder}
      currentPhase={currentPhase}
    >
      {children}
    </DataGate>
  );
}

/**
 * Type-safe gate for momentum/trend data
 * Shows content only when there are movers
 */
export interface MomentumGateProps {
  /** Momentum data - gate opens when moversUp or moversDown have items */
  momentumData: { moversUp?: unknown[]; moversDown?: unknown[] } | null | undefined;
  children: React.ReactNode;
  placeholder?: React.ReactNode;
  currentPhase?: string;
}

export function MomentumGate({ momentumData, children, placeholder, currentPhase }: MomentumGateProps) {
  const hasData = Boolean(
    momentumData && 
    ((momentumData.moversUp?.length || 0) > 0 || (momentumData.moversDown?.length || 0) > 0)
  );
  return (
    <DataGate 
      condition={hasData} 
      placeholder={placeholder}
      currentPhase={currentPhase}
    >
      {children}
    </DataGate>
  );
}

/**
 * Type-safe gate for recommendations
 * Shows content only when recommendations exist
 */
export interface RecommendationsGateProps {
  /** Recommendations data - gate opens when recommendations array has items */
  recommendationsData: { recommendations?: unknown[] } | null | undefined;
  children: React.ReactNode;
  placeholder?: React.ReactNode;
  currentPhase?: string;
}

export function RecommendationsGate({ recommendationsData, children, placeholder, currentPhase }: RecommendationsGateProps) {
  const hasData = Boolean(
    recommendationsData?.recommendations && 
    recommendationsData.recommendations.length > 0
  );
  return (
    <DataGate 
      condition={hasData} 
      placeholder={placeholder}
      currentPhase={currentPhase}
    >
      {children}
    </DataGate>
  );
}

/**
 * Type-safe gate for warning/quality data
 * Shows content only when warnings exist
 */
export interface WarningsGateProps {
  /** Warning data array - gate opens when warnings exist */
  warningData: unknown[];
  children: React.ReactNode;
  placeholder?: React.ReactNode;
  currentPhase?: string;
}

export function WarningsGate({ warningData, children, placeholder, currentPhase }: WarningsGateProps) {
  const hasData = warningData.length > 0;
  return (
    <DataGate 
      condition={hasData} 
      placeholder={placeholder}
      currentPhase={currentPhase}
    >
      {children}
    </DataGate>
  );
}
