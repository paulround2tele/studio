/**
 * Export Service (Phase 5)
 * JSON, CSV, and base64 share bundle utilities for snapshots & recommendations
 */

import { AggregateSnapshot, ExtendedAggregateMetrics } from '@/types/campaignMetrics';
import { EnhancedRecommendation } from './recommendationsV3Pipeline';

// Feature flag for export tools
const isExportToolsEnabled = () => 
  process.env.NEXT_PUBLIC_ENABLE_EXPORT_TOOLS !== 'false';

/**
 * Share bundle structure for encoding/decoding
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
}

/**
 * Export snapshots as JSON
 */
export function exportSnapshotsJSON(
  snapshots: AggregateSnapshot[],
  campaignId: string,
  filename?: string
): void {
  if (!isExportToolsEnabled()) {
    console.warn('[ExportService] Export tools disabled');
    return;
  }

  const exportData = {
    version: '1.0',
    campaignId,
    exportedAt: new Date().toISOString(),
    snapshots,
    metadata: {
      totalSnapshots: snapshots.length,
      dateRange: getDateRange(snapshots)
    }
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  downloadBlob(blob, filename || `campaign-${campaignId}-snapshots.json`);
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