/**
 * Adaptive Timeline Component (Phase 11)
 * Dynamic downsampling with focus+context rendering and semantic emphasis
 */

'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Dot } from 'recharts';
import { useAdaptiveVisualization } from '../../../lib/feature-flags-simple';
import { adaptiveTimelineService, TimeSeriesPoint, SemanticHighlight, MultiResolutionSeries } from '../../../services/viz/adaptiveTimelineService';
import { telemetryService } from '../../../services/campaignMetrics/telemetryService';

/**
 * Component props
 */
export interface AdaptiveTimelineProps {
  metricKey: string;
  data: TimeSeriesPoint[];
  height?: number;
  width?: number;
  maxPoints?: number;
  preserveExtremes?: boolean;
  semanticHighlights?: boolean;
  focusWindow?: {
    startTimestamp: number;
    endTimestamp: number;
  };
  onPointClick?: (point: TimeSeriesPoint) => void;
  onHighlightClick?: (highlight: SemanticHighlight) => void;
  className?: string;
}

/**
 * Chart data point for Recharts
 */
interface ChartPoint {
  timestamp: number;
  value: number;
  formattedTime: string;
  isExtreme?: boolean;
  highlight?: SemanticHighlight;
}

/**
 * Highlight marker component
 */
const HighlightMarker: React.FC<{
  highlight: SemanticHighlight;
  onClick?: (highlight: SemanticHighlight) => void;
}> = ({ highlight, onClick }) => {
  const getColor = (type: string, severity: string) => {
    const colors = {
      causal_pivot: { high: '#dc2626', medium: '#ea580c', low: '#f59e0b' },
      experiment_switch: { high: '#7c3aed', medium: '#8b5cf6', low: '#a78bfa' },
      intervention: { high: '#059669', medium: '#10b981', low: '#34d399' },
      anomaly: { high: '#dc2626', medium: '#f59e0b', low: '#fbbf24' },
      threshold_breach: { high: '#dc2626', medium: '#ea580c', low: '#fb923c' }
    };
    
    return colors[type as keyof typeof colors]?.[severity as keyof typeof colors.anomaly] || '#6b7280';
  };

  return (
    <ReferenceLine
      x={highlight.timestamp}
      stroke={getColor(highlight.type, highlight.severity)}
      strokeWidth={2}
      strokeDasharray={highlight.severity === 'high' ? 'none' : '5 5'}
      label={{
        value: highlight.label,
        position: 'top',
        style: { 
          fontSize: '10px', 
          fill: getColor(highlight.type, highlight.severity),
          cursor: onClick ? 'pointer' : 'default'
        },
        onClick: onClick ? () => onClick(highlight) : undefined
      }}
    />
  );
};

/**
 * Custom dot component for extreme values
 */
interface ExtremeDotProps {
  cx?: number;
  cy?: number;
  payload?: ChartPoint;
}
const ExtremeDot: React.FC<ExtremeDotProps> = (props) => {
  const { cx, cy, payload } = props;
  
  if (!payload?.isExtreme) {
    return null;
  }

  return (
    <Dot 
      cx={cx} 
      cy={cy} 
      r={3} 
      fill="#dc2626" 
      stroke="#ffffff" 
      strokeWidth={1}
    />
  );
};

/**
 * AdaptiveTimeline Component
 */
export const AdaptiveTimeline: React.FC<AdaptiveTimelineProps> = ({
  metricKey,
  data,
  height = 300,
  width,
  maxPoints = 1000,
  preserveExtremes = true,
  semanticHighlights = true,
  focusWindow,
  onPointClick,
  onHighlightClick,
  className = ''
}) => {
  const isAdaptiveEnabled = useAdaptiveVisualization();
  const [series, setSeries] = useState<MultiResolutionSeries | null>(null);
  const [viewportWidth, setViewportWidth] = useState(800);
  const [isLoading, setIsLoading] = useState(false);

  // Prepare series data when inputs change
  useEffect(() => {
    if (data.length === 0) {
      setSeries(null);
      return;
    }

    setIsLoading(true);

    const prepareData = async () => {
      try {
        const preparedSeries = adaptiveTimelineService.prepareSeries(
          metricKey,
          data,
          {
            maxPoints,
            preserveExtremes: isAdaptiveEnabled ? preserveExtremes : false,
            semanticHighlights: isAdaptiveEnabled ? semanticHighlights : false,
            focusWindow
          }
        );

        setSeries(preparedSeries);
      } catch (error) {
        console.error('[AdaptiveTimeline] Failed to prepare series:', error);
        telemetryService.emitTelemetry('viz_preparation_error', {
          metricKey,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      } finally {
        setIsLoading(false);
      }
    };

    prepareData();
  }, [metricKey, data, maxPoints, preserveExtremes, semanticHighlights, focusWindow, isAdaptiveEnabled]);

  // Update viewport width on resize
  useEffect(() => {
    const updateViewportWidth = () => {
      setViewportWidth(window.innerWidth);
    };

    window.addEventListener('resize', updateViewportWidth);
    updateViewportWidth();

    return () => window.removeEventListener('resize', updateViewportWidth);
  }, []);

  // Get optimal resolution data for current viewport
  const chartData = useMemo((): ChartPoint[] => {
    if (!series) return [];

    const optimalData = isAdaptiveEnabled 
      ? adaptiveTimelineService.getOptimalResolution(series, viewportWidth)
      : data.slice(0, maxPoints);

    // Convert to chart format
    const chartPoints: ChartPoint[] = optimalData.map(point => ({
      timestamp: point.timestamp,
      value: point.value,
      formattedTime: new Date(point.timestamp).toLocaleTimeString(),
      isExtreme: series.preservedExtremes.some(extreme => 
        Math.abs(extreme.timestamp - point.timestamp) < 1000
      )
    }));

    // Add highlight information
    if (isAdaptiveEnabled && series.highlights) {
      series.highlights.forEach(highlight => {
        const nearestPoint = chartPoints.find(point =>
          Math.abs(point.timestamp - highlight.timestamp) < 60000 // Within 1 minute
        );
        if (nearestPoint) {
          nearestPoint.highlight = highlight;
        }
      });
    }

    return chartPoints;
  }, [series, viewportWidth, data, maxPoints, isAdaptiveEnabled]);

  // Handle point click
  const _handlePointClick = useCallback((point: ChartPoint) => {
    if (onPointClick) {
      const originalPoint: TimeSeriesPoint = {
        timestamp: point.timestamp,
        value: point.value,
        metricKey
      };
      onPointClick(originalPoint);
    }

    if (point.highlight && onHighlightClick) {
      onHighlightClick(point.highlight);
    }
  }, [onPointClick, onHighlightClick, metricKey]);

  // Format tooltip content
  interface RechartsTooltipPayloadWrapper { payload?: ChartPoint }
  const formatTooltip = useCallback((value: unknown, name: string, props: RechartsTooltipPayloadWrapper): React.ReactElement | null => {
  const point = props?.payload;
  if (!point) return null;

    const formattedValue = typeof value === 'number' ? value.toFixed(2) : String(value);
    const timestamp = new Date(point.timestamp).toLocaleString();
    
    const content = [
      <div key="value" style={{ color: '#374151' }}>
        <strong>{metricKey}: {formattedValue}</strong>
      </div>,
      <div key="time" style={{ color: '#6b7280', fontSize: '12px' }}>
        {timestamp}
      </div>
    ];

    if (point.isExtreme) {
      content.push(
        <div key="extreme" style={{ color: '#dc2626', fontSize: '11px' }}>
          Extreme value
        </div>
      );
    }

    if (point.highlight) {
      content.push(
        <div key="highlight" style={{ color: '#7c3aed', fontSize: '11px' }}>
          {point.highlight.type.replace('_', ' ')}: {point.highlight.description}
        </div>
      );
    }

    // Recharts expects ReactNode or tuple patterns; return an array of ReactNode explicitly typed
    return <div>{content}</div>;
  }, [metricKey]);

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <div className="text-gray-500">Preparing visualization...</div>
      </div>
    );
  }

  // No data state
  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <div className="text-gray-400">No data available</div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {/* Performance indicator */}
      {isAdaptiveEnabled && series && (
        <div className="absolute top-2 right-2 text-xs text-gray-500 bg-white bg-opacity-75 px-2 py-1 rounded">
          {chartData.length} / {series.originalPointCount} points
          {series.highlights.length > 0 && ` • ${series.highlights.length} highlights`}
        </div>
      )}

      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(value) => new Date(value).toLocaleTimeString()}
            tick={{ fontSize: 11 }}
          />
          <YAxis 
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => typeof value === 'number' ? value.toFixed(1) : value}
          />
          <Tooltip 
            content={({ active, payload, label: _label }) => {
              if (!active || !payload || payload.length === 0 || !payload[0]) return null;
              
              const point = payload[0].payload;
              return (
                <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-3">
                  {formatTooltip(payload[0].value, String(payload[0].name ?? ''), { payload: point })}
                </div>
              );
            }}
          />
          
          <Line
            type="monotone"
            dataKey="value"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={<ExtremeDot />}
            activeDot={{ 
              r: 4, 
              fill: '#1d4ed8'
            }}
          />

          {/* Semantic highlights */}
          {isAdaptiveEnabled && series?.highlights.map((highlight, index) => (
            <HighlightMarker
              key={index}
              highlight={highlight}
              onClick={onHighlightClick}
            />
          ))}

          {/* Focus window indicators */}
          {focusWindow && (
            <>
              <ReferenceLine
                x={focusWindow.startTimestamp}
                stroke="#10b981"
                strokeWidth={1}
                strokeDasharray="2 2"
                label={{ value: "Focus Start", position: "bottom", style: { fontSize: '10px' } }}
              />
              <ReferenceLine
                x={focusWindow.endTimestamp}
                stroke="#10b981"
                strokeWidth={1}
                strokeDasharray="2 2"
                label={{ value: "Focus End", position: "bottom", style: { fontSize: '10px' } }}
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* Legend for highlights */}
      {isAdaptiveEnabled && series?.highlights && series.highlights.length > 0 && (
        <div className="absolute bottom-2 left-2 text-xs bg-white bg-opacity-90 p-2 rounded shadow">
          <div className="font-medium mb-1">Highlights:</div>
          <div className="space-y-1">
            {Array.from(new Set(series.highlights.map(h => h.type))).map(type => (
              <div key={type} className="flex items-center gap-2">
                <div 
                  className="w-3 h-0.5" 
                  style={{ 
                    backgroundColor: type === 'anomaly' ? '#dc2626' : 
                                   type === 'causal_pivot' ? '#ea580c' :
                                   type === 'experiment_switch' ? '#7c3aed' :
                                   type === 'intervention' ? '#059669' : '#6b7280'
                  }}
                />
                <span>{type.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdaptiveTimeline;