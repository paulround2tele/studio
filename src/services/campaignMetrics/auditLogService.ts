/**
 * Audit Log Service (Phase 8)
 * Client-side assembly of user-visible metric interventions with exportable audit trail
 */

import { telemetryService } from './telemetryService';

// Feature flag for audit logging
const isAuditLoggingEnabled = () => 
  process.env.NEXT_PUBLIC_AUDIT_LOGGING !== 'false';

/**
 * Audit log entry for governance actions
 */
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  sessionId: string;
  userId?: string;
  action: 'normalization_toggle' | 'horizon_override' | 'cohort_mode_change' | 'metric_intervention' | 'forecast_arbitration_override' | 'degradation_mode_override';
  context: {
    campaignId?: string;
    metricKey?: string;
    domainType?: string;
    oldValue?: any;
    newValue?: any;
    reason?: string;
    automaticTrigger?: boolean;
  };
  metadata: {
    userAgent?: string;
    ipAddress?: string; // Hashed/anonymized
    featureFlags?: string[];
    systemVersion?: string;
  };
  impact: {
    affectedCampaigns?: string[];
    affectedMetrics?: string[];
    estimatedDataPoints?: number;
  };
}

/**
 * Audit trail export format
 */
export interface AuditTrailExport {
  version: 4; // Export schema v4 as per Phase 8 requirements
  generatedAt: string;
  timeRange: {
    startTime: string;
    endTime: string;
  };
  entries: AuditLogEntry[];
  summary: {
    totalEntries: number;
    actionBreakdown: Record<string, number>;
    uniqueUsers: number;
    affectedCampaigns: number;
  };
  metadata: {
    exportedBy?: string;
    exportReason?: string;
    retentionPolicy?: string;
  };
}

/**
 * Audit log service class for governance tracking
 */
class AuditLogService {
  private logs: AuditLogEntry[] = [];
  private maxRetainedLogs = 1000;
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.loadPersistedLogs();
  }

  /**
   * Log a governance action
   */
  logGovernanceAction(
    action: AuditLogEntry['action'],
    context: AuditLogEntry['context'],
    impact?: AuditLogEntry['impact']
  ): void {
    if (!isAuditLoggingEnabled()) return;

    const entry: AuditLogEntry = {
      id: this.generateEntryId(),
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      action,
      context,
      metadata: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        featureFlags: this.getActiveFeatureFlags(),
        systemVersion: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'
      },
      impact: impact || this.estimateImpact(action, context)
    };

    this.logs.push(entry);
    this.enforceRetentionPolicy();
    this.persistLogs();

    // Emit telemetry for governance action
    telemetryService.emitTelemetry('governance_action', {
      action,
      context
    });

    console.log('[AuditLog] Action logged:', action, context);
  }

  /**
   * Get audit logs with optional filtering
   */
  getAuditLogs(filter?: {
    action?: AuditLogEntry['action'];
    campaignId?: string;
    userId?: string;
    startTime?: string;
    endTime?: string;
    limit?: number;
  }): AuditLogEntry[] {
    let filteredLogs = [...this.logs];

    if (filter) {
      if (filter.action) {
        filteredLogs = filteredLogs.filter(log => log.action === filter.action);
      }
      if (filter.campaignId) {
        filteredLogs = filteredLogs.filter(log => 
          log.context.campaignId === filter.campaignId ||
          (filter.campaignId && log.impact.affectedCampaigns?.includes(filter.campaignId))
        );
      }
      if (filter.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === filter.userId);
      }
      if (filter.startTime) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.startTime!);
      }
      if (filter.endTime) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filter.endTime!);
      }
      if (filter.limit) {
        filteredLogs = filteredLogs.slice(-filter.limit);
      }
    }

    return filteredLogs.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  /**
   * Export audit trail in standard format
   */
  exportAuditTrail(
    timeRange?: { startTime: string; endTime: string },
    exportMetadata?: { exportedBy?: string; exportReason?: string }
  ): AuditTrailExport {
    const logs = this.getAuditLogs(timeRange);
    
    // Calculate summary statistics
    const actionBreakdown: Record<string, number> = {};
    const uniqueUsers = new Set<string>();
    const affectedCampaigns = new Set<string>();

    logs.forEach(log => {
      actionBreakdown[log.action] = (actionBreakdown[log.action] || 0) + 1;
      if (log.userId) uniqueUsers.add(log.userId);
      if (log.context.campaignId) affectedCampaigns.add(log.context.campaignId);
      log.impact.affectedCampaigns?.forEach(id => affectedCampaigns.add(id));
    });

    return {
      version: 4,
      generatedAt: new Date().toISOString(),
      timeRange: timeRange || {
        startTime: logs[0]?.timestamp || new Date().toISOString(),
        endTime: logs[logs.length - 1]?.timestamp || new Date().toISOString()
      },
      entries: logs,
      summary: {
        totalEntries: logs.length,
        actionBreakdown,
        uniqueUsers: uniqueUsers.size,
        affectedCampaigns: affectedCampaigns.size
      },
      metadata: {
        ...exportMetadata,
        retentionPolicy: `${this.maxRetainedLogs} entries`
      }
    };
  }

  /**
   * Clear audit logs (with confirmation)
   */
  clearAuditLogs(confirmation: { reason: string; confirmedBy?: string }): void {
    if (!confirmation.reason) {
      throw new Error('Reason required for audit log clearance');
    }

    // Log the clearance action itself
    this.logGovernanceAction('metric_intervention', {
      reason: `Audit logs cleared: ${confirmation.reason}`,
      oldValue: this.logs.length,
      newValue: 0
    });

    this.logs = [];
    this.persistLogs();
    
    console.log('[AuditLog] Logs cleared:', confirmation);
  }

  /**
   * Set user context for subsequent actions
   */
  setUserContext(userId: string): void {
    this.logs.forEach(log => {
      if (!log.userId && log.sessionId === this.sessionId) {
        log.userId = userId;
      }
    });
    this.persistLogs();
  }

  /**
   * Get audit statistics
   */
  getAuditStatistics(): {
    totalEntries: number;
    recentActions: number; // Last 24h
    topActions: Array<{ action: string; count: number }>;
    retentionUtilization: number; // Percentage of max retained logs
  } {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentActions = this.logs.filter(log => 
      new Date(log.timestamp) > dayAgo
    ).length;

    const actionCounts: Record<string, number> = {};
    this.logs.forEach(log => {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    });

    const topActions = Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalEntries: this.logs.length,
      recentActions,
      topActions,
      retentionUtilization: (this.logs.length / this.maxRetainedLogs) * 100
    };
  }

  /**
   * Generate unique entry ID
   */
  private generateEntryId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get active feature flags for context
   */
  private getActiveFeatureFlags(): string[] {
    const flags: string[] = [];
    
    if (process.env.NEXT_PUBLIC_ENABLE_BACKEND_CANONICAL === 'true') {
      flags.push('backend_canonical');
    }
    if (process.env.NEXT_PUBLIC_ENABLE_FORECASTS !== 'false') {
      flags.push('forecasts');
    }
    if (process.env.NEXT_PUBLIC_STREAM_POOLING !== 'false') {
      flags.push('stream_pooling');
    }
    if (process.env.NEXT_PUBLIC_STREAM_DIFFERENTIAL_UPDATES !== 'false') {
      flags.push('differential_updates');
    }
    
    return flags;
  }

  /**
   * Estimate impact of governance action
   */
  private estimateImpact(
    action: AuditLogEntry['action'], 
    context: AuditLogEntry['context']
  ): AuditLogEntry['impact'] {
    const impact: AuditLogEntry['impact'] = {};

    // Estimate affected campaigns and metrics based on action type
    switch (action) {
      case 'normalization_toggle':
        if (context.campaignId) {
          impact.affectedCampaigns = [context.campaignId];
          impact.estimatedDataPoints = 100; // Rough estimate
        }
        if (context.metricKey) {
          impact.affectedMetrics = [context.metricKey];
        }
        break;
      
      case 'horizon_override':
        if (context.campaignId) {
          impact.affectedCampaigns = [context.campaignId];
          impact.estimatedDataPoints = context.newValue || 7; // Forecast horizon
        }
        break;
      
      case 'cohort_mode_change':
        // Global impact for cohort changes
        impact.estimatedDataPoints = 1000; // Multiple campaigns
        break;
      
      default:
        impact.estimatedDataPoints = 1;
    }

    return impact;
  }

  /**
   * Enforce retention policy
   */
  private enforceRetentionPolicy(): void {
    if (this.logs.length > this.maxRetainedLogs) {
      const excess = this.logs.length - this.maxRetainedLogs;
      this.logs.splice(0, excess);
    }
  }

  /**
   * Persist logs to storage
   */
  private persistLogs(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const serialized = JSON.stringify({
          logs: this.logs,
          sessionId: this.sessionId,
          lastPersisted: new Date().toISOString()
        });
        localStorage.setItem('audit_logs_v1', serialized);
      } catch (error) {
        console.warn('[AuditLog] Failed to persist logs:', error);
      }
    }
  }

  /**
   * Load persisted logs from storage
   */
  private loadPersistedLogs(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('audit_logs_v1');
        if (stored) {
          const data = JSON.parse(stored);
          this.logs = data.logs || [];
          // Keep current session ID, don't restore old one
        }
      } catch (error) {
        console.warn('[AuditLog] Failed to load persisted logs:', error);
        this.logs = [];
      }
    }
  }
}

// Export singleton instance
export const auditLogService = new AuditLogService();

/**
 * Log a governance action (convenience function)
 */
export function logGovernanceAction(
  action: AuditLogEntry['action'],
  context: AuditLogEntry['context'],
  impact?: AuditLogEntry['impact']
): void {
  auditLogService.logGovernanceAction(action, context, impact);
}

/**
 * Export audit trail (convenience function)
 */
export function exportAuditTrail(
  timeRange?: { startTime: string; endTime: string },
  exportMetadata?: { exportedBy?: string; exportReason?: string }
): AuditTrailExport {
  return auditLogService.exportAuditTrail(timeRange, exportMetadata);
}

/**
 * Check if audit logging is available
 */
export function isAuditLoggingAvailable(): boolean {
  return isAuditLoggingEnabled();
}

/**
 * Get audit statistics (convenience function)
 */
export function getAuditStatistics(): ReturnType<AuditLogService['getAuditStatistics']> {
  return auditLogService.getAuditStatistics();
}