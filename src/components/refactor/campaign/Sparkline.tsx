/**
 * Sparkline Component (Phase 4)
 * Minimal dependency, pure SVG sparkline chart with adaptive sampling
 */

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface SparklineProps {
  /**
   * Array of numeric values to plot
   */
  values: number[];
  
  /**
   * Optional threshold line
   */
  threshold?: number;
  
  /**
   * Invert color logic (e.g., for warning rates where up is bad)
   */
  invert?: boolean;
  
  /**
   * Annotate the last point with a dot
   */
  annotateLast?: boolean;
  
  /**
   * Width of the SVG (default: 60px)
   */
  width?: number;
  
  /**
   * Height of the SVG (default: 20px)
   */
  height?: number;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Color override for the line
   */
  color?: string;
}

/**
 * Adaptive downsampling using Largest-Triangle-Three-Buckets algorithm
 * Simplified version for sparklines
 */
function downsampleData(data: number[], targetPoints: number): number[] {
  if (data.length <= targetPoints) return data;
  
  // Simple stride-based downsampling for performance
  const stride = Math.ceil(data.length / targetPoints);
  const downsampled: number[] = [];
  
  for (let i = 0; i < data.length; i += stride) {
    // Take average of points in this bucket
    let sum = 0;
    let count = 0;
    
    for (let j = i; j < Math.min(i + stride, data.length); j++) {
      const value = data[j];
      if (typeof value === 'number' && !isNaN(value)) {
        sum += value;
        count++;
      }
    }
    
    if (count > 0) {
      downsampled.push(sum / count);
    }
  }
  
  return downsampled;
}

/**
 * Generate SVG path from data points
 */
function generatePath(
  data: number[], 
  width: number, 
  height: number, 
  padding: number = 2
): string {
  if (data.length === 0) return '';
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;
  
  // Handle edge case where all values are the same
  if (range === 0) {
    const y = height / 2;
    return `M${padding},${y} L${width - padding},${y}`;
  }
  
  const stepX = (width - 2 * padding) / Math.max(1, data.length - 1);
  
  const points = data.map((value, index) => {
    const x = padding + index * stepX;
    const y = height - padding - ((value - min) / range) * (height - 2 * padding);
    return `${x},${y}`;
  });
  
  return `M${points.join(' L')}`;
}

/**
 * Determine trend direction and color
 */
function getTrendColor(values: number[], invert: boolean = false): string {
  if (values.length < 2) return 'text-gray-400';
  
  const first = values[0];
  const last = values[values.length - 1];
  
  if (first === undefined || last === undefined) return 'text-gray-400';
  
  const isIncreasing = last > first;
  
  if (invert) {
    return isIncreasing ? 'text-red-500' : 'text-green-500';
  } else {
    return isIncreasing ? 'text-green-500' : 'text-red-500';
  }
}

export const Sparkline: React.FC<SparklineProps> = ({
  values,
  threshold,
  invert = false,
  annotateLast = true,
  width = 60,
  height = 20,
  className,
  color
}) => {
  const processedData = useMemo(() => {
    // Filter out invalid values
    const validValues = values.filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v));
    
    if (validValues.length === 0) return [];
    
    // Downsample if there are too many points
    const maxPoints = Math.floor(width / 2); // Rough heuristic
    return validValues.length > maxPoints ? 
      downsampleData(validValues, maxPoints) : 
      validValues;
  }, [values, width]);

  const pathData = useMemo(() => {
    return generatePath(processedData, width, height);
  }, [processedData, width, height]);

  const trendColor = useMemo(() => {
    return color || getTrendColor(processedData, invert);
  }, [processedData, invert, color]);

  const thresholdLine = useMemo(() => {
    if (threshold === undefined || processedData.length === 0) return null;
    
    const min = Math.min(...processedData);
    const max = Math.max(...processedData);
    const range = max - min;
    
    if (range === 0) return null;
    
    const y = height - 2 - ((threshold - min) / range) * (height - 4);
    
    // Only show threshold if it's within the visible range
    if (y >= 2 && y <= height - 2) {
      return `M2,${y} L${width - 2},${y}`;
    }
    
    return null;
  }, [threshold, processedData, width, height]);

  const lastPoint = useMemo(() => {
    if (!annotateLast || processedData.length === 0) return null;
    
    const min = Math.min(...processedData);
    const max = Math.max(...processedData);
    const range = max - min;
    
    if (range === 0) return { x: width - 2, y: height / 2 };
    
    const lastValue = processedData[processedData.length - 1];
    if (lastValue === undefined) return null;
    
    const x = 2 + ((processedData.length - 1) * (width - 4)) / Math.max(1, processedData.length - 1);
    const y = height - 2 - ((lastValue - min) / range) * (height - 4);
    
    return { x, y };
  }, [annotateLast, processedData, width, height]);

  // Don't render if no valid data
  if (processedData.length === 0) {
    return (
      <svg 
        width={width} 
        height={height} 
        className={cn('inline-block', className)}
        aria-hidden="true"
      >
        <line 
          x1={2} 
          y1={height / 2} 
          x2={width - 2} 
          y2={height / 2} 
          className="stroke-gray-300 opacity-50" 
          strokeWidth={1}
          strokeDasharray="2,2"
        />
      </svg>
    );
  }

  return (
    <svg 
      width={width} 
      height={height} 
      className={cn('inline-block', className)}
      role="img"
      aria-label={`Sparkline chart showing trend from ${processedData[0]?.toFixed(1)} to ${processedData[processedData.length - 1]?.toFixed(1)}`}
    >
      {/* Threshold line */}
      {thresholdLine && (
        <path
          d={thresholdLine}
          className="stroke-gray-400 opacity-30"
          strokeWidth={1}
          strokeDasharray="1,1"
          fill="none"
        />
      )}
      
      {/* Main line */}
      <path
        d={pathData}
        className={cn('stroke-current', trendColor)}
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Last point annotation */}
      {lastPoint && (
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={1.5}
          className={cn('fill-current', trendColor)}
        />
      )}
    </svg>
  );
};

export default Sparkline;