/**
 * Export v5 Evolution Service (Phase 9)
 * Enhanced export with blended forecast provenance, root-cause traces, offline replay logs, capability diff history
 */

import { telemetryService } from './telemetryService';
import { BlendedForecast } from './forecastBlendService';
import { CausalChain } from './rootCauseAnalyticsService';
import { DeferredAction, OfflineSyncStatus } from './offlineResilienceService';
import { CapabilityDiff } from './capabilitiesService';
// Generated API client model types replacing previous any[] placeholders
import type { AnomalyRecord } from '@/lib/api-client/models/anomaly-record';
import type { HealthFabricSnapshot } from '@/lib/api-client/models/health-fabric-snapshot';
import type { PerformanceMetricRecord } from '@/lib/api-client/models/performance-metric-record';
import type { ForecastPoint } from '@/lib/api-client/models/forecast-point';
import type { RootCauseEvidence } from '@/lib/api-client/models/root-cause-evidence';
import type { CampaignRecommendation } from '@/lib/api-client/models/campaign-recommendation';
import type { components } from '@/lib/api-client/types';
type TimelineEvent = components['schemas']['TimelineEvent'];

// Declare process for Node.js environment variables
/**
 * Export format versions
 */
export type ExportVersion = 'v4' | 'v5';

/**
 * Export data types
 */
export type ExportDataType = 
  | 'timeline'
  | 'forecasts'
  | 'recommendations'
  | 'anomalies'
  | 'root_cause_analysis'
  | 'blended_forecasts'
  | 'offline_replay_log'
  | 'capability_history'
  | 'health_fabric'
  | 'performance_metrics';

/**
 * Blended forecast provenance
 */
export interface BlendedForecastProvenance {
  blendId: string;
  metricKey: string;
  generatedAt: string;
  blendMethod: 'bayesian' | 'arbitration_fallback';
  qualityScore: number;
  
  // Model contributions
  modelContributions: Array<{
    modelId: string;
    modelType: 'server' | 'client';
    weight: number;
    confidence: number;
    performanceMetrics: {
      mae: number;
      mape: number;
      sampleCount: number;
    };
  }>;
  
  // Historical performance
  historicalPerformance: Array<{
    timestamp: string;
    actualValue: number;
    predictedValue: number;
    error: number;
  }>;
  
  // Blend evolution
  weightEvolution: Array<{
    timestamp: string;
    weights: Record<string, number>;
    triggers: string[]; // What caused weight updates
  }>;
}

/**
 * Root-cause trace for export
 */
export interface RootCauseTrace {
  anomalyId: string;
  analysisId: string;
  detectedAt: string;
  analyzedAt: string;
  
  // Causal chain
  primaryFactor?: {
    type: string;
    description: string;
    confidence: number;
    impact: number;
  };
  
  contributingFactors: Array<{
    type: string;
    description: string;
    confidence: number;
    impact: number;
    timeRange: { start: string; end: string };
  evidence: RootCauseEvidence[];
  }>;
  
  // Intervention history
  recommendedInterventions: Array<{
    type: string;
    priority: string;
    action: string;
    estimatedImpact: number;
    status: 'pending' | 'applied' | 'rejected';
    appliedAt?: string;
  }>;
  
  // Outcome tracking
  outcomeTracking?: {
    interventionApplied: boolean;
    effectivenessMeasured: boolean;
    actualImpact?: number;
    followUpRequired: boolean;
  };
}

/**
 * Offline replay log entry
 */
export interface OfflineReplayLogEntry {
  entryId: string;
  timestamp: string;
  eventType: 'action_queued' | 'action_executed' | 'action_failed' | 'sync_attempted' | 'conflict_resolved';
  
  // Action details
  actionDetails?: {
    actionId: string;
    actionType: string;
    priority: string;
    retryCount: number;
    maxRetries: number;
  };
  
  // Execution details
  executionDetails?: {
    startTime: string;
    endTime?: string;
    success: boolean;
    error?: string;
    retryScheduled?: string;
  };
  
  // Sync details
  syncDetails?: {
    onlineStatus: boolean;
    queueSize: number;
    syncDuration?: number;
    itemsProcessed: number;
    itemsFailed: number;
  };
  
  // Context
  context: {
    networkStatus: 'online' | 'offline' | 'unstable';
    queueHealth: 'healthy' | 'backlogged' | 'stalled';
    systemLoad: 'low' | 'medium' | 'high';
  };
}

/**
 * Capability diff history
 */
export interface CapabilityDiffHistory {
  sessionId: string;
  startTime: string;
  endTime?: string;
  
  // Capability changes
  changes: Array<{
    timestamp: string;
    updateId: string;
    changeType: 'feature_added' | 'feature_removed' | 'version_updated' | 'config_changed';
    path: string;
  oldValue?: unknown;
  newValue?: unknown;
    source: 'server_push' | 'polling' | 'manual_refresh';
    applied: boolean;
    rollbackAvailable: boolean;
  }>;
  
  // Rollback history
  rollbacks: Array<{
    timestamp: string;
    steps: number;
    reason: 'manual' | 'automatic' | 'error_recovery';
    success: boolean;
  }>;
  
  // Negotiation metrics
  negotiationMetrics: {
    totalUpdates: number;
    successfulUpdates: number;
    failedUpdates: number;
    averageLatency: number;
    connectionStability: number; // 0-1
  };
}

/**
 * v5 Export bundle structure
 */
export interface ExportBundleV5 {
  // Metadata
  version: 'v5';
  generatedAt: string;
  generatedBy: string;
  dataTypes: ExportDataType[];
  campaignId?: string;
  timeRange?: { start: string; end: string };
  
  // Core data (v4 compatibility)
  timeline?: TimelineEvent[];
  forecasts?: ForecastPoint[];
  recommendations?: CampaignRecommendation[];
  anomalies?: AnomalyRecord[];
  
  // v5 enhancements
  blendedForecastProvenance?: BlendedForecastProvenance[];
  rootCauseTraces?: RootCauseTrace[];
  offlineReplayLog?: OfflineReplayLogEntry[];
  capabilityHistory?: CapabilityDiffHistory[];
  healthFabricSnapshots?: HealthFabricSnapshot[];
  performanceMetrics?: PerformanceMetricRecord[];
  
  // Metadata
  exportMetadata: {
    totalSize: number; // bytes
    compressionRatio?: number;
    checksum: string;
    schemaVersion: string;
    compatibilityLevel: 'v4_compatible' | 'v5_only';
  };
}

/**
 * Export options for v5
 */
export interface ExportOptionsV5 {
  version?: ExportVersion;
  includeProvenance?: boolean;
  includeRootCauseTraces?: boolean;
  includeOfflineReplayLog?: boolean;
  includeCapabilityHistory?: boolean;
  includePerformanceMetrics?: boolean;
  
  // Filtering options
  timeRange?: { start: string; end: string };
  dataTypes?: ExportDataType[];
  maxSize?: number; // bytes
  
  // Output options
  format?: 'json' | 'csv' | 'compressed';
  compression?: 'gzip' | 'lz4' | 'none';
  includeMetadata?: boolean;
  
  // Privacy options
  anonymizeUserData?: boolean;
  excludeSensitiveFields?: boolean;
  hashIdentifiers?: boolean;
}

/**
 * Export statistics
 */
export interface ExportStatistics {
  totalExports: number;
  exportsByVersion: Record<ExportVersion, number>;
  exportsByFormat: Record<string, number>;
  averageExportSize: number;
  totalDataExported: number; // bytes
  
  // Performance metrics
  averageGenerationTime: number;
  exportSuccessRate: number;
  
  // Popular data types
  mostRequestedDataTypes: Array<{
    dataType: ExportDataType;
    requestCount: number;
  }>;
}

/**
 * Export v5 evolution service
 */
class ExportV5EvolutionService {
  private exportHistory: ExportBundleV5[] = [];
  private maxHistorySize = 100;

  /**
   * Generate v5 export bundle with enhanced capabilities
   */
  async generateExportV5(
    data: {
  timeline?: TimelineEvent[];
  forecasts?: ForecastPoint[];
  recommendations?: CampaignRecommendation[];
  anomalies?: AnomalyRecord[];
      blendedForecasts?: BlendedForecast[];
      causalChains?: CausalChain[];
      offlineActions?: DeferredAction[];
      offlineSyncStatus?: OfflineSyncStatus;
      capabilityDiffs?: CapabilityDiff[];
  healthFabricData?: HealthFabricSnapshot[];
  performanceData?: PerformanceMetricRecord[];
    },
    options: ExportOptionsV5 = {}
  ): Promise<ExportBundleV5> {
    const startTime = Date.now();
    
    // Default options
    const exportOptions = {
      version: 'v5' as ExportVersion,
      includeProvenance: true,
      includeRootCauseTraces: true,
      includeOfflineReplayLog: true,
      includeCapabilityHistory: true,
      includePerformanceMetrics: false,
      format: 'json' as const,
      compression: 'none' as const,
      includeMetadata: true,
      anonymizeUserData: false,
      excludeSensitiveFields: false,
      hashIdentifiers: false,
      maxSize: 50 * 1024 * 1024, // 50MB default
      timeRange: undefined,
      dataTypes: undefined,
      ...options,
    };

    // Build export bundle
    const bundle: ExportBundleV5 = {
      version: 'v5',
      generatedAt: new Date().toISOString(),
      generatedBy: 'ExportV5EvolutionService',
      dataTypes: [],
      campaignId: this.extractCampaignId(data),
      timeRange: exportOptions.timeRange,
      exportMetadata: {
        totalSize: 0,
        checksum: '',
        schemaVersion: '5.0.0',
        compatibilityLevel: exportOptions.version === 'v4' ? 'v4_compatible' : 'v5_only',
      },
    };

    // Add core data (v4 compatibility)
    if (data.timeline) {
      bundle.timeline = this.filterByTimeRange(data.timeline, exportOptions.timeRange);
      bundle.dataTypes.push('timeline');
    }

    if (data.forecasts) {
      bundle.forecasts = this.filterByTimeRange(data.forecasts, exportOptions.timeRange);
      bundle.dataTypes.push('forecasts');
    }

    if (data.recommendations) {
      bundle.recommendations = data.recommendations;
      bundle.dataTypes.push('recommendations');
    }

    if (data.anomalies) {
      bundle.anomalies = this.filterByTimeRange(data.anomalies, exportOptions.timeRange);
      bundle.dataTypes.push('anomalies');
    }

    // Add v5 enhancements
    if (exportOptions.includeProvenance && data.blendedForecasts) {
      bundle.blendedForecastProvenance = this.generateBlendedForecastProvenance(data.blendedForecasts);
      bundle.dataTypes.push('blended_forecasts');
    }

    if (exportOptions.includeRootCauseTraces && data.causalChains) {
      bundle.rootCauseTraces = this.generateRootCauseTraces(data.causalChains);
      bundle.dataTypes.push('root_cause_analysis');
    }

    if (exportOptions.includeOfflineReplayLog && (data.offlineActions || data.offlineSyncStatus)) {
      bundle.offlineReplayLog = this.generateOfflineReplayLog(data.offlineActions, data.offlineSyncStatus);
      bundle.dataTypes.push('offline_replay_log');
    }

    if (exportOptions.includeCapabilityHistory && data.capabilityDiffs) {
      bundle.capabilityHistory = this.generateCapabilityHistory(data.capabilityDiffs);
      bundle.dataTypes.push('capability_history');
    }

    if (data.healthFabricData) {
      bundle.healthFabricSnapshots = this.filterByTimeRange(data.healthFabricData, exportOptions.timeRange);
      bundle.dataTypes.push('health_fabric');
    }

    if (exportOptions.includePerformanceMetrics && data.performanceData) {
      bundle.performanceMetrics = this.filterByTimeRange(data.performanceData, exportOptions.timeRange);
      bundle.dataTypes.push('performance_metrics');
    }

    // Apply privacy options
    if (exportOptions.anonymizeUserData || exportOptions.excludeSensitiveFields || exportOptions.hashIdentifiers) {
      this.applyPrivacyFilters(bundle, exportOptions);
    }

    // Calculate metadata
    const bundleJson = JSON.stringify(bundle);
    bundle.exportMetadata.totalSize = bundleJson.length;
    bundle.exportMetadata.checksum = this.calculateChecksum(bundleJson);

    // Check size limits
    if (bundle.exportMetadata.totalSize > exportOptions.maxSize) {
      throw new Error(`Export size ${bundle.exportMetadata.totalSize} exceeds limit ${exportOptions.maxSize}`);
    }

    // Store in history
    this.addToHistory(bundle);

    telemetryService.emitTelemetry('export_v5_generated', {
      version: bundle.version,
      dataTypes: bundle.dataTypes,
      totalSize: bundle.exportMetadata.totalSize,
      compressionRatio: bundle.exportMetadata.compressionRatio,
      generationTimeMs: Date.now() - startTime,
    });

    return bundle;
  }

  /**
   * Generate backward-compatible v4 export
   */
  async generateExportV4(
    data: {
  timeline?: TimelineEvent[];
      forecasts?: ForecastPoint[];
  recommendations?: CampaignRecommendation[];
      anomalies?: AnomalyRecord[];
    },
    options: ExportOptionsV5 = {}
  ): Promise<unknown> {
    // Use v5 generator but filter out v5-specific features
    const v5Bundle = await this.generateExportV5(data, {
      ...options,
      version: 'v4',
      includeProvenance: false,
      includeRootCauseTraces: false,
      includeOfflineReplayLog: false,
      includeCapabilityHistory: false,
      includePerformanceMetrics: false,
    });

    // Convert to v4 format
    const v4Bundle = {
      version: 'v4',
      generatedAt: v5Bundle.generatedAt,
      timeline: v5Bundle.timeline,
      forecasts: v5Bundle.forecasts,
      recommendations: v5Bundle.recommendations,
      anomalies: v5Bundle.anomalies,
      metadata: {
        totalSize: v5Bundle.exportMetadata.totalSize,
        checksum: v5Bundle.exportMetadata.checksum,
      },
    };

    return v4Bundle;
  }

  /**
   * Import and validate export bundle
   */
  async importExportBundle(bundleData: string | ExportBundleV5): Promise<{
    bundle: ExportBundleV5;
    validation: {
      isValid: boolean;
      errors: string[];
      warnings: string[];
    };
  }> {
    const validation: { isValid: boolean; errors: string[]; warnings: string[] } = { isValid: true, errors: [], warnings: [] };

    try {
      let bundle: ExportBundleV5;

      if (typeof bundleData === 'string') {
        bundle = JSON.parse(bundleData);
      } else {
        bundle = bundleData;
      }

      // Validate structure
      if (!bundle.version) {
        validation.errors.push('Missing version field');
        validation.isValid = false;
      }

      if (!bundle.generatedAt) {
        validation.errors.push('Missing generatedAt field');
        validation.isValid = false;
      }

      if (!bundle.exportMetadata) {
        validation.errors.push('Missing exportMetadata field');
        validation.isValid = false;
      }

      // Validate checksum if present
      if (bundle.exportMetadata?.checksum) {
        const calculatedChecksum = this.calculateChecksum(JSON.stringify({
          ...bundle,
          exportMetadata: { ...bundle.exportMetadata, checksum: '' }
        }));
        
        if (calculatedChecksum !== bundle.exportMetadata.checksum) {
          validation.errors.push('Checksum validation failed');
          validation.isValid = false;
        }
      }

      // Version-specific validation
      if (bundle.version === 'v5') {
        this.validateV5Bundle(bundle, validation);
      }

      return { bundle, validation };

    } catch (error) {
      validation.isValid = false;
      validation.errors.push(`Import error: ${String(error)}`);
      
      return {
        bundle: {} as ExportBundleV5,
        validation,
      };
    }
  }

  /**
   * Get export statistics
   */
  getExportStatistics(): ExportStatistics {
    const exports = this.exportHistory;
    
    if (exports.length === 0) {
      return {
        totalExports: 0,
        exportsByVersion: { v4: 0, v5: 0 },
        exportsByFormat: {},
        averageExportSize: 0,
        totalDataExported: 0,
        averageGenerationTime: 0,
        exportSuccessRate: 1.0,
        mostRequestedDataTypes: [],
      };
    }

    // Calculate statistics
    const totalExports = exports.length;
    const exportsByVersion = exports.reduce((acc, exp) => {
      acc[exp.version]++;
      return acc;
    }, { v4: 0, v5: 0 });

    const totalSize = exports.reduce((sum, exp) => sum + exp.exportMetadata.totalSize, 0);
    const averageExportSize = totalSize / totalExports;

    // Count data types
    const dataTypeCounts = new Map<ExportDataType, number>();
    for (const exp of exports) {
      for (const dataType of exp.dataTypes) {
        dataTypeCounts.set(dataType, (dataTypeCounts.get(dataType) || 0) + 1);
      }
    }

    const mostRequestedDataTypes = Array.from(dataTypeCounts.entries())
      .map(([dataType, requestCount]) => ({ dataType, requestCount }))
      .sort((a, b) => b.requestCount - a.requestCount)
      .slice(0, 5);

    return {
      totalExports,
      exportsByVersion,
      exportsByFormat: { json: totalExports }, // Simplified
      averageExportSize,
      totalDataExported: totalSize,
      averageGenerationTime: 5000, // Simplified - would track actual times
      exportSuccessRate: 1.0, // Simplified - would track failures
      mostRequestedDataTypes,
    };
  }

  /**
   * Generate blended forecast provenance
   */
  private generateBlendedForecastProvenance(blendedForecasts: BlendedForecast[]): BlendedForecastProvenance[] {
    return blendedForecasts.map(blend => ({
      blendId: `blend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      metricKey: blend.metricKey,
      generatedAt: blend.generatedAt,
      blendMethod: blend.blendMethod,
      qualityScore: blend.qualityScore,
      
      modelContributions: Array.from(blend.posteriorWeights.entries()).map(([modelId, weight]) => ({
        modelId,
        modelType: modelId.includes('server') ? 'server' as const : 'client' as const,
        weight,
        confidence: 0.8, // Would be calculated from actual model performance
        performanceMetrics: {
          mae: 0, // Would be retrieved from model performance tracking
          mape: 0,
          sampleCount: 0,
        },
      })),
      
      historicalPerformance: [], // Would be populated from actual performance history
      weightEvolution: [], // Would be populated from weight change history
    }));
  }

  /**
   * Generate root-cause traces
   */
  private generateRootCauseTraces(causalChains: CausalChain[]): RootCauseTrace[] {
    return causalChains.map(chain => ({
      anomalyId: chain.anomalyId,
      analysisId: chain.id,
      detectedAt: new Date().toISOString(), // Would come from anomaly detection
      analyzedAt: chain.generatedAt,
      
      primaryFactor: chain.primaryFactor ? {
        type: chain.factors.find(f => f.id === chain.primaryFactor)?.type || 'unknown',
        description: chain.factors.find(f => f.id === chain.primaryFactor)?.description || '',
        confidence: chain.factors.find(f => f.id === chain.primaryFactor)?.confidence || 0,
        impact: chain.factors.find(f => f.id === chain.primaryFactor)?.impact || 0,
      } : undefined,
      
      contributingFactors: chain.factors.map(factor => ({
        type: factor.type,
        description: factor.description,
        confidence: factor.confidence,
        impact: factor.impact,
        timeRange: factor.timeRange,
        evidence: (factor.evidence || []).map(ev => ({
          // Best-effort mapping of existing evidence structure to RootCauseEvidence
            type: (ev as Record<string, unknown>).metric as string ?? 'metric',
            description: `deviation ${(ev as Record<string, unknown>).deviation ?? ''}`.trim(),
            value: (ev as Record<string, unknown>).value,
            confidence: undefined,
            source: 'generated',
            collectedAt: new Date().toISOString(),
        })),
      })),
      
      recommendedInterventions: chain.interventions.map(intervention => ({
        type: intervention.type,
        priority: intervention.priority,
        action: intervention.action,
        estimatedImpact: intervention.estimatedImpact,
        status: 'pending' as const, // Would be tracked separately
      })),
    }));
  }

  /**
   * Generate offline replay log
   */
  private generateOfflineReplayLog(
    actions?: DeferredAction[],
    syncStatus?: OfflineSyncStatus
  ): OfflineReplayLogEntry[] {
    const entries: OfflineReplayLogEntry[] = [];

    if (actions) {
      for (const action of actions) {
        entries.push({
          entryId: `log_${action.id}`,
          timestamp: action.createdAt,
          eventType: 'action_queued',
          actionDetails: {
            actionId: action.id,
            actionType: action.type,
            priority: action.priority,
            retryCount: action.retryCount,
            maxRetries: action.maxRetries,
          },
          context: {
            networkStatus: 'offline', // Would be determined from actual status
            queueHealth: 'healthy',
            systemLoad: 'medium',
          },
        });
      }
    }

    if (syncStatus) {
      entries.push({
        entryId: `sync_${Date.now()}`,
        timestamp: new Date().toISOString(),
        eventType: 'sync_attempted',
        syncDetails: {
          onlineStatus: syncStatus.isOnline,
          queueSize: syncStatus.queueSize,
          itemsProcessed: 0, // Would be tracked
          itemsFailed: syncStatus.failedActions,
        },
        context: {
          networkStatus: syncStatus.isOnline ? 'online' : 'offline',
          queueHealth: syncStatus.failedActions > 10 ? 'stalled' : 'healthy',
          systemLoad: 'medium',
        },
      });
    }

    return entries.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  /**
   * Generate capability history
   */
  private generateCapabilityHistory(diffs: CapabilityDiff[]): CapabilityDiffHistory[] {
    // Group diffs by session (simplified)
    const sessionId = `session_${Date.now()}`;
    
    return [{
      sessionId,
      startTime: diffs[0]?.timestamp || new Date().toISOString(),
      endTime: diffs[diffs.length - 1]?.timestamp || new Date().toISOString(),
      
      changes: diffs.map(diff => ({
        timestamp: diff.timestamp,
        updateId: `update_${Date.now()}`,
        changeType: diff.type,
        path: diff.path,
        oldValue: diff.oldValue,
        newValue: diff.newValue,
        source: 'server_push' as const,
        applied: true,
        rollbackAvailable: true,
      })),
      
      rollbacks: [], // Would be populated from actual rollback history
      
      negotiationMetrics: {
        totalUpdates: diffs.length,
        successfulUpdates: diffs.length,
        failedUpdates: 0,
        averageLatency: 100, // Would be measured
        connectionStability: 0.95,
      },
    }];
  }

  /**
   * Apply privacy filters to export bundle
   */
  private applyPrivacyFilters(bundle: ExportBundleV5, options: ExportOptionsV5): void {
    if (options.hashIdentifiers) {
      // Hash campaign IDs and other identifiers
      if (bundle.campaignId) {
        bundle.campaignId = this.hashValue(bundle.campaignId);
      }
    }

    if (options.excludeSensitiveFields) {
      // Remove sensitive fields from all data types
      // This would be implemented based on specific privacy requirements
    }

    if (options.anonymizeUserData) {
      // Anonymize user-specific data
      // This would be implemented based on specific privacy requirements
    }
  }

  /**
   * Filter data by time range
   */
  private filterByTimeRange<T extends { timestamp?: string; generatedAt?: string; createdAt?: string }>(data: T[] | undefined, timeRange?: { start: string; end: string }): T[] | undefined {
    if (!timeRange || !data) return data;

    const start = new Date(timeRange.start).getTime();
    const end = new Date(timeRange.end).getTime();

    return data.filter(item => {
      const timestamp = item.timestamp || item.generatedAt || item.createdAt;
      if (!timestamp) return true; // Include items without timestamps
      
      const itemTime = new Date(timestamp).getTime();
      return itemTime >= start && itemTime <= end;
    });
  }

  /**
   * Extract campaign ID from data
   */
  private extractCampaignId(data: Record<string, unknown>): string | undefined {
    // Look for campaign ID in various data structures
    for (const key of Object.keys(data)) {
      const value = (data as Record<string, unknown>)[key];
      if (Array.isArray(value) && value.length > 0) {
        const first = value[0];
        if (first && typeof first === 'object' && 'campaignId' in first) {
          return String((first as { campaignId: unknown }).campaignId);
        }
      }
    }
    return undefined;
  }

  /**
   * Calculate checksum for data integrity
   */
  private calculateChecksum(data: string): string {
    // Simplified checksum calculation
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Hash a value for privacy
   */
  private hashValue(value: string): string {
    return `hashed_${this.calculateChecksum(value)}`;
  }

  /**
   * Validate v5 bundle structure
   */
  private validateV5Bundle(bundle: ExportBundleV5, validation: { errors: string[]; warnings: string[] }): void {
    // Validate v5-specific fields
    if (bundle.blendedForecastProvenance) {
      for (const provenance of bundle.blendedForecastProvenance) {
        if (!provenance.blendId || !provenance.metricKey) {
          validation.errors.push('Invalid blended forecast provenance structure');
        }
      }
    }

    if (bundle.rootCauseTraces) {
      for (const trace of bundle.rootCauseTraces) {
        if (!trace.anomalyId || !trace.analysisId) {
          validation.errors.push('Invalid root cause trace structure');
        }
      }
    }

    // Check compatibility level
    if (bundle.exportMetadata.compatibilityLevel === 'v5_only') {
      if (bundle.timeline || bundle.forecasts || bundle.recommendations || bundle.anomalies) {
        validation.warnings.push('Bundle marked as v5_only but contains v4-compatible data');
      }
    }
  }

  /**
   * Add bundle to export history
   */
  private addToHistory(bundle: ExportBundleV5): void {
    this.exportHistory.push(bundle);
    
    // Maintain history size limit
    if (this.exportHistory.length > this.maxHistorySize) {
      this.exportHistory = this.exportHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Clear export history
   */
  clearHistory(): void {
    this.exportHistory = [];
  }
}

// Export singleton instance
export const exportV5EvolutionService = new ExportV5EvolutionService();