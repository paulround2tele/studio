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
 * Domain health metrics (Extended for Phase 10)
 */
export interface DomainHealth {
  domainType: 'forecast' | 'anomalies' | 'recommendations' | 'timeline' | 'benchmarks' | 'stream' | 'data_quality' | 
               'causal_graph' | 'experiments' | 'privacy' | 'wasm_acceleration' | 'tracing' | 'summarization' | 'memory_pressure';
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
  // Phase 10 extensions
  phase10Extensions?: {
    causalEdges?: number;
    activeArms?: number;
    privacyViolations?: number;
    wasmKernelsLoaded?: number;
    activeSpans?: number;
    memoryUsageMB?: number;
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
    if (recentHistory.length < 2) {
      return {
        direction: 'stable',
        changeRate: 0,
        confidence: 0.5,
      };
    }

    const oldestScore = recentHistory[0]!.score;
    const newestScore = recentHistory[recentHistory.length - 1]!.score;
    const timeDiffHours = (recentHistory[recentHistory.length - 1]!.timestamp - recentHistory[0]!.timestamp) / (1000 * 60 * 60);
    
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
      const prevChange = history[i]!.score - history[i - 1]!.score;
      const nextChange = history[i + 1]!.score - history[i]!.score;
      
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
   * Get domain weight for overall health calculation (Extended for Phase 10)
   */
  private getDomainWeight(domainType: string): number {
    const weights: Record<string, number> = {
      data_quality: 1.2, // Critical for all other functions
      stream: 1.1, // Important for real-time operations
      memory_pressure: 1.1, // Critical for system stability
      privacy: 1.0, // Important for compliance
      forecast: 1.0,
      anomalies: 1.0,
      recommendations: 0.9,
      causal_graph: 0.9, // Phase 10: Important for insights
      experiments: 0.8, // Phase 10: Important for optimization
      tracing: 0.8, // Phase 10: Important for debugging
      timeline: 0.8,
      wasm_acceleration: 0.7, // Phase 10: Performance enhancement
      summarization: 0.7, // Phase 10: Nice to have
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

    this.updateTimer = (setInterval(() => {
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

    }, this.config.updateIntervalMs) as unknown) as number;
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
   * Update causal graph health status (Phase 10)
   */
  updateCausalGraphHealth(stats: { nodes: number; edges: number; confidence: number }): void {
    const score = this.calculateCausalGraphScore(stats);
    this.updateDomainHealth('causal_graph', {
      score,
      components: [
        {
          name: 'Node Count',
          score: Math.min(100, (stats.nodes / 50) * 100), // Up to 50 nodes considered optimal
          status: this.calculateStatusFromScore(Math.min(100, (stats.nodes / 50) * 100)),
          message: `${stats.nodes} nodes in graph`
        },
        {
          name: 'Edge Quality',
          score: stats.confidence * 100,
          status: this.calculateStatusFromScore(stats.confidence * 100),
          message: `Average confidence: ${(stats.confidence * 100).toFixed(1)}%`
        }
      ],
      phase10Extensions: {
        causalEdges: stats.edges
      }
    });
  }

  /**
   * Update experiment health status (Phase 10)
   */
  updateExperimentHealth(stats: { totalArms: number; totalPulls: number; averageReward: number }): void {
    const score = this.calculateExperimentScore(stats);
    this.updateDomainHealth('experiments', {
      score,
      components: [
        {
          name: 'Arm Coverage',
          score: Math.min(100, (stats.totalArms / 10) * 100), // Up to 10 arms considered good
          status: this.calculateStatusFromScore(Math.min(100, (stats.totalArms / 10) * 100)),
          message: `${stats.totalArms} active arms`
        },
        {
          name: 'Sample Size',
          score: Math.min(100, (stats.totalPulls / 1000) * 100), // 1000 pulls considered good sample
          status: this.calculateStatusFromScore(Math.min(100, (stats.totalPulls / 1000) * 100)),
          message: `${stats.totalPulls} total pulls`
        },
        {
          name: 'Reward Performance',
          score: stats.averageReward * 100,
          status: this.calculateStatusFromScore(stats.averageReward * 100),
          message: `Average reward: ${(stats.averageReward * 100).toFixed(1)}%`
        }
      ],
      phase10Extensions: {
        activeArms: stats.totalArms
      }
    });
  }

  /**
   * Update privacy health status (Phase 10)
   */
  updatePrivacyHealth(stats: { redactionsApplied: number; violations: number; auditEntries: number }): void {
    const score = this.calculatePrivacyScore(stats);
    this.updateDomainHealth('privacy', {
      score,
      components: [
        {
          name: 'Compliance',
          score: stats.violations === 0 ? 100 : Math.max(0, 100 - (stats.violations * 10)),
          status: stats.violations === 0 ? 'healthy' : (stats.violations < 5 ? 'warning' : 'critical'),
          message: `${stats.violations} violations detected`
        },
        {
          name: 'Audit Coverage',
          score: Math.min(100, (stats.auditEntries / 100) * 100),
          status: this.calculateStatusFromScore(Math.min(100, (stats.auditEntries / 100) * 100)),
          message: `${stats.auditEntries} audit entries`
        }
      ],
      phase10Extensions: {
        privacyViolations: stats.violations
      }
    });
  }

  /**
   * Update WASM acceleration health status (Phase 10)
   */
  updateWasmHealth(stats: { kernelsLoaded: number; totalKernels: number; fallbackRate: number }): void {
    const score = this.calculateWasmScore(stats);
    this.updateDomainHealth('wasm_acceleration', {
      score,
      components: [
        {
          name: 'Kernel Availability',
          score: stats.totalKernels > 0 ? (stats.kernelsLoaded / stats.totalKernels) * 100 : 100,
          status: this.calculateStatusFromScore(stats.totalKernels > 0 ? (stats.kernelsLoaded / stats.totalKernels) * 100 : 100),
          message: `${stats.kernelsLoaded}/${stats.totalKernels} kernels loaded`
        },
        {
          name: 'Performance',
          score: Math.max(0, 100 - (stats.fallbackRate * 100)),
          status: this.calculateStatusFromScore(Math.max(0, 100 - (stats.fallbackRate * 100))),
          message: `${(stats.fallbackRate * 100).toFixed(1)}% fallback rate`
        }
      ],
      phase10Extensions: {
        wasmKernelsLoaded: stats.kernelsLoaded
      }
    });
  }

  /**
   * Update tracing health status (Phase 10)
   */
  updateTracingHealth(stats: { activeSpans: number; errorRate: number; averageDuration: number }): void {
    const score = this.calculateTracingScore(stats);
    this.updateDomainHealth('tracing', {
      score,
      components: [
        {
          name: 'Active Spans',
          score: stats.activeSpans < 100 ? 100 : Math.max(0, 100 - ((stats.activeSpans - 100) / 10)),
          status: this.calculateStatusFromScore(stats.activeSpans < 100 ? 100 : Math.max(0, 100 - ((stats.activeSpans - 100) / 10))),
          message: `${stats.activeSpans} active spans`
        },
        {
          name: 'Error Rate',
          score: Math.max(0, 100 - (stats.errorRate * 100)),
          status: this.calculateStatusFromScore(Math.max(0, 100 - (stats.errorRate * 100))),
          message: `${(stats.errorRate * 100).toFixed(1)}% error rate`
        }
      ],
      phase10Extensions: {
        activeSpans: stats.activeSpans
      }
    });
  }

  /**
   * Update memory pressure health status (Phase 10)
   */
  updateMemoryPressureHealth(stats: { usedMB: number; totalMB: number; isHigh: boolean; isCritical: boolean }): void {
    const score = this.calculateMemoryScore(stats);
    this.updateDomainHealth('memory_pressure', {
      score,
      components: [
        {
          name: 'Memory Usage',
          score: Math.max(0, 100 - ((stats.usedMB / stats.totalMB) * 100)),
          status: stats.isCritical ? 'critical' : (stats.isHigh ? 'warning' : 'healthy'),
          message: `${stats.usedMB}MB / ${stats.totalMB}MB used`
        }
      ],
      phase10Extensions: {
        memoryUsageMB: stats.usedMB
      }
    });
  }

  /**
   * Get extended health fabric status (Phase 10)
   */
  getExtendedHealthStatus(): {
    overallScore: number;
    overallStatus: HealthStatus;
    phase10Status: {
      causalEdges: number;
      activeArms: number;
      privacyViolations: number;
      wasmKernelsLoaded: number;
      activeSpans: number;
      memoryUsageMB: number;
    };
    lastUpdated: string;
  } {
    const fabric = this.getHealthFabric();
    const domains = Array.from(fabric.domains.values());
    
    // Aggregate Phase 10 extensions
    const phase10Status = {
      causalEdges: 0,
      activeArms: 0,
      privacyViolations: 0,
      wasmKernelsLoaded: 0,
      activeSpans: 0,
      memoryUsageMB: 0
    };

    domains.forEach(domain => {
      if (domain.phase10Extensions) {
        phase10Status.causalEdges += domain.phase10Extensions.causalEdges || 0;
        phase10Status.activeArms += domain.phase10Extensions.activeArms || 0;
        phase10Status.privacyViolations += domain.phase10Extensions.privacyViolations || 0;
        phase10Status.wasmKernelsLoaded += domain.phase10Extensions.wasmKernelsLoaded || 0;
        phase10Status.activeSpans += domain.phase10Extensions.activeSpans || 0;
        phase10Status.memoryUsageMB = Math.max(phase10Status.memoryUsageMB, domain.phase10Extensions.memoryUsageMB || 0);
      }
    });

    return {
      overallScore: fabric.overallScore,
      overallStatus: fabric.overallStatus,
      phase10Status,
      lastUpdated: fabric.lastUpdated
    };
  }

  /**
   * Calculate causal graph health score
   */
  private calculateCausalGraphScore(stats: { nodes: number; edges: number; confidence: number }): number {
    const nodeScore = Math.min(100, (stats.nodes / 50) * 100); // Optimal: 50 nodes
    const edgeScore = Math.min(100, (stats.edges / 100) * 100); // Optimal: 100 edges
    const confidenceScore = stats.confidence * 100;
    
    return (nodeScore * 0.3 + edgeScore * 0.3 + confidenceScore * 0.4);
  }

  /**
   * Calculate experiment health score
   */
  private calculateExperimentScore(stats: { totalArms: number; totalPulls: number; averageReward: number }): number {
    const armScore = Math.min(100, (stats.totalArms / 10) * 100);
    const sampleScore = Math.min(100, (stats.totalPulls / 1000) * 100);
    const rewardScore = stats.averageReward * 100;
    
    return (armScore * 0.3 + sampleScore * 0.3 + rewardScore * 0.4);
  }

  /**
   * Calculate privacy health score
   */
  private calculatePrivacyScore(stats: { redactionsApplied: number; violations: number; auditEntries: number }): number {
    const complianceScore = stats.violations === 0 ? 100 : Math.max(0, 100 - (stats.violations * 10));
    const auditScore = Math.min(100, (stats.auditEntries / 100) * 100);
    const activityScore = Math.min(100, (stats.redactionsApplied / 50) * 100);
    
    return (complianceScore * 0.5 + auditScore * 0.3 + activityScore * 0.2);
  }

  /**
   * Calculate WASM health score
   */
  private calculateWasmScore(stats: { kernelsLoaded: number; totalKernels: number; fallbackRate: number }): number {
    const availabilityScore = stats.totalKernels > 0 ? (stats.kernelsLoaded / stats.totalKernels) * 100 : 100;
    const performanceScore = Math.max(0, 100 - (stats.fallbackRate * 100));
    
    return (availabilityScore * 0.6 + performanceScore * 0.4);
  }

  /**
   * Calculate tracing health score
   */
  private calculateTracingScore(stats: { activeSpans: number; errorRate: number; averageDuration: number }): number {
    const spanScore = stats.activeSpans < 100 ? 100 : Math.max(0, 100 - ((stats.activeSpans - 100) / 10));
    const errorScore = Math.max(0, 100 - (stats.errorRate * 100));
    const performanceScore = stats.averageDuration < 100 ? 100 : Math.max(0, 100 - ((stats.averageDuration - 100) / 10));
    
    return (spanScore * 0.3 + errorScore * 0.4 + performanceScore * 0.3);
  }

  /**
   * Calculate memory health score
   */
  private calculateMemoryScore(stats: { usedMB: number; totalMB: number; isHigh: boolean; isCritical: boolean }): number {
    if (stats.isCritical) return 20;
    if (stats.isHigh) return 50;
    
    const usagePercentage = (stats.usedMB / stats.totalMB) * 100;
    return Math.max(0, 100 - usagePercentage);
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