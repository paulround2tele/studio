/**
 * Placeholder Components (Phase 4)
 * Phase-aware placeholders for progressive disclosure
 * 
 * These replace empty panels with helpful, contextual messaging
 * that tells users what needs to happen before data appears.
 * 
 * @see docs/CAMPAIGN_UI_REFACTOR_PLAN.md - Phase 4: Progressive Disclosure Gates
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { 
  FilterIcon, 
  BarChart3Icon, 
  UsersIcon, 
  TrendingUpIcon, 
  LightbulbIcon,
  WarningTriangleIcon,
  ClockIcon,
  CheckCircle2Icon,
  LoaderIcon,
} from '@/icons';

export interface PlaceholderProps {
  /** Current execution phase for context-aware messaging */
  currentPhase?: string;
  /** Optional custom className */
  className?: string;
  /** Whether the campaign is currently running (for loading states) */
  isRunning?: boolean;
}

/**
 * Helper: Get phase-specific context
 */
function getPhaseContext(phase?: string): { 
  isEarly: boolean; 
  hasStarted: boolean;
  phaseName: string;
} {
  const normalizedPhase = (phase || '').toLowerCase();
  
  const earlyPhases = ['pending', 'validation', 'discovery', 'dns'];
  const hasStarted = !['pending', 'idle', ''].includes(normalizedPhase);
  
  return {
    isEarly: earlyPhases.includes(normalizedPhase),
    hasStarted,
    phaseName: phase || 'pending',
  };
}

/**
 * Base placeholder wrapper with consistent styling
 */
function PlaceholderBase({ 
  icon: Icon, 
  title, 
  description, 
  hint,
  className,
  variant = 'default',
  compact = false,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  hint?: string;
  className?: string;
  variant?: 'default' | 'loading' | 'success';
  compact?: boolean;
}) {
  const iconVariants = {
    default: 'text-gray-400 dark:text-gray-500',
    loading: 'text-blue-400 dark:text-blue-500 animate-pulse',
    success: 'text-green-400 dark:text-green-500',
  };

  if (compact) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center gap-3 p-4 text-center",
          "bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200/60 dark:border-gray-700/60",
          className
        )}
      >
        <Icon className={cn("w-5 h-5 opacity-80", iconVariants[variant])} />
        <span className="text-sm text-gray-500 dark:text-gray-400">{description}</span>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center",
        "bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200/60 dark:border-gray-700/60",
        className
      )}
    >
      <div className={cn("mb-3 opacity-80", iconVariants[variant])}>
        <Icon className="w-10 h-10" />
      </div>
      <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">
        {title}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
        {description}
      </p>
      {hint && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 italic">
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * Funnel placeholder - shown until domains are generated
 */
export function FunnelPlaceholder({ currentPhase, className, isRunning }: PlaceholderProps) {
  const { isEarly, hasStarted } = getPhaseContext(currentPhase);
  
  if (!hasStarted) {
    return (
      <PlaceholderBase
        icon={FilterIcon}
        title="Conversion Funnel"
        description="Start the campaign to see domains flow through the funnel stages."
        hint="Funnel shows: Generated → DNS Valid → HTTP Valid → Analyzed → Leads"
        className={className}
      />
    );
  }
  
  if (isRunning && isEarly) {
    return (
      <PlaceholderBase
        icon={LoaderIcon}
        title="Generating Domains..."
        description="The discovery phase is generating domain candidates. Funnel will update shortly."
        variant="loading"
        className={className}
      />
    );
  }
  
  return (
    <PlaceholderBase
      icon={FilterIcon}
      title="No Domains Yet"
      description="Funnel data will appear once domain generation begins."
      className={className}
    />
  );
}

/**
 * KPI placeholder - shown until domains are analyzed
 */
export function KpiPlaceholder({ currentPhase, className, isRunning }: PlaceholderProps) {
  const { isEarly, hasStarted } = getPhaseContext(currentPhase);
  
  if (!hasStarted) {
    return (
      <PlaceholderBase
        icon={BarChart3Icon}
        title="Key Metrics"
        description="Performance metrics will appear once analysis begins."
        hint="Tracks: High Potential, Leads, Keyword Coverage, Quality Scores"
        className={className}
        compact={true}
      />
    );
  }
  
  if (isRunning && isEarly) {
    return (
      <PlaceholderBase
        icon={ClockIcon}
        title="Waiting for Analysis"
        description="Metrics require completed HTTP validation. Currently in the early pipeline stages."
        variant="loading"
        className={className}
        compact={true}
      />
    );
  }
  
  return (
    <PlaceholderBase
      icon={BarChart3Icon}
      title="No Metrics Yet"
      description="Analysis phase must complete before metrics are available."
      className={className}
      compact={true}
    />
  );
}

/**
 * Leads placeholder - shown until HTTP validation produces valid domains
 */
export function LeadsPlaceholder({ currentPhase, className, isRunning }: PlaceholderProps) {
  const { isEarly, hasStarted } = getPhaseContext(currentPhase);
  
  if (!hasStarted) {
    return (
      <PlaceholderBase
        icon={UsersIcon}
        title="Lead Results"
        description="Validated leads will appear after HTTP validation completes."
        hint="Leads are domains that passed all validation stages"
        className={className}
      />
    );
  }
  
  if (isRunning && isEarly) {
    return (
      <PlaceholderBase
        icon={LoaderIcon}
        title="Validating Domains..."
        description="DNS and HTTP validation in progress. Leads will appear once domains pass validation."
        variant="loading"
        className={className}
      />
    );
  }
  
  return (
    <PlaceholderBase
      icon={UsersIcon}
      title="No Leads Yet"
      description="No domains have passed HTTP validation yet."
      className={className}
    />
  );
}

/**
 * Momentum placeholder - shown until trend data exists
 */
export function MomentumPlaceholder({ currentPhase, className }: PlaceholderProps) {
  const { hasStarted } = getPhaseContext(currentPhase);
  
  if (!hasStarted) {
    return (
      <PlaceholderBase
        icon={TrendingUpIcon}
        title="Momentum Analysis"
        description="Trend data requires multiple analysis runs to detect changes over time."
        className={className}
      />
    );
  }
  
  return (
    <PlaceholderBase
      icon={TrendingUpIcon}
      title="No Momentum Data"
      description="Momentum tracking requires historical comparison data from previous runs."
      hint="Re-run analysis to generate trend comparisons"
      className={className}
    />
  );
}

/**
 * Recommendations placeholder - shown when no recommendations exist
 */
export function RecommendationsPlaceholder({ currentPhase, className, isRunning }: PlaceholderProps) {
  const { hasStarted } = getPhaseContext(currentPhase);
  
  if (!hasStarted) {
    return (
      <PlaceholderBase
        icon={LightbulbIcon}
        title="Recommendations"
        description="AI-powered suggestions will appear based on campaign performance."
        className={className}
      />
    );
  }
  
  if (isRunning) {
    return (
      <PlaceholderBase
        icon={ClockIcon}
        title="Analyzing..."
        description="Recommendations are generated after sufficient data is collected."
        variant="loading"
        className={className}
      />
    );
  }
  
  return (
    <PlaceholderBase
      icon={CheckCircle2Icon}
      title="No Recommendations"
      description="Campaign is performing well. No optimization suggestions at this time."
      variant="success"
      className={className}
    />
  );
}

/**
 * Warnings placeholder - shown when no quality issues exist (positive message)
 */
export function WarningsPlaceholder({ currentPhase, className }: PlaceholderProps) {
  const { hasStarted } = getPhaseContext(currentPhase);
  
  if (!hasStarted) {
    return (
      <PlaceholderBase
        icon={WarningTriangleIcon}
        title="Quality Issues"
        description="Quality analysis will identify potential issues during processing."
        className={className}
      />
    );
  }
  
  // Positive message when no warnings exist
  return (
    <PlaceholderBase
      icon={CheckCircle2Icon}
      title="No Quality Issues"
      description="All analyzed domains are passing quality checks."
      variant="success"
      className={className}
    />
  );
}
