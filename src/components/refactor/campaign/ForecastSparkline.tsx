/**
 * ForecastSparkline Component (Phase 6)
 * Extended sparkline with forecast visualization and confidence bands
 */

import React, { useMemo } from 'react';
import { AggregateSnapshot } from '@/types/campaignMetrics';
import type { ForecastPoint } from '@/types/forecasting';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Badge from '@/components/ta/ui/badge/Badge';
import { TrendingUpIcon, TrendingDownIcon, ActivityIcon } from '@/icons';

/**
 * ForecastSparkline props
 */
export interface ForecastSparklineProps {
  snapshots: AggregateSnapshot[];
  forecast?: ForecastPoint[] | null;
  metricKey: keyof AggregateSnapshot['aggregates'];
  width?: number;
  height?: number;
  showForecastBands?: boolean;
  showForecastSeparator?: boolean;
  forecastMethod?: 'server' | 'client' | null;
  className?: string;
  onClick?: () => void;
}

/**
 * Data point for sparkline rendering
 */
interface SparklinePoint {
  x: number;
  y: number;
  value: number;
  timestamp: string;
  isForecast: boolean;
  confidence?: { lower: number; upper: number };
}

/**
 * Forecast sparkline component with confidence bands
 */
export function ForecastSparkline({
  snapshots,
  forecast = null,
  metricKey,
  width = 120,
  height = 40,
  showForecastBands = process.env.NEXT_PUBLIC_ENABLE_FORECAST_BANDS !== 'false',
  showForecastSeparator = true,
  forecastMethod = null,
  className = '',
  onClick
}: ForecastSparklineProps) {
  // Combine historical and forecast data
  const { points, historicalCount, trend } = useMemo(() => {
    const historicalPoints: SparklinePoint[] = snapshots.map((snapshot, index) => {
      const value = snapshot.aggregates[metricKey] as number;
      return {
        x: index,
        y: 0, // Will be calculated after normalization
        value,
        timestamp: snapshot.timestamp,
        isForecast: false
      };
    });

    const forecastPoints: SparklinePoint[] = forecast?.map((point, index) => ({
      x: snapshots.length + index,
      y: 0, // Will be calculated after normalization
      value: point.value,
      timestamp: point.timestamp,
      isForecast: true,
      confidence: {
        lower: point.lower,
        upper: point.upper
      }
    })) || [];

    const allPoints = [...historicalPoints, ...forecastPoints];
    
    if (allPoints.length === 0) {
      return { points: [], historicalCount: 0, trend: 'flat' as const };
    }

    // Calculate Y coordinates based on value range
    const allValues = allPoints.map(p => p.value);
    const confidenceValues = forecastPoints.flatMap(p => 
      p.confidence ? [p.confidence.lower, p.confidence.upper] : []
    );
    
    const minValue = Math.min(...allValues, ...confidenceValues);
    const maxValue = Math.max(...allValues, ...confidenceValues);
    const valueRange = maxValue - minValue;
    
    // Normalize Y coordinates
    const normalizedPoints = allPoints.map(point => ({
      ...point,
      x: (point.x / (allPoints.length - 1)) * (width - 8) + 4, // Add padding
      y: valueRange > 0 
        ? height - 4 - ((point.value - minValue) / valueRange) * (height - 8)
        : height / 2
    }));

    // Calculate trend from historical data
    const historicalValues = historicalPoints.map(p => p.value);
    const trend = calculateTrend(historicalValues);

    return { 
      points: normalizedPoints, 
      historicalCount: snapshots.length,
      trend 
    };
  }, [snapshots, forecast, metricKey, width, height]);

  // Generate SVG path for historical data
  const historicalPath = useMemo(() => {
    const historicalPoints = points.slice(0, historicalCount);
    if (historicalPoints.length < 2) return '';

    return 'M ' + historicalPoints.map(p => `${p.x},${p.y}`).join(' L ');
  }, [points, historicalCount]);

  // Generate SVG path for forecast data
  const forecastPath = useMemo(() => {
    if (!forecast || points.length <= historicalCount) return '';

    const forecastPoints = points.slice(historicalCount - 1); // Include connection point
    if (forecastPoints.length < 2) return '';

    return 'M ' + forecastPoints.map(p => `${p.x},${p.y}`).join(' L ');
  }, [points, forecast, historicalCount]);

  // Generate confidence band path
  const confidenceBandPath = useMemo(() => {
    if (!forecast || !showForecastBands || points.length <= historicalCount) return '';

    const forecastPoints = points.slice(historicalCount);
    if (forecastPoints.length === 0) return '';

    // Calculate confidence band Y coordinates
    const allValues = points.map(p => p.value);
    const confidenceValues = forecastPoints.flatMap(p => 
      p.confidence ? [p.confidence.lower, p.confidence.upper] : []
    );
    
    const minValue = Math.min(...allValues, ...confidenceValues);
    const maxValue = Math.max(...allValues, ...confidenceValues);
    const valueRange = maxValue - minValue;

    const upperPath = forecastPoints.map(p => {
      if (!p.confidence) return null;
      const y = valueRange > 0 
        ? height - 4 - ((p.confidence.upper - minValue) / valueRange) * (height - 8)
        : height / 2;
      return `${p.x},${y}`;
    }).filter(Boolean).join(' L ');

    const lowerPath = forecastPoints.map(p => {
      if (!p.confidence) return null;
      const y = valueRange > 0 
        ? height - 4 - ((p.confidence.lower - minValue) / valueRange) * (height - 8)
        : height / 2;
      return `${p.x},${y}`;
    }).filter(Boolean).reverse().join(' L ');

    if (!upperPath || !lowerPath) return '';

    return `M ${upperPath} L ${lowerPath} Z`;
  }, [points, forecast, showForecastBands, historicalCount, height]);

  // Separator line between historical and forecast
  const separatorX = historicalCount > 0 ? 
    ((historicalCount - 1) / Math.max(points.length - 1, 1)) * (width - 8) + 4 : 
    width / 2;

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={`relative inline-block ${onClick ? 'cursor-pointer' : ''} ${className}`}
            onClick={handleClick}
          >
            <svg 
              width={width} 
              height={height} 
              className="overflow-visible"
              style={{ minWidth: width, minHeight: height }}
            >
              {/* Confidence band (rendered first, behind the line) */}
              {confidenceBandPath && (
                <path
                  d={confidenceBandPath}
                  fill="rgba(59, 130, 246, 0.1)"
                  stroke="none"
                  className="forecast-confidence-band"
                />
              )}

              {/* Historical data line */}
              {historicalPath && (
                <path
                  d={historicalPath}
                  fill="none"
                  stroke="rgb(59, 130, 246)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="historical-line"
                />
              )}

              {/* Forecast data line */}
              {forecastPath && (
                <path
                  d={forecastPath}
                  fill="none"
                  stroke="rgb(59, 130, 246)"
                  strokeWidth="1.5"
                  strokeDasharray="4,4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="forecast-line"
                />
              )}

              {/* Separator line */}
              {showForecastSeparator && forecast && forecast.length > 0 && (
                <line
                  x1={separatorX}
                  y1={4}
                  x2={separatorX}
                  y2={height - 4}
                  stroke="rgb(156, 163, 175)"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                  className="forecast-separator"
                />
              )}

              {/* Data points */}
              {points.map((point, index) => (
                <circle
                  key={index}
                  cx={point.x}
                  cy={point.y}
                  r={point.isForecast ? 2 : 1.5}
                  fill={point.isForecast ? "rgb(59, 130, 246)" : "rgb(37, 99, 235)"}
                  stroke={point.isForecast ? "white" : "none"}
                  strokeWidth={point.isForecast ? 1 : 0}
                  className={point.isForecast ? "forecast-point" : "historical-point"}
                />
              ))}
            </svg>

            {/* Status indicators */}
            <div className="absolute -top-1 -right-1 flex gap-1">
              {forecastMethod && (
                <Badge 
                  color={forecastMethod === 'server' ? 'primary' : 'light'} 
                  size="sm"
                  className="text-xs px-1 py-0"
                >
                  {forecastMethod === 'server' ? 'ML' : 'Est'}
                </Badge>
              )}
              
              {trend !== 'flat' && (
                <div className="flex items-center">
                  {trend === 'up' ? (
                    <TrendingUpIcon className="w-3 h-3 text-green-500" />
                  ) : (
                    <TrendingDownIcon className="w-3 h-3 text-red-500" />
                  )}
                </div>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ActivityIcon className="w-4 h-4" />
              <span className="font-medium">{formatMetricName(metricKey)}</span>
            </div>
            
            <div className="space-y-1 text-xs">
              <div>Historical: {historicalCount} points</div>
              {forecast && forecast.length > 0 && (
                <div>Forecast: {forecast.length} points ({forecastMethod || 'unknown'})</div>
              )}
              
              {points.length > 0 && (
                <div>
                  Current: {formatMetricValue(metricKey, points[historicalCount - 1]?.value ?? 0)}
                </div>
              )}
              
              {forecast && forecast.length > 0 && (
                <div>
                  Projected: {formatMetricValue(metricKey, forecast[forecast.length - 1]?.value ?? 0)}
                  {(forecast[forecast.length - 1]?.lower !== undefined) && (
                    <span className="text-gray-500">
                      {' '}({formatMetricValue(metricKey, forecast[forecast.length - 1]?.lower ?? 0)} - {formatMetricValue(metricKey, forecast[forecast.length - 1]?.upper ?? 0)})
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Calculate trend direction from values
 */
function calculateTrend(values: number[]): 'up' | 'down' | 'flat' {
  if (values.length < 2) return 'flat';
  
  const first = values[0];
  const last = values[values.length - 1];
  
  if (first === undefined || last === undefined) return 'flat';
  
  const percentChange = Math.abs((last - first) / first) * 100;
  
  if (percentChange < 5) return 'flat'; // Less than 5% change is considered flat
  
  return last > first ? 'up' : 'down';
}

/**
 * Format metric name for display
 */
function formatMetricName(metricKey: string): string {
  const names: Record<string, string> = {
    totalDomains: 'Total Domains',
    successRate: 'Success Rate',
    avgLeadScore: 'Avg Lead Score',
    dnsSuccessRate: 'DNS Success Rate',
    httpSuccessRate: 'HTTP Success Rate'
  };
  
  return names[metricKey] || metricKey;
}

/**
 * Format metric value for display
 */
function formatMetricValue(metricKey: string, value: number): string {
  if (isNaN(value)) return 'N/A';
  
  const percentageMetrics = ['successRate', 'dnsSuccessRate', 'httpSuccessRate'];
  
  if (percentageMetrics.includes(metricKey)) {
    return `${(value * 100).toFixed(1)}%`;
  }
  
  if (metricKey === 'totalDomains') {
    return value.toFixed(0);
  }
  
  return value.toFixed(1);
}

/**
 * Compact forecast sparkline for dashboard use
 */
export function CompactForecastSparkline({
  snapshots,
  forecast,
  metricKey,
  className = ''
}: Pick<ForecastSparklineProps, 'snapshots' | 'forecast' | 'metricKey' | 'className'>) {
  return (
    <ForecastSparkline
      snapshots={snapshots}
      forecast={forecast}
      metricKey={metricKey}
      width={80}
      height={24}
      showForecastBands={false}
      showForecastSeparator={false}
      className={className}
    />
  );
}