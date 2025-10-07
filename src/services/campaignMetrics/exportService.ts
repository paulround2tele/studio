/**
 * Export Service (Phase 7)
 * JSON, CSV, and base64 share bundle utilities with version 3 support for capabilities & domain resolution
 */

import { AggregateSnapshot, ExtendedAggregateMetrics } from '@/types/campaignMetrics';
import type { ForecastPoint } from '@/types/forecasting';
import { EnhancedRecommendation } from './recommendationsV3Pipeline';
// ForecastPoint removed from forecastService exports; rely on forecasting central types or inline shapes
import { NormalizedSnapshot } from './normalizationService';
import { CohortMatrix } from './cohortService';
import { capabilitiesService, DomainType, DomainResolution } from './capabilitiesService';
import { telemetryService } from './telemetryService';

// Feature flag for export tools
const isExportToolsEnabled = () => 
  process.env.NEXT_PUBLIC_ENABLE_EXPORT_TOOLS !== 'false';

/**
 * Share bundle structure for encoding/decoding (Phase 10: Version 6)
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
    method: 'server' | 'client' | 'client-worker';
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
  // Phase 7: Version 3 additions
  capabilitiesSnapshot?: {
    versions: Record<string, string>;
    features: Record<string, boolean>;
    capturedAt: string;
  };
  resolutionDecisions?: Array<{
    domain: DomainType;
    mode: DomainResolution;
    ts: number;
  }>;
  // Phase 10: Version 6 additions
  causalGraph?: {
    nodes: Array<{
      id: string;
      metric: string;
      type: string;
      sampleCount: number;
      averageValue: number;
    }>;
    edges: Array<{
      id: string;
      from: string;
      to: string;
      confidence: number;
      strength: number;
      direction: string;
    }>;
    version: string;
    generatedAt: string;
  };
  experiments?: {
    arms: Array<{
      id: string;
      name: string;
      pulls: number;
      averageReward: number;
    }>;
    decisions: Array<{
      armId: string;
      strategy: string;
      timestamp: string;
    }>;
    rewardsSummary: {
      totalRewards: number;
      averageReward: number;
      bestArm: string | null;
    };
  };
  semanticSummaries?: {
    anomalies: Array<{
      id: string;
      summary: string;
      confidence: number;
      method: string;
    }>;
    causalDeltas: Array<{
      id: string;
      summary: string;
      confidence: number;
      method: string;
    }>;
  };
  privacyLedger?: {
    redactionsApplied: number;
    violationsDetected: number;
    auditEntries: number;
    dpEpsilon: number;
    policyVersion: string;
  };
  perfTraces?: {
    spans: Array<{
      id: string;
      operation: string;
      duration: number;
      status: string;
      startTime: number;
    }>;
    totalSpans: number;
    averageDuration: number;
    errorRate: number;
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
 * Phase 7: Export options for version 3
 */
export interface ExportOptionsV3 extends ExportOptionsV2 {
  includeCapabilities?: boolean;
  includeResolutionDecisions?: boolean;
}

/**
 * Phase 10: Export options for version 6
 */
export interface ExportOptionsV6 extends ExportOptionsV3 {
  includeCausalGraph?: boolean;
  includeExperiments?: boolean;
  includeSemanticSummaries?: boolean;
  includePrivacyLedger?: boolean;
  includePerfTraces?: boolean;
  causalGraphData?: {
    nodes: any[];
    edges: any[];
    version: string;
  };
  experimentsData?: {
    arms: any[];
    decisions: any[];
    rewardsSummary: any;
  };
  semanticSummariesData?: {
    anomalies: any[];
    causalDeltas: any[];
  };
  privacyLedgerData?: {
    redactionsApplied: number;
    violationsDetected: number;
    auditEntries: number;
    dpEpsilon: number;
    policyVersion: string;
  };
  perfTracesData?: {
    spans: any[];
    totalSpans: number;
    averageDuration: number;
    errorRate: number;
  };
}

/**
 * Resolution decision tracker for export
 */
interface ResolutionDecision {
  domain: DomainType;
  mode: DomainResolution;
  ts: number;
}

let resolutionDecisions: ResolutionDecision[] = [];

/**
 * Track domain resolution decision for export
 */
export function trackResolutionDecision(domain: DomainType, mode: DomainResolution): void {
  resolutionDecisions.push({
    domain,
    mode,
    ts: Date.now(),
  });

  // Keep only recent decisions (last 100)
  if (resolutionDecisions.length > 100) {
    resolutionDecisions = resolutionDecisions.slice(-100);
  }
}

/**
 * Export snapshots as JSON with Phase 7 enhancements (Version 3)
 */
export function exportSnapshotsJSONV3(
  snapshots: AggregateSnapshot[],
  campaignId: string,
  filename?: string,
  optionsV3?: ExportOptionsV3
): void {
  if (!isExportToolsEnabled()) {
    console.warn('[ExportService] Export tools disabled');
    return;
  }

  const hasCanonicalData = !!(optionsV3?.includeCapabilities || optionsV3?.includeResolutionDecisions);
  const version = hasCanonicalData ? '3.0' : '2.0';
  
  const exportData: ShareBundle = {
    version,
    campaignId,
    exportedAt: new Date().toISOString(),
    snapshots,
    metadata: {
      totalSnapshots: snapshots.length,
      dateRange: {
        from: snapshots.length > 0 ? snapshots[0]?.timestamp ?? new Date().toISOString() : new Date().toISOString(),
        to: snapshots.length > 0 ? snapshots[snapshots.length - 1]?.timestamp ?? new Date().toISOString() : new Date().toISOString()
      }
    }
  };

  // Include Phase 6 data
  if (optionsV3) {
    if (optionsV3.includeForecast && optionsV3.forecastData) {
      exportData.forecast = optionsV3.forecastData;
    }
    
    if (optionsV3.includeNormalized && optionsV3.normalizationData) {
      exportData.normalization = optionsV3.normalizationData;
    }
    
    if (optionsV3.includeCohorts && optionsV3.cohortData) {
      exportData.cohorts = optionsV3.cohortData;
    }

    // Phase 7: Include capabilities and resolution decisions
    if (optionsV3.includeCapabilities) {
      const currentCapabilities = capabilitiesService.getCurrentCapabilities();
      if (currentCapabilities) {
        exportData.capabilitiesSnapshot = {
          versions: currentCapabilities.versions,
          features: currentCapabilities.features,
          capturedAt: new Date().toISOString(),
        };
      }
    }

    if (optionsV3.includeResolutionDecisions && resolutionDecisions.length > 0) {
      exportData.resolutionDecisions = resolutionDecisions.slice(); // Copy array
    }
  }

  // Emit telemetry
  const sizeMB = new Blob([JSON.stringify(exportData)]).size / (1024 * 1024);
  telemetryService.emitTelemetry('export_generated', {
    type: 'json',
    snapshots: snapshots.length,
    sizeMB: Math.round(sizeMB * 100) / 100,
    version: version === '3.0' ? 3 : (version === '2.0' ? 2 : 1),
  });

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `campaign-${campaignId}-v${version}-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export snapshots as JSON with Phase 10 enhancements (Version 6)
 */
export function exportSnapshotsJSONV6(
  snapshots: AggregateSnapshot[],
  campaignId: string,
  filename?: string,
  optionsV6?: ExportOptionsV6
): void {
  if (!isExportToolsEnabled()) {
    console.warn('[ExportService] Export tools disabled');
    return;
  }

  const hasPhase10Data = !!(
    optionsV6?.includeCausalGraph || 
    optionsV6?.includeExperiments || 
    optionsV6?.includeSemanticSummaries ||
    optionsV6?.includePrivacyLedger ||
    optionsV6?.includePerfTraces
  );
  
  const version = hasPhase10Data ? '6.0' : '3.0';
  
  const exportData: ShareBundle = {
    version,
    campaignId,
    exportedAt: new Date().toISOString(),
    snapshots,
    metadata: {
      totalSnapshots: snapshots.length,
      dateRange: {
        from: snapshots.length > 0 ? snapshots[0]?.timestamp ?? new Date().toISOString() : new Date().toISOString(),
        to: snapshots.length > 0 ? snapshots[snapshots.length - 1]?.timestamp ?? new Date().toISOString() : new Date().toISOString()
      }
    }
  };

  // Include all previous version features
  if (optionsV6?.includeForecast && optionsV6.forecastData) {
    exportData.forecast = optionsV6.forecastData;
  }
  
  if (optionsV6?.includeNormalized && optionsV6.normalizationData) {
    exportData.normalization = optionsV6.normalizationData;
  }
  
  if (optionsV6?.includeCohorts && optionsV6.cohortData) {
    exportData.cohorts = optionsV6.cohortData;
  }

  if (optionsV6?.includeCapabilities) {
    const capabilities = capabilitiesService.getCurrentCapabilities();
    exportData.capabilitiesSnapshot = {
      versions: capabilities?.versions || {},
      features: capabilities?.features || {},
      capturedAt: new Date().toISOString()
    };
  }

  if (optionsV6?.includeResolutionDecisions) {
    exportData.resolutionDecisions = resolutionDecisions.map(decision => ({
      domain: decision.domain,
      mode: decision.mode,
      ts: decision.ts
    }));
  }

  // Phase 10: Add version 6 data
  if (optionsV6?.includeCausalGraph && optionsV6.causalGraphData) {
    exportData.causalGraph = {
      ...optionsV6.causalGraphData,
      generatedAt: new Date().toISOString()
    };
  }

  if (optionsV6?.includeExperiments && optionsV6.experimentsData) {
    exportData.experiments = optionsV6.experimentsData;
  }

  if (optionsV6?.includeSemanticSummaries && optionsV6.semanticSummariesData) {
    exportData.semanticSummaries = optionsV6.semanticSummariesData;
  }

  if (optionsV6?.includePrivacyLedger && optionsV6.privacyLedgerData) {
    exportData.privacyLedger = optionsV6.privacyLedgerData;
  }

  if (optionsV6?.includePerfTraces && optionsV6.perfTracesData) {
    exportData.perfTraces = optionsV6.perfTracesData;
  }

  // Emit telemetry
  telemetryService.emitTelemetry('export_generated', {
    version: 6,
    campaignId,
    totalSnapshots: snapshots.length,
    features: {
      forecast: !!exportData.forecast,
      normalization: !!exportData.normalization,
      cohorts: !!exportData.cohorts,
      capabilities: !!exportData.capabilitiesSnapshot,
      resolutionDecisions: !!exportData.resolutionDecisions,
      causalGraph: !!exportData.causalGraph,
      experiments: !!exportData.experiments,
      semanticSummaries: !!exportData.semanticSummaries,
      privacyLedger: !!exportData.privacyLedger,
      perfTraces: !!exportData.perfTraces
    }
  });

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `campaign-${campaignId}-v${version}-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
        from: snapshots.length > 0 ? snapshots[0]?.timestamp ?? new Date().toISOString() : new Date().toISOString(),
        to: snapshots.length > 0 ? snapshots[snapshots.length - 1]?.timestamp ?? new Date().toISOString() : new Date().toISOString()
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
    from: new Date(timestamps[0] ?? Date.now()).toISOString(),
    to: new Date(timestamps[timestamps.length - 1] ?? Date.now()).toISOString()
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
 * Phase 11: Export v7 with scenarios, policies, visualization profiles, and edge processing
 */

// Add Phase 11 fields to ShareBundle interface
export interface ShareBundleV7 extends ShareBundle {
  // Phase 11: Version 7 additions
  scenarios?: Array<{
    id: string;
    name: string;
    interventions: Array<{
      type: string;
      metricKey?: string;
      adjustment?: number;
      description?: string;
    }>;
    projectionsHash: string;
    createdAt: string;
  }>;
  policies?: Array<{
    id: string;
    version: string;
    hash: string;
    name: string;
    enabled: boolean;
    actionsCount: number;
  }>;
  vizProfiles?: Array<{
    metricKey: string;
    resolutions: number[];
    highlightStats: {
      anomalies: number;
      causalPivots: number;
      interventions: number;
    };
    originalPoints: number;
    downsampledPoints: number;
  }>;
  edgeProcessing?: {
    tasksExecuted: number;
    avgLatencyMs: number;
    workerHealthy: boolean;
    fallbackRate: number;
    queueStats: {
      maxQueueSize: number;
      avgQueueTime: number;
    };
  };
}

/**
 * Export options for Phase 11 v7
 */
export interface ExportOptionsV7 extends ExportOptionsV3 {
  includeScenarios?: boolean;
  includePolicies?: boolean;
  includeVizProfiles?: boolean;
  includeEdgeProcessing?: boolean;
  scenarioData?: ShareBundleV7['scenarios'];
  policyData?: ShareBundleV7['policies'];
  vizProfileData?: ShareBundleV7['vizProfiles'];
  edgeProcessingData?: ShareBundleV7['edgeProcessing'];
  // Carry forward Phase 10 (v6) optional data so type accesses are valid
  includeCausalGraph?: boolean;
  causalGraphData?: ShareBundleV7['causalGraph'];
  experimentsData?: ShareBundleV7['experiments'];
  semanticSummariesData?: ShareBundleV7['semanticSummaries'];
  privacyLedgerData?: ShareBundleV7['privacyLedger'];
  perfTracesData?: ShareBundleV7['perfTraces'];
}

/**
 * Export snapshots as JSON with Phase 11 enhancements (Version 7)
 */
export function exportSnapshotsJSONV7(
  snapshots: AggregateSnapshot[],
  campaignId: string,
  filename?: string,
  optionsV7?: ExportOptionsV7
): void {
  if (!isExportToolsEnabled()) {
    console.warn('[ExportService] Export tools disabled');
    return;
  }

  // Check if any Phase 11 features are included
  const hasPhase11Data = !!(
    optionsV7?.includeScenarios || 
    optionsV7?.includePolicies || 
    optionsV7?.includeVizProfiles || 
    optionsV7?.includeEdgeProcessing
  );
  
  const version = hasPhase11Data ? '7.0' : '6.0';
  
  const exportData: ShareBundleV7 = {
    version,
    campaignId,
    exportedAt: new Date().toISOString(),
    snapshots,
    metadata: {
      totalSnapshots: snapshots.length,
      dateRange: {
        from: snapshots.length > 0 ? snapshots[0]?.timestamp ?? new Date().toISOString() : new Date().toISOString(),
        to: snapshots.length > 0 ? snapshots[snapshots.length - 1]?.timestamp ?? new Date().toISOString() : new Date().toISOString()
      }
    }
  };

  // Include all previous version data (Phase 6, 7, 10)
  if (optionsV7) {
    // Phase 6 data
    if (optionsV7.includeForecast && optionsV7.forecastData) {
      exportData.forecast = optionsV7.forecastData;
    }
    
    if (optionsV7.includeNormalized && optionsV7.normalizationData) {
      exportData.normalization = optionsV7.normalizationData;
    }
    
    if (optionsV7.includeCohorts && optionsV7.cohortData) {
      exportData.cohorts = optionsV7.cohortData;
    }

    // Phase 7 data
    if (optionsV7.includeCapabilities) {
      const currentCapabilities = capabilitiesService.getCurrentCapabilities();
      if (currentCapabilities) {
        exportData.capabilitiesSnapshot = {
          versions: currentCapabilities.versions,
          features: currentCapabilities.features,
          capturedAt: new Date().toISOString(),
        };
      }
    }

    if (optionsV7.includeResolutionDecisions && resolutionDecisions.length > 0) {
      exportData.resolutionDecisions = resolutionDecisions.slice();
    }

    // Phase 10 data
    const opts = optionsV7 as unknown as { includeCausalGraph?: boolean; causalGraphData?: unknown };
    if (opts.includeCausalGraph && opts.causalGraphData) {
      // Narrow causalGraph structure (best-effort) before assigning
      const cg = opts.causalGraphData as unknown;
      if (cg && typeof cg === 'object') {
        exportData.causalGraph = cg as typeof exportData.causalGraph;
      }
    }

    if (optionsV7.experimentsData) {
      exportData.experiments = optionsV7.experimentsData;
    }

    if (optionsV7.semanticSummariesData) {
      exportData.semanticSummaries = optionsV7.semanticSummariesData;
    }

    if (optionsV7.privacyLedgerData) {
      exportData.privacyLedger = optionsV7.privacyLedgerData;
    }

    if (optionsV7.perfTracesData) {
      exportData.perfTraces = optionsV7.perfTracesData;
    }

    // Phase 11 data
    if (optionsV7.includeScenarios && optionsV7.scenarioData) {
      exportData.scenarios = optionsV7.scenarioData;
    }

    if (optionsV7.includePolicies && optionsV7.policyData) {
      exportData.policies = optionsV7.policyData;
    }

    if (optionsV7.includeVizProfiles && optionsV7.vizProfileData) {
      exportData.vizProfiles = optionsV7.vizProfileData;
    }

    if (optionsV7.includeEdgeProcessing && optionsV7.edgeProcessingData) {
      exportData.edgeProcessing = optionsV7.edgeProcessingData;
    }
  }

  // Create and download file
  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `campaign-${campaignId}-export-v7-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  // Emit telemetry
  const sizeMB = blob.size / (1024 * 1024);
  telemetryService.emitTelemetry('export_generated', {
    version: 7,
    type: 'json',
    snapshots: snapshots.length,
    sizeMB: Math.round(sizeMB * 100) / 100,
    hasScenarios: !!optionsV7?.includeScenarios,
    hasPolicies: !!optionsV7?.includePolicies,
    hasVizProfiles: !!optionsV7?.includeVizProfiles,
    hasEdgeProcessing: !!optionsV7?.includeEdgeProcessing
  });
}

/**
 * Decode share bundle with backward compatibility for v1-v7
 */
export function decodeShareBundleV7(encodedData: string): ShareBundleV7 | null {
  try {
    const decoded = atob(encodedData);
    const parsed = JSON.parse(decoded) as ShareBundleV7;
    
    // Validate version
    const version = parseFloat(parsed.version);
    if (version < 1.0 || version > 7.0) {
      console.warn(`[ExportService] Unsupported bundle version: ${parsed.version}`);
      return null;
    }

    // Backward compatibility handling
    if (version < 7.0) {
      // Bundle is from earlier version, ensure optional Phase 11 fields are undefined
  const mutable = parsed as unknown as Record<string, unknown>;
  delete mutable.scenarios;
  delete mutable.policies;
  delete mutable.vizProfiles;
  delete mutable.edgeProcessing;
    }

    return parsed;
  } catch (error) {
    console.warn('[ExportService] Failed to decode share bundle:', error);
    return null;
  }
}

/**
 * Create share bundle from current state (v7)
 */
export function createShareBundleV7(
  snapshots: AggregateSnapshot[],
  campaignId: string,
  options?: ExportOptionsV7
): string {
  const exportData: ShareBundleV7 = {
    version: '7.0',
    campaignId,
    exportedAt: new Date().toISOString(),
    snapshots,
    metadata: {
      totalSnapshots: snapshots.length,
      dateRange: {
        from: snapshots.length > 0 ? snapshots[0]?.timestamp ?? new Date().toISOString() : new Date().toISOString(),
        to: snapshots.length > 0 ? snapshots[snapshots.length - 1]?.timestamp ?? new Date().toISOString() : new Date().toISOString()
      }
    }
  };

  // Add optional data based on options
  if (options) {
    // Include Phase 11 data if available
    if (options.includeScenarios && options.scenarioData) {
      exportData.scenarios = options.scenarioData;
    }

    if (options.includePolicies && options.policyData) {
      exportData.policies = options.policyData;
    }

    if (options.includeVizProfiles && options.vizProfileData) {
      exportData.vizProfiles = options.vizProfileData;
    }

    if (options.includeEdgeProcessing && options.edgeProcessingData) {
      exportData.edgeProcessing = options.edgeProcessingData;
    }

    // Include all other version data as well
    if (options.includeForecast && options.forecastData) {
      exportData.forecast = options.forecastData;
    }

    if (options.causalGraphData) {
      exportData.causalGraph = options.causalGraphData;
    }

    // Add other data as needed...
  }

  return btoa(JSON.stringify(exportData));
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