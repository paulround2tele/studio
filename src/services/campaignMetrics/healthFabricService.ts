/**
 * Health Fabric Service (Phase 9)
 * Unified domain health, data quality, and stream quality into consolidated health fabric
 */

import { telemetryService } from './telemetryService';

/**
 * Health score range: 0-100
 */
export type HealthScore = number;

/**
 * Health status categories
 */
export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

/**
 * Domain health metrics
 */
export interface DomainHealth {
  domainType: 'forecast' | 'anomalies' | 'recommendations' | 'timeline' | 'benchmarks' | 'stream' | 'data_quality';
  score: HealthScore;
  status: HealthStatus;
  lastUpdated: string;
  components: Array<{
    name: string;
    score: HealthScore;
    status: HealthStatus;
    message?: string;
    details?: Record<string, any>;
  }>;
  trends: {
    direction: 'improving' | 'stable' | 'degrading';
    changeRate: number; // score change per hour
    confidence: number; // 0-1
  };
}

/**
 * Health propagation rule
 */
export interface PropagationRule {
  id: string;
  sourceHealthType: string;
  targetHealthType: string;
  propagationType: 'direct' | 'weighted' | 'conditional';
  weight: number; // 0-1
  conditions?: Array<{
    field: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    value: any;
  }>;
  dampingFactor: number; // 0-1, reduces propagation strength
  enabled: boolean;
}

/**
 * Cascading effect tracking
 */
export interface CascadingEffect {
  id: string;
  originDomain: string;
  affectedDomains: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  propagationPath: Array<{
    from: string;
    to: string;
    weight: number;
    timestamp: string;
  }>;
  estimatedImpact: number; // 0-1
  detectedAt: string;
  isActive: boolean;
}

/**
 * Consolidated health fabric state
 */
export interface HealthFabric {
  overallScore: HealthScore;
  overallStatus: HealthStatus;
  domains: Map<string, DomainHealth>;
  propagationRules: PropagationRule[];
  activeCascades: CascadingEffect[];
  lastUpdated: string;
  updateFrequency: number; // updates per minute
}

/**
 * Health event for notifications
 */
export interface HealthEvent {
  id: string;
  type: 'score_change' | 'status_change' | 'cascade_detected' | 'recovery' | 'degradation';
  domain: string;
  oldValue?: any;
  newValue?: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  message: string;
}

/**
 * Health fabric configuration
 */
interface HealthFabricConfig {
  updateIntervalMs: number;
  scoreThresholds: {
    healthy: number; // >= this score
    warning: number; // >= this score but < healthy
    critical: number; // < warning score
  };
  cascadeDetectionSensitivity: number; // 0-1
  maxCascadeDepth: number;
  historicalTrendWindow: number; // minutes
}

/**
 * Health fabric service class
 */
class HealthFabricService {
  private healthFabric: HealthFabric = {
    overallScore: 100,
    overallStatus: 'healthy',
    domains: new Map(),
    propagationRules: [],
    activeCascades: [],
    lastUpdated: new Date().toISOString(),
    updateFrequency: 0,
  };

  private healthHistory = new Map<string, Array<{ score: number; timestamp: number }>>();
  private eventCallbacks = new Set<(event: HealthEvent) => void>();
  private updateTimer: number | null = null;
  private updateCounter = 0;
  private lastUpdateTime = Date.now();

  private config: HealthFabricConfig = {
    updateIntervalMs: 30000, // 30 seconds
    scoreThresholds: {
      healthy: 80,
      warning: 60,
      critical: 40,
    },
    cascadeDetectionSensitivity: 0.7,
    maxCascadeDepth: 5,
    historicalTrendWindow: 60, // 1 hour
  };

  constructor() {
    this.initializeDefaultRules();
    this.startHealthMonitoring();
  }

  /**
   * Update health for a specific domain
   */
  updateDomainHealth(domainType: string, health: Partial<DomainHealth>): void {
    const currentHealth = this.healthFabric.domains.get(domainType);
    
    const updatedHealth: DomainHealth = {
      domainType: domainType as any,
      score: 100,
      status: 'healthy',
      lastUpdated: new Date().toISOString(),
      components: [],
      trends: {
        direction: 'stable',
        changeRate: 0,
        confidence: 1,
      },
      ...currentHealth,
      ...health,
    };

    // Calculate status from score if not provided
    if (!health.status) {
      updatedHealth.status = this.calculateStatusFromScore(updatedHealth.score);
    }

    // Update trends
    updatedHealth.trends = this.calculateTrends(domainType, updatedHealth.score);

    // Check for significant changes
    if (currentHealth) {
      this.checkForHealthEvents(domainType, currentHealth, updatedHealth);
    }

    this.healthFabric.domains.set(domainType, updatedHealth);
    this.updateHistory(domainType, updatedHealth.score);

    // Propagate health changes
    this.propagateHealthChanges(domainType, updatedHealth);

    // Update overall health
    this.updateOverallHealth();

    telemetryService.emitTelemetry('domain_health_updated', {
      domain: domainType,
      score: updatedHealth.score,
      status: updatedHealth.status,
      trends: updatedHealth.trends,
    });
  }

  /**
   * Get health fabric state
   */
  getHealthFabric(): HealthFabric {
    return {
      ...this.healthFabric,
      domains: new Map(this.healthFabric.domains), // Shallow copy
    };
  }

  /**
   * Get health for specific domain
   */
  getDomainHealth(domainType: string): DomainHealth | undefined {
    return this.healthFabric.domains.get(domainType);
  }

  /**
   * Add propagation rule
   */
  addPropagationRule(rule: PropagationRule): void {
    // Remove existing rule with same ID
    this.healthFabric.propagationRules = this.healthFabric.propagationRules.filter(r => r.id !== rule.id);
    
    this.healthFabric.propagationRules.push(rule);

    telemetryService.emitTelemetry('propagation_rule_added', {
      ruleId: rule.id,
      source: rule.sourceHealthType,
      target: rule.targetHealthType,
      type: rule.propagationType,
    });
  }

  /**
   * Remove propagation rule
   */
  removePropagationRule(ruleId: string): boolean {
    const initialLength = this.healthFabric.propagationRules.length;
    this.healthFabric.propagationRules = this.healthFabric.propagationRules.filter(r => r.id !== ruleId);
    
    const removed = this.healthFabric.propagationRules.length < initialLength;
    
    if (removed) {
      telemetryService.emitTelemetry('propagation_rule_removed', {
        ruleId,
      });
    }
    
    return removed;
  }

  /**
   * Subscribe to health events
   */
  subscribeToHealthEvents(callback: (event: HealthEvent) => void): () => void {
    this.eventCallbacks.add(callback);
    
    return () => {
      this.eventCallbacks.delete(callback);
    };
  }

  /**
   * Get active cascading effects
   */
  getActiveCascades(): CascadingEffect[] {
    return [...this.healthFabric.activeCascades];
  }

  /**
   * Manually trigger cascade detection
   */
  detectCascadingEffects(): CascadingEffect[] {
    const detectedCascades: CascadingEffect[] = [];

    const domainEntries = Array.from(this.healthFabric.domains.entries());
    for (const [domainType, health] of domainEntries) {
      if (health.status === 'critical' || health.status === 'warning') {
        const cascade = this.analyzeCascadingEffects(domainType, health);
        if (cascade) {
          detectedCascades.push(cascade);
        }
      }
    }

    // Update active cascades
    this.healthFabric.activeCascades = detectedCascades;

    return detectedCascades;
  }

  /**
   * Initialize default propagation rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: PropagationRule[] = [
      {
        id: 'data_quality_to_forecast',
        sourceHealthType: 'data_quality',
        targetHealthType: 'forecast',
        propagationType: 'weighted',
        weight: 0.8,
        dampingFactor: 0.9,
        enabled: true,
      },
      {
        id: 'stream_to_anomalies',
        sourceHealthType: 'stream',
        targetHealthType: 'anomalies',
        propagationType: 'weighted',
        weight: 0.6,
        dampingFactor: 0.8,
        enabled: true,
      },
      {
        id: 'forecast_to_recommendations',
        sourceHealthType: 'forecast',
        targetHealthType: 'recommendations',
        propagationType: 'weighted',
        weight: 0.7,
        dampingFactor: 0.85,
        enabled: true,
      },
      {
        id: 'anomalies_to_recommendations',
        sourceHealthType: 'anomalies',
        targetHealthType: 'recommendations',
        propagationType: 'conditional',
        weight: 0.9,
        dampingFactor: 0.95,
        conditions: [
          { field: 'score', operator: 'lt', value: 70 }
        ],
        enabled: true,
      },
    ];

    this.healthFabric.propagationRules = defaultRules;
  }

  /**
   * Calculate status from numeric score
   */
  private calculateStatusFromScore(score: HealthScore): HealthStatus {
    if (score >= this.config.scoreThresholds.healthy) return 'healthy';
    if (score >= this.config.scoreThresholds.warning) return 'warning';
    if (score >= this.config.scoreThresholds.critical) return 'critical';
    return 'critical';
  }

  /**
   * Calculate health trends for a domain
   */
  private calculateTrends(domainType: string, currentScore: number): DomainHealth['trends'] {
    const history = this.healthHistory.get(domainType) || [];
    
    if (history.length < 2) {
      return {
        direction: 'stable',
        changeRate: 0,
        confidence: 0.5,
      };
    }

    // Calculate trend over recent history
    const recentHistory = history.slice(-10); // Last 10 data points
    const oldestScore = recentHistory[0].score;
    const newestScore = recentHistory[recentHistory.length - 1].score;
    const timeDiffHours = (recentHistory[recentHistory.length - 1].timestamp - recentHistory[0].timestamp) / (1000 * 60 * 60);
    
    const changeRate = timeDiffHours > 0 ? (newestScore - oldestScore) / timeDiffHours : 0;
    
    let direction: 'improving' | 'stable' | 'degrading' = 'stable';
    if (Math.abs(changeRate) > 1) { // Significant change threshold
      direction = changeRate > 0 ? 'improving' : 'degrading';
    }

    // Calculate confidence based on consistency of trend
    const consistency = this.calculateTrendConsistency(recentHistory);

    return {
      direction,
      changeRate,
      confidence: consistency,
    };
  }

  /**
   * Calculate trend consistency for confidence scoring
   */
  private calculateTrendConsistency(history: Array<{ score: number; timestamp: number }>): number {
    if (history.length < 3) return 0.5;

    let consistentChanges = 0;
    let totalChanges = 0;

    for (let i = 1; i < history.length - 1; i++) {
      const prevChange = history[i].score - history[i - 1].score;
      const nextChange = history[i + 1].score - history[i].score;
      
      totalChanges++;
      
      // Changes are consistent if they're in the same direction or both near zero
      if ((prevChange >= 0 && nextChange >= 0) || (prevChange <= 0 && nextChange <= 0) ||
          (Math.abs(prevChange) < 1 && Math.abs(nextChange) < 1)) {
        consistentChanges++;
      }
    }

    return totalChanges > 0 ? consistentChanges / totalChanges : 0.5;
  }

  /**
   * Check for significant health events
   */
  private checkForHealthEvents(
    domainType: string,
    oldHealth: DomainHealth,
    newHealth: DomainHealth
  ): void {
    const events: HealthEvent[] = [];

    // Status change event
    if (oldHealth.status !== newHealth.status) {
      const severity = this.getEventSeverity(newHealth.status);
      events.push({
        id: this.generateEventId(),
        type: 'status_change',
        domain: domainType,
        oldValue: oldHealth.status,
        newValue: newHealth.status,
        severity,
        timestamp: new Date().toISOString(),
        message: `${domainType} status changed from ${oldHealth.status} to ${newHealth.status}`,
      });
    }

    // Significant score change event
    const scoreDiff = Math.abs(newHealth.score - oldHealth.score);
    if (scoreDiff > 10) { // Significant change threshold
      const isImprovement = newHealth.score > oldHealth.score;
      events.push({
        id: this.generateEventId(),
        type: 'score_change',
        domain: domainType,
        oldValue: oldHealth.score,
        newValue: newHealth.score,
        severity: scoreDiff > 20 ? 'high' : 'medium',
        timestamp: new Date().toISOString(),
        message: `${domainType} score ${isImprovement ? 'improved' : 'degraded'} by ${scoreDiff.toFixed(1)} points`,
      });
    }

    // Emit events
    events.forEach(event => this.emitHealthEvent(event));
  }

  /**
   * Propagate health changes according to rules
   */
  private propagateHealthChanges(sourceDomain: string, sourceHealth: DomainHealth): void {
    const applicableRules = this.healthFabric.propagationRules.filter(rule => 
      rule.enabled && rule.sourceHealthType === sourceDomain
    );

    for (const rule of applicableRules) {
      // Check conditions if any
      if (rule.conditions && !this.evaluateConditions(rule.conditions, sourceHealth)) {
        continue;
      }

      const targetHealth = this.healthFabric.domains.get(rule.targetHealthType);
      if (!targetHealth) continue;

      // Calculate propagated effect
      const propagatedScore = this.calculatePropagatedScore(sourceHealth, targetHealth, rule);
      
      // Apply propagated effect if significant
      if (Math.abs(propagatedScore - targetHealth.score) > 1) {
        this.updateDomainHealth(rule.targetHealthType, {
          score: propagatedScore,
        });

        telemetryService.emitTelemetry('health_propagated', {
          from: sourceDomain,
          to: rule.targetHealthType,
          ruleId: rule.id,
          oldScore: targetHealth.score,
          newScore: propagatedScore,
        });
      }
    }
  }

  /**
   * Calculate propagated score based on rule
   */
  private calculatePropagatedScore(
    sourceHealth: DomainHealth,
    targetHealth: DomainHealth,
    rule: PropagationRule
  ): number {
    let propagatedScore = targetHealth.score;

    switch (rule.propagationType) {
      case 'direct':
        propagatedScore = sourceHealth.score * rule.weight * rule.dampingFactor;
        break;

      case 'weighted':
        const influence = (sourceHealth.score - 50) * rule.weight * rule.dampingFactor;
        propagatedScore = targetHealth.score + influence;
        break;

      case 'conditional':
        // Only propagate if source health is below threshold
        if (sourceHealth.score < 70) {
          const influence = (70 - sourceHealth.score) * rule.weight * rule.dampingFactor;
          propagatedScore = targetHealth.score - influence;
        }
        break;
    }

    // Clamp to valid range
    return Math.max(0, Math.min(100, propagatedScore));
  }

  /**
   * Evaluate rule conditions
   */
  private evaluateConditions(conditions: PropagationRule['conditions'], health: DomainHealth): boolean {
    if (!conditions) return true;

    return conditions.every(condition => {
      const value = this.getHealthFieldValue(health, condition.field);
      
      switch (condition.operator) {
        case 'gt': return value > condition.value;
        case 'gte': return value >= condition.value;
        case 'lt': return value < condition.value;
        case 'lte': return value <= condition.value;
        case 'eq': return value === condition.value;
        default: return false;
      }
    });
  }

  /**
   * Get field value from health object
   */
  private getHealthFieldValue(health: DomainHealth, field: string): any {
    switch (field) {
      case 'score': return health.score;
      case 'status': return health.status;
      default: return 0;
    }
  }

  /**
   * Update overall health based on domain healths
   */
  private updateOverallHealth(): void {
    const domains = Array.from(this.healthFabric.domains.values());
    
    if (domains.length === 0) {
      this.healthFabric.overallScore = 100;
      this.healthFabric.overallStatus = 'healthy';
      return;
    }

    // Calculate weighted average (critical domains have higher weight)
    let totalScore = 0;
    let totalWeight = 0;

    for (const domain of domains) {
      const weight = this.getDomainWeight(domain.domainType);
      totalScore += domain.score * weight;
      totalWeight += weight;
    }

    const overallScore = totalWeight > 0 ? totalScore / totalWeight : 100;
    const overallStatus = this.calculateStatusFromScore(overallScore);

    // Check for overall status change
    if (this.healthFabric.overallStatus !== overallStatus) {
      this.emitHealthEvent({
        id: this.generateEventId(),
        type: 'status_change',
        domain: 'overall',
        oldValue: this.healthFabric.overallStatus,
        newValue: overallStatus,
        severity: this.getEventSeverity(overallStatus),
        timestamp: new Date().toISOString(),
        message: `Overall system health changed from ${this.healthFabric.overallStatus} to ${overallStatus}`,
      });
    }

    this.healthFabric.overallScore = overallScore;
    this.healthFabric.overallStatus = overallStatus;
    this.healthFabric.lastUpdated = new Date().toISOString();
  }

  /**
   * Get domain weight for overall health calculation
   */
  private getDomainWeight(domainType: string): number {
    const weights: Record<string, number> = {
      data_quality: 1.2, // Critical for all other functions
      stream: 1.1, // Important for real-time operations
      forecast: 1.0,
      anomalies: 1.0,
      recommendations: 0.9,
      timeline: 0.8,
      benchmarks: 0.7,
    };

    return weights[domainType] || 1.0;
  }

  /**
   * Analyze cascading effects from a domain
   */
  private analyzeCascadingEffects(domainType: string, health: DomainHealth): CascadingEffect | null {
    const affectedDomains: string[] = [];
    const propagationPath: CascadingEffect['propagationPath'] = [];

    // Find all domains that could be affected by this domain's health
    const rules = this.healthFabric.propagationRules.filter(rule => 
      rule.enabled && rule.sourceHealthType === domainType
    );

    for (const rule of rules) {
      const impact = this.estimateRuleImpact(health, rule);
      
      if (impact > this.config.cascadeDetectionSensitivity) {
        affectedDomains.push(rule.targetHealthType);
        propagationPath.push({
          from: domainType,
          to: rule.targetHealthType,
          weight: impact,
          timestamp: new Date().toISOString(),
        });

        // Recursively check for further cascades (limited depth)
        if (propagationPath.length < this.config.maxCascadeDepth) {
          const targetHealth = this.healthFabric.domains.get(rule.targetHealthType);
          if (targetHealth) {
            const nestedCascade = this.analyzeCascadingEffects(rule.targetHealthType, targetHealth);
            if (nestedCascade) {
              affectedDomains.push(...nestedCascade.affectedDomains);
              propagationPath.push(...nestedCascade.propagationPath);
            }
          }
        }
      }
    }

    if (affectedDomains.length === 0) return null;

    const severity = this.calculateCascadeSeverity(health.score, affectedDomains.length);
    const estimatedImpact = this.calculateCascadeImpact(propagationPath);

    return {
      id: this.generateCascadeId(),
      originDomain: domainType,
      affectedDomains,
      severity,
      propagationPath,
      estimatedImpact,
      detectedAt: new Date().toISOString(),
      isActive: true,
    };
  }

  /**
   * Estimate impact of a propagation rule
   */
  private estimateRuleImpact(health: DomainHealth, rule: PropagationRule): number {
    // Simple impact estimation based on health score and rule weight
    const healthImpact = (100 - health.score) / 100; // 0-1 based on how unhealthy
    return healthImpact * rule.weight * rule.dampingFactor;
  }

  /**
   * Calculate cascade severity
   */
  private calculateCascadeSeverity(originScore: number, affectedCount: number): CascadingEffect['severity'] {
    const scoreSeverity = originScore < 40 ? 3 : originScore < 60 ? 2 : 1;
    const countSeverity = affectedCount > 3 ? 3 : affectedCount > 1 ? 2 : 1;
    
    const combinedSeverity = Math.max(scoreSeverity, countSeverity);
    
    switch (combinedSeverity) {
      case 3: return 'critical';
      case 2: return 'high';
      case 1: return 'medium';
      default: return 'low';
    }
  }

  /**
   * Calculate overall cascade impact
   */
  private calculateCascadeImpact(propagationPath: CascadingEffect['propagationPath']): number {
    if (propagationPath.length === 0) return 0;

    // Calculate cumulative impact considering path weights
    let totalImpact = 0;
    for (const step of propagationPath) {
      totalImpact += step.weight;
    }

    return Math.min(1, totalImpact / propagationPath.length);
  }

  /**
   * Start health monitoring loop
   */
  private startHealthMonitoring(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    this.updateTimer = setInterval(() => {
      this.updateCounter++;
      
      // Calculate update frequency
      const now = Date.now();
      const timeDiff = (now - this.lastUpdateTime) / 1000 / 60; // minutes
      this.healthFabric.updateFrequency = timeDiff > 0 ? 1 / timeDiff : 0;
      this.lastUpdateTime = now;

      // Detect cascading effects
      this.detectCascadingEffects();

      // Clean up old history
      this.cleanupHistory();

      // Update overall health
      this.updateOverallHealth();

    }, this.config.updateIntervalMs);
  }

  /**
   * Update health history for trending
   */
  private updateHistory(domainType: string, score: number): void {
    const history = this.healthHistory.get(domainType) || [];
    history.push({ score, timestamp: Date.now() });

    // Keep only recent history (last hour by default)
    const cutoffTime = Date.now() - (this.config.historicalTrendWindow * 60 * 1000);
    const recentHistory = history.filter(entry => entry.timestamp > cutoffTime);

    this.healthHistory.set(domainType, recentHistory);
  }

  /**
   * Clean up old history data
   */
  private cleanupHistory(): void {
    const cutoffTime = Date.now() - (this.config.historicalTrendWindow * 60 * 1000);
    
    const historyEntries = Array.from(this.healthHistory.entries());
    for (const [domainType, history] of historyEntries) {
      const recentHistory = history.filter(entry => entry.timestamp > cutoffTime);
      this.healthHistory.set(domainType, recentHistory);
    }
  }

  /**
   * Emit health event to subscribers
   */
  private emitHealthEvent(event: HealthEvent): void {
    this.eventCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('[HealthFabricService] Error in event callback:', error);
      }
    });

    telemetryService.emitTelemetry('health_event_emitted', {
      eventId: event.id,
      type: event.type,
      domain: event.domain,
      severity: event.severity,
    });
  }

  /**
   * Get event severity from health status
   */
  private getEventSeverity(status: HealthStatus): HealthEvent['severity'] {
    switch (status) {
      case 'critical': return 'critical';
      case 'warning': return 'high';
      case 'healthy': return 'low';
      default: return 'medium';
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `health_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique cascade ID
   */
  private generateCascadeId(): string {
    return `cascade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    this.eventCallbacks.clear();
    this.healthHistory.clear();
  }
}

// Export singleton instance
export const healthFabricService = new HealthFabricService();