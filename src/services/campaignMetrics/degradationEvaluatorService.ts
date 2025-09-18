/**
 * Degradation Evaluator Service (Phase 8)
 * Manages system resilience and degradation modes with explicit tier definitions
 */

import { telemetryService } from './telemetryService';
import { capabilitiesService } from './capabilitiesService';
import { useBackendCanonical } from '@/lib/feature-flags-simple';

// Feature flag for degradation management
const isDegradationManagementEnabled = () => 
  process.env.NEXT_PUBLIC_DEGRADATION_MANAGEMENT !== 'false';

/**
 * System degradation tiers as per Phase 8 requirements
 */
export enum DegradationTier {
  FULL = 0,        // Full canonical (all server domains healthy)
  PARTIAL = 1,     // Missing one domain (e.g., forecast) – fallback partial
  MINIMAL = 2      // Multiple domain failures – minimal core metrics only
}

/**
 * Domain health status
 */
export interface DomainHealth {
  domain: 'forecast' | 'anomalies' | 'recommendations' | 'timeline' | 'benchmarks';
  status: 'healthy' | 'degraded' | 'failed';
  lastChecked: string;
  responseTime?: number;
  errorRate?: number;
  lastError?: string;
  fallbackActive: boolean;
}

/**
 * System degradation state
 */
export interface DegradationState {
  tier: DegradationTier;
  lastEvaluated: string;
  healthyDomains: string[];
  degradedDomains: string[];
  failedDomains: string[];
  activeFallbacks: string[];
  impactedFeatures: string[];
  estimatedRecoveryTime?: string;
  userVisibleImpact: {
    severity: 'none' | 'low' | 'medium' | 'high';
    description: string;
    affectedOperations: string[];
  };
}

/**
 * Degradation policy configuration
 */
export interface DegradationPolicy {
  tierThresholds: {
    partialThreshold: number; // Max failed domains for Tier 1
    minimalThreshold: number; // Max failed domains for Tier 2
  };
  criticalDomains: string[]; // Domains whose failure triggers immediate degradation
  gracefulFallbackEnabled: boolean;
  autoRecoveryEnabled: boolean;
  notificationThresholds: {
    warnOnTier: DegradationTier;
    alertOnTier: DegradationTier;
  };
}

/**
 * Domain capability requirements for each tier
 */
const TIER_REQUIREMENTS: Record<DegradationTier, {
  requiredDomains: string[];
  optionalDomains: string[];
  fallbackStrategies: Record<string, string>;
}> = {
  [DegradationTier.FULL]: {
    requiredDomains: ['forecast', 'anomalies', 'recommendations', 'timeline', 'benchmarks'],
    optionalDomains: [],
    fallbackStrategies: {}
  },
  [DegradationTier.PARTIAL]: {
    requiredDomains: ['timeline', 'benchmarks'], // Core functionality
    optionalDomains: ['forecast', 'anomalies', 'recommendations'],
    fallbackStrategies: {
      'forecast': 'client-heuristic',
      'anomalies': 'statistical-fallback',
      'recommendations': 'basic-heuristic'
    }
  },
  [DegradationTier.MINIMAL]: {
    requiredDomains: ['timeline'], // Absolute minimum
    optionalDomains: [],
    fallbackStrategies: {
      'forecast': 'disabled',
      'anomalies': 'disabled',
      'recommendations': 'basic-heuristic',
      'benchmarks': 'cached-only'
    }
  }
};

/**
 * Degradation evaluator service
 */
class DegradationEvaluatorService {
  private currentState: DegradationState | null = null;
  private domainHealthCache = new Map<string, DomainHealth>();
  private policy: DegradationPolicy;
  private evaluationInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.policy = this.getDefaultPolicy();
    this.startHealthMonitoring();
  }

  /**
   * Evaluate current system degradation tier
   */
  async evaluateDegradationTier(forceRefresh: boolean = false): Promise<DegradationState> {
    if (!isDegradationManagementEnabled()) {
      return this.createHealthyState();
    }

    const startTime = Date.now();

    // Refresh domain health if needed
    if (forceRefresh || this.needsHealthRefresh()) {
      await this.refreshDomainHealth();
    }

    // Analyze current domain health
    const healthAnalysis = this.analyzeDomainHealth();
    
    // Determine appropriate tier
    const tier = this.determineTier(healthAnalysis);
    
    // Create degradation state
    const state: DegradationState = {
      tier,
      lastEvaluated: new Date().toISOString(),
      healthyDomains: healthAnalysis.healthy,
      degradedDomains: healthAnalysis.degraded,
      failedDomains: healthAnalysis.failed,
      activeFallbacks: this.getActiveFallbacks(tier, healthAnalysis.failed),
      impactedFeatures: this.getImpactedFeatures(tier, healthAnalysis.failed),
      estimatedRecoveryTime: this.estimateRecoveryTime(healthAnalysis),
      userVisibleImpact: this.assessUserImpact(tier, healthAnalysis.failed)
    };

    // Store current state
    this.currentState = state;

    // Emit telemetry if tier changed
    if (!this.currentState || this.currentState.tier !== tier) {
      telemetryService.emitTelemetry('degradation_tier', {
        tier,
        missingDomains: healthAnalysis.failed,
        availableDomains: healthAnalysis.healthy
      });
    }

    console.log(`[DegradationEvaluator] Current tier: ${DegradationTier[tier]} (${Date.now() - startTime}ms)`);
    
    return state;
  }

  /**
   * Get current degradation state (cached)
   */
  getCurrentDegradationState(): DegradationState | null {
    return this.currentState;
  }

  /**
   * Check if system is in degraded state
   */
  isDegraded(): boolean {
    return this.currentState?.tier !== DegradationTier.FULL;
  }

  /**
   * Get recommended actions for current degradation state
   */
  getRecommendedActions(): Array<{
    action: string;
    priority: 'low' | 'medium' | 'high';
    description: string;
    estimatedTime: string;
  }> {
    if (!this.currentState || this.currentState.tier === DegradationTier.FULL) {
      return [];
    }

    const actions: Array<{
      action: string;
      priority: 'low' | 'medium' | 'high';
      description: string;
      estimatedTime: string;
    }> = [];

    // Actions based on failed domains
    this.currentState.failedDomains.forEach(domain => {
      switch (domain) {
        case 'forecast':
          actions.push({
            action: 'restore_forecast_service',
            priority: 'medium',
            description: 'Restore forecasting capabilities to enable predictive analytics',
            estimatedTime: '5-10 minutes'
          });
          break;
        case 'anomalies':
          actions.push({
            action: 'restore_anomaly_detection',
            priority: 'medium',
            description: 'Restore anomaly detection for proactive issue identification',
            estimatedTime: '3-5 minutes'
          });
          break;
        case 'recommendations':
          actions.push({
            action: 'restore_recommendation_engine',
            priority: 'low',
            description: 'Restore advanced recommendation capabilities',
            estimatedTime: '2-3 minutes'
          });
          break;
        case 'timeline':
          actions.push({
            action: 'restore_timeline_service',
            priority: 'high',
            description: 'Critical: Restore core timeline functionality',
            estimatedTime: '1-2 minutes'
          });
          break;
        case 'benchmarks':
          actions.push({
            action: 'restore_benchmark_service',
            priority: 'medium',
            description: 'Restore performance benchmarking and normalization',
            estimatedTime: '3-5 minutes'
          });
          break;
      }
    });

    return actions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Update degradation policy
   */
  updatePolicy(newPolicy: Partial<DegradationPolicy>): void {
    this.policy = { ...this.policy, ...newPolicy };
  }

  /**
   * Manual domain health override (for testing/emergency)
   */
  overrideDomainHealth(domain: string, status: DomainHealth['status']): void {
    const existing = this.domainHealthCache.get(domain);
    if (existing) {
      this.domainHealthCache.set(domain, {
        ...existing,
        status,
        lastChecked: new Date().toISOString()
      });
    }
  }

  /**
   * Start continuous health monitoring
   */
  private startHealthMonitoring(): void {
    if (this.evaluationInterval) return;

    // Evaluate degradation every 30 seconds
    this.evaluationInterval = setInterval(async () => {
      try {
        await this.evaluateDegradationTier();
      } catch (error) {
        console.warn('[DegradationEvaluator] Health monitoring failed:', error);
      }
    }, 30000);
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring(): void {
    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval);
      this.evaluationInterval = null;
    }
  }

  /**
   * Refresh domain health by checking each domain
   */
  private async refreshDomainHealth(): Promise<void> {
    const domains = ['forecast', 'anomalies', 'recommendations', 'timeline', 'benchmarks'];
    
    await Promise.allSettled(domains.map(async (domain) => {
      try {
        const health = await this.checkDomainHealth(domain);
        this.domainHealthCache.set(domain, health);
      } catch (error) {
        // Mark domain as failed if health check throws
        this.domainHealthCache.set(domain, {
          domain: domain as any,
          status: 'failed',
          lastChecked: new Date().toISOString(),
          lastError: error instanceof Error ? error.message : 'Unknown error',
          fallbackActive: true
        });
      }
    }));
  }

  /**
   * Check health of a specific domain
   */
  private async checkDomainHealth(domain: string): Promise<DomainHealth> {
    const startTime = Date.now();

    try {
      if (!useBackendCanonical()) {
        // If backend canonical is disabled, all domains are in fallback mode
        return {
          domain: domain as any,
          status: 'healthy',
          lastChecked: new Date().toISOString(),
          responseTime: 0,
          errorRate: 0,
          fallbackActive: true
        };
      }

      // Check domain through capabilities service
      await capabilitiesService.initialize();
      const resolution = capabilitiesService.resolveDomain(domain as any);
      
      if (resolution === 'skip') {
        return {
          domain: domain as any,
          status: 'failed',
          lastChecked: new Date().toISOString(),
          lastError: 'Domain marked as skip',
          fallbackActive: false
        };
      } else if (resolution === 'client-fallback') {
        return {
          domain: domain as any,
          status: 'degraded',
          lastChecked: new Date().toISOString(),
          responseTime: Date.now() - startTime,
          fallbackActive: true
        };
      } else {
        // Server resolution - check actual server health
        const serverHealth = await this.pingServerDomain(domain);
        return {
          domain: domain as any,
          status: serverHealth.ok ? 'healthy' : 'degraded',
          lastChecked: new Date().toISOString(),
          responseTime: Date.now() - startTime,
          errorRate: serverHealth.errorRate || 0,
          fallbackActive: !serverHealth.ok
        };
      }
    } catch (error) {
      return {
        domain: domain as any,
        status: 'failed',
        lastChecked: new Date().toISOString(),
        lastError: error instanceof Error ? error.message : 'Health check failed',
        fallbackActive: true
      };
    }
  }

  /**
   * Ping server domain for health check
   */
  private async pingServerDomain(domain: string): Promise<{ ok: boolean; errorRate?: number }> {
    // Mock health check - in practice would ping actual endpoints
    // For now, assume server domains are healthy if capabilities resolve to server
    return { ok: true, errorRate: 0 };
  }

  /**
   * Analyze current domain health status
   */
  private analyzeDomainHealth(): { healthy: string[]; degraded: string[]; failed: string[] } {
    const healthy: string[] = [];
    const degraded: string[] = [];
    const failed: string[] = [];

    this.domainHealthCache.forEach((health, domain) => {
      switch (health.status) {
        case 'healthy':
          healthy.push(domain);
          break;
        case 'degraded':
          degraded.push(domain);
          break;
        case 'failed':
          failed.push(domain);
          break;
      }
    });

    return { healthy, degraded, failed };
  }

  /**
   * Determine appropriate degradation tier
   */
  private determineTier(analysis: { healthy: string[]; degraded: string[]; failed: string[] }): DegradationTier {
    const totalUnhealthy = analysis.degraded.length + analysis.failed.length;
    
    // Check critical domains
    const criticalDomainsFailed = this.policy.criticalDomains.some(domain => 
      analysis.failed.includes(domain)
    );

    if (criticalDomainsFailed) {
      return DegradationTier.MINIMAL;
    }

    // Check tier thresholds
    if (totalUnhealthy === 0) {
      return DegradationTier.FULL;
    } else if (totalUnhealthy <= this.policy.tierThresholds.partialThreshold) {
      return DegradationTier.PARTIAL;
    } else {
      return DegradationTier.MINIMAL;
    }
  }

  /**
   * Get active fallbacks for current tier
   */
  private getActiveFallbacks(tier: DegradationTier, failedDomains: string[]): string[] {
    const tierConfig = TIER_REQUIREMENTS[tier];
    const fallbacks: string[] = [];

    failedDomains.forEach(domain => {
      const fallbackStrategy = tierConfig.fallbackStrategies[domain];
      if (fallbackStrategy && fallbackStrategy !== 'disabled') {
        fallbacks.push(`${domain}:${fallbackStrategy}`);
      }
    });

    return fallbacks;
  }

  /**
   * Get impacted features for current tier
   */
  private getImpactedFeatures(tier: DegradationTier, failedDomains: string[]): string[] {
    const features: string[] = [];

    if (tier === DegradationTier.MINIMAL) {
      features.push('Advanced Analytics', 'Predictive Forecasting', 'Anomaly Detection');
    } else if (tier === DegradationTier.PARTIAL) {
      failedDomains.forEach(domain => {
        switch (domain) {
          case 'forecast':
            features.push('Predictive Forecasting');
            break;
          case 'anomalies':
            features.push('Anomaly Detection');
            break;
          case 'recommendations':
            features.push('Smart Recommendations');
            break;
          case 'benchmarks':
            features.push('Performance Benchmarking');
            break;
        }
      });
    }

    return features;
  }

  /**
   * Estimate recovery time based on failed domains
   */
  private estimateRecoveryTime(analysis: { healthy: string[]; degraded: string[]; failed: string[] }): string {
    const totalIssues = analysis.degraded.length + analysis.failed.length;
    
    if (totalIssues === 0) return undefined;
    if (totalIssues === 1) return '2-5 minutes';
    if (totalIssues <= 2) return '5-10 minutes';
    return '10-15 minutes';
  }

  /**
   * Assess user-visible impact
   */
  private assessUserImpact(tier: DegradationTier, failedDomains: string[]): DegradationState['userVisibleImpact'] {
    switch (tier) {
      case DegradationTier.FULL:
        return {
          severity: 'none',
          description: 'All systems operational',
          affectedOperations: []
        };
      
      case DegradationTier.PARTIAL:
        return {
          severity: 'low',
          description: 'Some advanced features may be slower or use simplified alternatives',
          affectedOperations: failedDomains.map(d => `${d} service`)
        };
      
      case DegradationTier.MINIMAL:
        return {
          severity: 'medium',
          description: 'Operating in basic mode with core functionality only',
          affectedOperations: ['Advanced analytics', 'Predictive features', 'Real-time recommendations']
        };
      
      default:
        return {
          severity: 'high',
          description: 'System experiencing significant issues',
          affectedOperations: ['Multiple core services']
        };
    }
  }

  /**
   * Check if health refresh is needed
   */
  private needsHealthRefresh(): boolean {
    if (this.domainHealthCache.size === 0) return true;
    
    // Refresh if any domain health is older than 2 minutes
    const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
    return Array.from(this.domainHealthCache.values()).some(health => 
      new Date(health.lastChecked).getTime() < twoMinutesAgo
    );
  }

  /**
   * Create healthy state (all systems operational)
   */
  private createHealthyState(): DegradationState {
    return {
      tier: DegradationTier.FULL,
      lastEvaluated: new Date().toISOString(),
      healthyDomains: ['forecast', 'anomalies', 'recommendations', 'timeline', 'benchmarks'],
      degradedDomains: [],
      failedDomains: [],
      activeFallbacks: [],
      impactedFeatures: [],
      userVisibleImpact: {
        severity: 'none',
        description: 'All systems operational',
        affectedOperations: []
      }
    };
  }

  /**
   * Get default degradation policy
   */
  private getDefaultPolicy(): DegradationPolicy {
    return {
      tierThresholds: {
        partialThreshold: 1, // Max 1 failed domain for partial mode
        minimalThreshold: 3  // Max 3 failed domains for minimal mode
      },
      criticalDomains: ['timeline'], // Timeline is critical
      gracefulFallbackEnabled: true,
      autoRecoveryEnabled: true,
      notificationThresholds: {
        warnOnTier: DegradationTier.PARTIAL,
        alertOnTier: DegradationTier.MINIMAL
      }
    };
  }
}

// Export singleton instance
export const degradationEvaluatorService = new DegradationEvaluatorService();

/**
 * Evaluate current degradation tier (convenience function)
 */
export async function evaluateDegradationTier(forceRefresh?: boolean): Promise<DegradationState> {
  return degradationEvaluatorService.evaluateDegradationTier(forceRefresh);
}

/**
 * Get current degradation state (convenience function)
 */
export function getCurrentDegradationState(): DegradationState | null {
  return degradationEvaluatorService.getCurrentDegradationState();
}

/**
 * Check if degradation management is available
 */
export function isDegradationManagementAvailable(): boolean {
  return isDegradationManagementEnabled();
}

/**
 * Get degradation tier name for display
 */
export function getDegradationTierName(tier: DegradationTier): string {
  switch (tier) {
    case DegradationTier.FULL:
      return 'Full Service';
    case DegradationTier.PARTIAL:
      return 'Partial Service';
    case DegradationTier.MINIMAL:
      return 'Basic Service';
    default:
      return 'Unknown';
  }
}