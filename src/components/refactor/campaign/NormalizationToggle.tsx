/**
 * NormalizationToggle Component (Phase 6)
 * Toggle between raw and normalized metric views with benchmark metadata
 */

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, TrendingUp, TrendingDown } from 'lucide-react';
import { isNormalizationAvailable } from '@/services/campaignMetrics/normalizationService';

/**
 * Normalization toggle props
 */
export interface NormalizationToggleProps {
  showNormalized: boolean;
  onToggle: (show: boolean) => void;
  loading?: boolean;
  error?: string | null;
  benchmarkVersion?: string | null;
  disabled?: boolean;
  className?: string;
}

/**
 * Normalization toggle component
 */
export function NormalizationToggle({
  showNormalized,
  onToggle,
  loading = false,
  error = null,
  benchmarkVersion = null,
  disabled = false,
  className = ''
}: NormalizationToggleProps) {
  // Don't render if normalization is not available
  if (!isNormalizationAvailable()) {
    return null;
  }

  const isDisabled = disabled || loading || !!error;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">
          Raw
        </span>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                <Switch
                  checked={showNormalized}
                  onCheckedChange={onToggle}
                  disabled={isDisabled}
                  size="sm"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                <p className="font-medium">
                  {showNormalized ? 'Normalized View' : 'Raw View'}
                </p>
                <p className="text-xs">
                  {showNormalized 
                    ? 'Metrics scaled relative to industry benchmarks'
                    : 'Original metric values without scaling'
                  }
                </p>
                {benchmarkVersion && (
                  <p className="text-xs text-gray-500">
                    Benchmark: {benchmarkVersion}
                  </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <span className="text-sm font-medium text-gray-700">
          Normalized
        </span>
      </div>

      {/* Status indicators */}
      <div className="flex items-center gap-1">
        {loading && (
          <Badge variant="secondary" className="text-xs">
            <div className="animate-spin w-3 h-3 border border-gray-300 border-t-blue-500 rounded-full mr-1" />
            Loading
          </Badge>
        )}

        {error && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="destructive" className="text-xs cursor-help">
                  <TrendingDown className="w-3 h-3 mr-1" />
                  Error
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{error}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {!loading && !error && benchmarkVersion && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-xs cursor-help">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Ready
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p className="font-medium text-xs">Normalization Ready</p>
                  <p className="text-xs">Benchmark: {benchmarkVersion}</p>
                  <p className="text-xs text-gray-500">
                    Toggle to compare raw vs industry-scaled metrics
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {!loading && !error && !benchmarkVersion && showNormalized && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="text-xs cursor-help">
                  <Info className="w-3 h-3 mr-1" />
                  No Data
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Benchmark data not available</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}

/**
 * Compact normalization toggle for space-constrained areas
 */
export function CompactNormalizationToggle({
  showNormalized,
  onToggle,
  loading = false,
  disabled = false,
  className = ''
}: Pick<NormalizationToggleProps, 'showNormalized' | 'onToggle' | 'loading' | 'disabled' | 'className'>) {
  if (!isNormalizationAvailable()) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1 ${className}`}>
            <Switch
              checked={showNormalized}
              onCheckedChange={onToggle}
              disabled={disabled || loading}
              size="sm"
            />
            <span className="text-xs text-gray-600">
              {showNormalized ? 'Norm.' : 'Raw'}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {showNormalized 
              ? 'Switch to raw metrics'
              : 'Switch to normalized metrics'
            }
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Normalization indicator badge (read-only)
 */
export function NormalizationIndicator({
  isNormalized,
  benchmarkVersion,
  className = ''
}: {
  isNormalized: boolean;
  benchmarkVersion?: string | null;
  className?: string;
}) {
  if (!isNormalizationAvailable() || !isNormalized) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`text-xs cursor-help ${className}`}>
            <TrendingUp className="w-3 h-3 mr-1" />
            Normalized
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium text-xs">Normalized Metrics</p>
            <p className="text-xs">Values scaled relative to industry benchmarks</p>
            {benchmarkVersion && (
              <p className="text-xs text-gray-500">
                Benchmark: {benchmarkVersion}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}