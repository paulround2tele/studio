/**
 * Export Service (Phase 5 + Phase 6)
 * JSON, CSV, and base64 share bundle utilities with version 2 support for forecasts & normalization
 */

import { AggregateSnapshot, ExtendedAggregateMetrics } from '@/types/campaignMetrics';
import { EnhancedRecommendation } from './recommendationsV3Pipeline';
import { ForecastPoint } from './forecastService';
import { NormalizedSnapshot } from './normalizationService';
import { CohortMatrix } from './cohortService';

// Feature flag for export tools
const isExportToolsEnabled = () => 
  process.env.NEXT_PUBLIC_ENABLE_EXPORT_TOOLS !== 'false';

/**
 * Share bundle structure for encoding/decoding (Phase 6: Version 2)
 */
export interface ShareBundle {
  version: string;
  campaignId: string;
  exportedAt: string;
  snapshots: AggregateSnapshot[];
  recommendations?: EnhancedRecommendation[];
  metadata?: {
    totalSnapshots: number;
    dateRange: {
      from: string;
      to: string;
    };
  };
  // Phase 6: Version 2 additions
  forecast?: {
    points: ForecastPoint[];
    method: 'server' | 'client';
    horizon: number;
    generatedAt: string;
  };
  normalization?: {
    benchmarkVersion: string;
    normalizedSnapshots: NormalizedSnapshot[];
    method: 'baseline' | 'zscore';
  };
  cohorts?: {
    matrix: CohortMatrix;
    campaignNames: Record<string, string>;
  };
}

/**
 * Version 2 export options (Phase 6)
 */
export interface ExportOptionsV2 {
  includeForecast?: boolean;
  includeNormalized?: boolean;
  includeCohorts?: boolean;
  forecastData?: {
    points: ForecastPoint[];
    method: 'server' | 'client';
    horizon: number;
    generatedAt: string;
  };
  normalizationData?: {
    benchmarkVersion: string;
    normalizedSnapshots: NormalizedSnapshot[];
    method: 'baseline' | 'zscore';
  };
  cohortData?: {
    matrix: CohortMatrix;
    campaignNames: Record<string, string>;
  };
}

/**
 * Export snapshots as JSON with Phase 6 enhancements
 */
export function exportSnapshotsJSON(
  snapshots: AggregateSnapshot[],
  campaignId: string,
  filename?: string,
  optionsV2?: ExportOptionsV2
): void {
  if (!isExportToolsEnabled()) {
    console.warn('[ExportService] Export tools disabled');
    return;
  }

  const version = optionsV2 ? '2.0' : '1.0';
  const exportData: ShareBundle = {
    version,
    campaignId,
    exportedAt: new Date().toISOString(),
    snapshots,
    metadata: {
      totalSnapshots: snapshots.length,
      dateRange: {
        from: snapshots.length > 0 ? snapshots[0].timestamp : new Date().toISOString(),
        to: snapshots.length > 0 ? snapshots[snapshots.length - 1].timestamp : new Date().toISOString()
      }
    }
  };

  // Phase 6: Add version 2 data
  if (optionsV2) {
    if (optionsV2.includeForecast && optionsV2.forecastData) {
      exportData.forecast = optionsV2.forecastData;
    }
    
    if (optionsV2.includeNormalized && optionsV2.normalizationData) {
      exportData.normalization = optionsV2.normalizationData;
    }
    
    if (optionsV2.includeCohorts && optionsV2.cohortData) {
      exportData.cohorts = optionsV2.cohortData;
    }
  }

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `campaign-${campaignId}-${version}-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export snapshots as CSV
 */
export function exportSnapshotsCSV(
  snapshots: AggregateSnapshot[],
  campaignId: string,
  filename?: string
): void {
  if (!isExportToolsEnabled()) {
    console.warn('[ExportService] Export tools disabled');
    return;
  }

  const csvContent = generateSnapshotsCSV(snapshots);
  const blob = new Blob([csvContent], { type: 'text/csv' });
  downloadBlob(blob, filename || `campaign-${campaignId}-snapshots.csv`);
}

/**
 * Build shareable base64 bundle
 */
export function buildShareBundle(
  snapshots: AggregateSnapshot[],
  campaignId: string,
  recommendations?: EnhancedRecommendation[]
): string {
  if (!isExportToolsEnabled()) {
    throw new Error('Export tools disabled');
  }

  const bundle: ShareBundle = {
    version: '1.0',
    campaignId,
    exportedAt: new Date().toISOString(),
    snapshots,
    recommendations,
    metadata: {
      totalSnapshots: snapshots.length,
      dateRange: getDateRange(snapshots)
    }
  };

  const jsonString = JSON.stringify(bundle);
  return btoa(unescape(encodeURIComponent(jsonString)));
}

/**
 * Decode share bundle from base64
 */
export function decodeShareBundle(base64Data: string): ShareBundle {
  if (!isExportToolsEnabled()) {
    throw new Error('Export tools disabled');
  }

  try {
    const jsonString = decodeURIComponent(escape(atob(base64Data)));
    const bundle = JSON.parse(jsonString) as ShareBundle;
    
    // Validate bundle structure
    if (!bundle.version || !bundle.campaignId || !Array.isArray(bundle.snapshots)) {
      throw new Error('Invalid bundle structure');
    }

    return bundle;
  } catch (error) {
    throw new Error(`Failed to decode share bundle: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decode share bundle with backward compatibility (Phase 6)
 */
export function decodeShareBundleV2(encodedData: string): ShareBundle {
  try {
    const bundle = decodeShareBundle(encodedData);
    
    // If it's already version 2, return as-is
    if (bundle.version === '2.0') {
      return bundle;
    }
    
    // Convert version 1.0 to 2.0 format
    const upgradedBundle: ShareBundle = {
      ...bundle,
      version: '2.0'
      // Phase 6 fields will be undefined for v1 data, which is correct
    };
    
    return upgradedBundle;
  } catch (error) {
    throw new Error(`Failed to decode share bundle: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if export data contains Phase 6 features
 */
export function hasPhase6Features(bundle: ShareBundle): {
  hasForecast: boolean;
  hasNormalization: boolean;
  hasCohorts: boolean;
} {
  return {
    hasForecast: !!(bundle.forecast && bundle.forecast.points.length > 0),
    hasNormalization: !!(bundle.normalization && bundle.normalization.normalizedSnapshots.length > 0),
    hasCohorts: !!(bundle.cohorts && bundle.cohorts.matrix.campaigns.length > 0)
  };
}

/**
 * Get export version info
 */
export function getExportVersionInfo(bundle: ShareBundle): {
  version: string;
  isV2: boolean;
  features: string[];
} {
  const isV2 = bundle.version === '2.0';
  const features: string[] = [];
  
  if (isV2) {
    const phase6Features = hasPhase6Features(bundle);
    if (phase6Features.hasForecast) features.push('Forecast');
    if (phase6Features.hasNormalization) features.push('Normalization');
    if (phase6Features.hasCohorts) features.push('Cohorts');
  }
  
  return {
    version: bundle.version,
    isV2,
    features
  };
}

/**
 * Generate CSV content from snapshots
 */
function generateSnapshotsCSV(snapshots: AggregateSnapshot[]): string {
  if (snapshots.length === 0) {
    return 'No snapshots to export\n';
  }

  // Define CSV headers based on available metrics
  const headers = [
    'id',
    'timestamp',
    'totalDomains',
    'successRate',
    'avgLeadScore',
    'dnsSuccessRate',
    'httpSuccessRate',
    'highPotentialCount',
    'leadsCount',
    'avgRichness',
    'warningRate',
    'keywordCoverage',
    'medianGain'
  ];

  // Create CSV rows
  const rows = snapshots.map(snapshot => {
    const aggregates = snapshot.aggregates as ExtendedAggregateMetrics;
    
    return [
      escapeCSVField(snapshot.id),
      escapeCSVField(snapshot.timestamp),
      aggregates.totalDomains || 0,
      aggregates.successRate || 0,
      aggregates.avgLeadScore || 0,
      aggregates.dnsSuccessRate || 0,
      aggregates.httpSuccessRate || 0,
      aggregates.highPotentialCount || 0,
      aggregates.leadsCount || 0,
      aggregates.avgRichness || 0,
      aggregates.warningRate || 0,
      aggregates.keywordCoverage || 0,
      aggregates.medianGain || 0
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Escape CSV field values
 */
function escapeCSVField(value: any): string {
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

/**
 * Get date range from snapshots
 */
function getDateRange(snapshots: AggregateSnapshot[]): { from: string; to: string } {
  if (snapshots.length === 0) {
    const now = new Date().toISOString();
    return { from: now, to: now };
  }

  const timestamps = snapshots.map(s => new Date(s.timestamp).getTime()).sort();
  
  return {
    from: new Date(timestamps[0]).toISOString(),
    to: new Date(timestamps[timestamps.length - 1]).toISOString()
  };
}

/**
 * Download blob as file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  URL.revokeObjectURL(url);
}

/**
 * Generate shareable URL with bundle data
 */
export function generateShareableURL(
  snapshots: AggregateSnapshot[],
  campaignId: string,
  recommendations?: EnhancedRecommendation[]
): string {
  if (!isExportToolsEnabled()) {
    throw new Error('Export tools disabled');
  }

  try {
    const bundleData = buildShareBundle(snapshots, campaignId, recommendations);
    const baseURL = typeof window !== 'undefined' ? window.location.origin : '';
    
    // Create URL with bundle as query parameter
    const url = new URL('/share', baseURL);
    url.searchParams.set('data', bundleData);
    
    return url.toString();
  } catch (error) {
    throw new Error(`Failed to generate shareable URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse share bundle from URL
 */
export function parseShareBundleFromURL(url: string): ShareBundle | null {
  if (!isExportToolsEnabled()) {
    return null;
  }

  try {
    const urlObj = new URL(url);
    const bundleData = urlObj.searchParams.get('data');
    
    if (!bundleData) {
      return null;
    }

    return decodeShareBundle(bundleData);
  } catch (error) {
    console.warn('[ExportService] Failed to parse share bundle from URL:', error);
    return null;
  }
}

/**
 * Validate export file size
 */
export function validateExportSize(snapshots: AggregateSnapshot[]): { valid: boolean; size: number; warning?: string } {
  const estimatedSize = JSON.stringify(snapshots).length;
  const maxSize = 50 * 1024 * 1024; // 50MB limit
  
  if (estimatedSize > maxSize) {
    return {
      valid: false,
      size: estimatedSize,
      warning: `Export size (${(estimatedSize / 1024 / 1024).toFixed(1)}MB) exceeds recommended limit (50MB)`
    };
  }

  if (estimatedSize > 10 * 1024 * 1024) { // 10MB warning
    return {
      valid: true,
      size: estimatedSize,
      warning: `Large export size (${(estimatedSize / 1024 / 1024).toFixed(1)}MB). Download may be slow.`
    };
  }

  return {
    valid: true,
    size: estimatedSize
  };
}

/**
 * Check if export tools are available
 */
export function isExportToolsAvailable(): boolean {
  return isExportToolsEnabled();
}