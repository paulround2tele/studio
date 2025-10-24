/**
 * Delta Badge Component (Phase 3)
 * Shows metric changes with directional indicators and accessible labels
 */

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DeltaMetrics } from '@/types/campaignMetrics';
import { getDeltaColor, formatDeltaValue } from '@/services/campaignMetrics/deltasService';

export interface DeltaBadgeProps {
  /**
   * Delta metrics to display
   */
  delta: DeltaMetrics;
  
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * Whether to show the icon
   */
  showIcon?: boolean;
  
  /**
   * Whether to show the label (metric name)
   */
  showLabel?: boolean;
  
  /**
   * Custom className
   */
  className?: string;
  
  /**
   * Custom aria-label for accessibility
   */
  ariaLabel?: string;
}

const sizeStyles = {
  sm: {
    container: 'px-2 py-1 text-xs',
    icon: 'w-3 h-3',
    gap: 'gap-1'
  },
  md: {
    container: 'px-3 py-1.5 text-sm',
    icon: 'w-4 h-4', 
    gap: 'gap-1.5'
  },
  lg: {
    container: 'px-4 py-2 text-base',
    icon: 'w-5 h-5',
    gap: 'gap-2'
  }
};

export function DeltaBadge({
  delta,
  size = 'md',
  showIcon = true,
  showLabel = false,
  className,
  ariaLabel
}: DeltaBadgeProps) {
  const { direction, key, percent: _percent } = delta;
  const styles = sizeStyles[size];
  const color = getDeltaColor(delta);
  const formattedValue = formatDeltaValue(delta);

  // Get appropriate icon based on direction
  const IconComponent = direction === 'up' ? TrendingUp : 
                       direction === 'down' ? TrendingDown : Minus;

  // Generate accessible label
  const accessibleLabel = ariaLabel || generateAccessibleLabel(delta);

  // Get background color with appropriate opacity
  const backgroundColor = direction === 'flat' ? '#f3f4f6' : `${color}15`;
  const textColor = direction === 'flat' ? '#6b7280' : color;
  const borderColor = direction === 'flat' ? '#e5e7eb' : `${color}30`;

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border',
        styles.container,
        styles.gap,
        className
      )}
      style={{
        backgroundColor,
        color: textColor,
        borderColor
      }}
      role="status"
      aria-label={accessibleLabel}
      title={`${formatMetricName(key)}: ${formattedValue} change`}
    >
      {showIcon && (
        <IconComponent 
          className={cn(styles.icon)} 
          aria-hidden="true"
        />
      )}
      
      {showLabel && (
        <span className="font-normal">
          {formatMetricName(key)}:
        </span>
      )}
      
      <span className="font-semibold">
        {formattedValue}
      </span>
    </span>
  );
}

/**
 * Generate accessible label for screen readers
 */
function generateAccessibleLabel(delta: DeltaMetrics): string {
  const { key, direction, percent, absolute: _absolute } = delta;
  const metricName = formatMetricName(key);
  
  let changeDescription: string;
  
  if (direction === 'flat') {
    changeDescription = 'no significant change';
  } else {
    const directionText = direction === 'up' ? 'increased' : 'decreased';
    const percentText = Math.abs(percent) < 1 ? 'less than 1%' : `${Math.abs(percent).toFixed(1)}%`;
    changeDescription = `${directionText} by ${percentText}`;
  }
  
  return `${metricName} ${changeDescription}`;
}

/**
 * Format metric key for display
 */
function formatMetricName(key: string): string {
  const nameMap: Record<string, string> = {
    totalDomains: 'Total Domains',
    successRate: 'Success Rate',
    avgLeadScore: 'Avg Lead Score',
    dnsSuccessRate: 'DNS Success Rate',
    httpSuccessRate: 'HTTP Success Rate',
    highPotentialCount: 'High Potential',
    leadsCount: 'Leads Count',
    avgRichness: 'Avg Richness',
    warningRate: 'Warning Rate',
    keywordCoverage: 'Keyword Coverage',
    medianGain: 'Median Gain'
  };

  return nameMap[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
}

/**
 * Delta Badge with compact layout for dense displays
 */
export function CompactDeltaBadge({
  delta,
  className,
  ...props
}: Omit<DeltaBadgeProps, 'size' | 'showLabel'>) {
  return (
    <DeltaBadge
      delta={delta}
      size="sm"
      showLabel={false}
      className={cn('rounded-md', className)}
      {...props}
    />
  );
}

/**
 * Delta Badge with label for standalone displays
 */
export function LabeledDeltaBadge({
  delta,
  className,
  ...props
}: Omit<DeltaBadgeProps, 'showLabel'>) {
  return (
    <DeltaBadge
      delta={delta}
      showLabel={true}
      className={cn('justify-start', className)}
      {...props}
    />
  );
}

export default DeltaBadge;