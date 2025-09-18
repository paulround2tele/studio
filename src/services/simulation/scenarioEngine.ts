/**
 * Scenario Simulation Engine (Phase 11)
 * Enable users to stage hypothetical interventions and view projected impacts
 */

import { useScenarioSimulation } from '../../lib/feature-flags-simple';
import { telemetryService } from '../campaignMetrics/telemetryService';

// Feature flag check
const isScenarioEnabled = (): boolean => {
  return useScenarioSimulation();
};

/**
 * Types of interventions that can be applied to scenarios
 */
export type Intervention = 
  | MetricShift 
  | CohortMixChange 
  | ModelWeightOverride 
  | DataQualityImprovementAssumption;

export interface MetricShift {
  type: 'metric_shift';
  metricKey: string;
  adjustment: number; // percentage change or absolute value
  adjustmentType: 'percentage' | 'absolute';
  description?: string;
}

export interface CohortMixChange {
  type: 'cohort_mix_change';
  cohortId: string;
  newMixRatio: number; // 0-1
  description?: string;
}

export interface ModelWeightOverride {
  type: 'model_weight_override';
  modelId: string;
  newWeight: number;
  description?: string;
}

export interface DataQualityImprovementAssumption {
  type: 'data_quality_improvement';
  metricKey: string;
  qualityScoreIncrease: number; // 0-1
  description?: string;
}

/**
 * Projected metric result from scenario analysis
 */
export interface ProjectedMetric {
  metricKey: string;
  baselineValue: number;
  projectedValue: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  causalAttribution: Array<{
    interventionId: string;
    contributionRatio: number;
  }>;
}

/**
 * Scenario baseline context
 */
export interface BaselineContext {
  campaignId: string;
  timeWindowMs: number;
  startTimestamp: number;
  endTimestamp: number;
  baselineMetrics: Record<string, number>;
  assumedCausalGraph?: any; // Reference to causal graph if available
}

/**
 * Complete scenario definition
 */
export interface Scenario {
  id: string;
  name: string;
  description?: string;
  baseline: BaselineContext;
  interventions: Intervention[];
  projectedMetrics: ProjectedMetric[];
  assumptions: string[];
  causalAttribution: Record<string, number>;
  createdAt: string;
  lastUpdated: string;
  deterministicSeed: string;
}

/**
 * In-memory store for scenarios
 */
class ScenarioStore {
  private scenarios = new Map<string, Scenario>();

  getScenario(id: string): Scenario | undefined {
    return this.scenarios.get(id);
  }

  setScenario(scenario: Scenario): void {
    this.scenarios.set(scenario.id, scenario);
  }

  getAllScenarios(): Scenario[] {
    return Array.from(this.scenarios.values());
  }

  deleteScenario(id: string): boolean {
    return this.scenarios.delete(id);
  }

  clear(): void {
    this.scenarios.clear();
  }
}

/**
 * Scenario Engine Service
 */
class ScenarioEngineService {
  private store = new ScenarioStore();

  /**
   * Create a new scenario with baseline context
   */
  createScenario(name: string, baselineContext: BaselineContext): string {
    if (!isScenarioEnabled()) {
      throw new Error('Scenario simulation is disabled');
    }

    const scenarioId = `scenario_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const scenario: Scenario = {
      id: scenarioId,
      name,
      baseline: baselineContext,
      interventions: [],
      projectedMetrics: [],
      assumptions: [],
      causalAttribution: {},
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      deterministicSeed: this.generateDeterministicSeed(scenarioId)
    };

    this.store.setScenario(scenario);

    telemetryService.emitTelemetry('scenario_created', {
      scenarioId,
      campaignId: baselineContext.campaignId,
      name
    });

    return scenarioId;
  }

  /**
   * Apply an intervention to a scenario and recompute projections
   */
  async applyIntervention(scenarioId: string, intervention: Intervention): Promise<void> {
    if (!isScenarioEnabled()) {
      throw new Error('Scenario simulation is disabled');
    }

    const scenario = this.store.getScenario(scenarioId);
    if (!scenario) {
      throw new Error(`Scenario ${scenarioId} not found`);
    }

    // Add intervention
    scenario.interventions.push(intervention);
    scenario.lastUpdated = new Date().toISOString();

    // Recompute projections based on interventions
    await this.recomputeProjections(scenario);

    this.store.setScenario(scenario);

    telemetryService.emitTelemetry('scenario_intervention_applied', {
      scenarioId,
      interventionType: intervention.type,
      interventionsCount: scenario.interventions.length
    });
  }

  /**
   * Get scenario projection results
   */
  getScenarioProjection(scenarioId: string): {
    metrics: ProjectedMetric[];
    assumptions: string[];
    causalAttribution: Record<string, number>;
  } | null {
    if (!isScenarioEnabled()) {
      return null;
    }

    const scenario = this.store.getScenario(scenarioId);
    if (!scenario) {
      return null;
    }

    telemetryService.emitTelemetry('scenario_projection_generated', {
      scenarioId,
      interventions: scenario.interventions.length,
      metricsAffected: scenario.projectedMetrics.length
    });

    return {
      metrics: scenario.projectedMetrics,
      assumptions: scenario.assumptions,
      causalAttribution: scenario.causalAttribution
    };
  }

  /**
   * Get all scenarios for a campaign
   */
  getScenariosForCampaign(campaignId: string): Scenario[] {
    if (!isScenarioEnabled()) {
      return [];
    }

    return this.store.getAllScenarios()
      .filter(scenario => scenario.baseline.campaignId === campaignId);
  }

  /**
   * Delete a scenario
   */
  deleteScenario(scenarioId: string): boolean {
    if (!isScenarioEnabled()) {
      return false;
    }

    const success = this.store.deleteScenario(scenarioId);
    
    if (success) {
      telemetryService.emitTelemetry('scenario_deleted', { scenarioId });
    }

    return success;
  }

  /**
   * Generate deterministic seed for reproducible simulations
   */
  private generateDeterministicSeed(scenarioId: string): string {
    // Simple hash-based seed generation for deterministic simulations
    let hash = 0;
    for (let i = 0; i < scenarioId.length; i++) {
      const char = scenarioId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `seed_${Math.abs(hash)}_${Date.now()}`;
  }

  /**
   * Recompute projections based on current interventions
   */
  private async recomputeProjections(scenario: Scenario): Promise<void> {
    // Start with baseline metrics
    const projectedMetrics: ProjectedMetric[] = [];
    const causalAttribution: Record<string, number> = {};

    // For each metric in baseline, compute projected value
    for (const [metricKey, baselineValue] of Object.entries(scenario.baseline.baselineMetrics)) {
      let projectedValue = baselineValue;
      const interventionContributions: Array<{ interventionId: string; contributionRatio: number }> = [];

      // Apply each intervention that affects this metric
      for (const intervention of scenario.interventions) {
        const contribution = this.calculateInterventionImpact(
          intervention, 
          metricKey, 
          baselineValue, 
          scenario.deterministicSeed
        );

        if (contribution.impact !== 0) {
          projectedValue += contribution.impact;
          interventionContributions.push({
            interventionId: `${intervention.type}_${Date.now()}`,
            contributionRatio: contribution.impact / baselineValue
          });
        }
      }

      // Add confidence interval (simplified model)
      const variance = Math.abs(projectedValue - baselineValue) * 0.1; // 10% variance
      
      projectedMetrics.push({
        metricKey,
        baselineValue,
        projectedValue,
        confidenceInterval: {
          lower: projectedValue - variance,
          upper: projectedValue + variance
        },
        causalAttribution: interventionContributions
      });

      // Update global attribution
      causalAttribution[metricKey] = (projectedValue - baselineValue) / baselineValue;
    }

    scenario.projectedMetrics = projectedMetrics;
    scenario.causalAttribution = causalAttribution;
    
    // Update assumptions based on interventions
    scenario.assumptions = this.generateAssumptions(scenario.interventions);
  }

  /**
   * Calculate impact of a single intervention on a metric
   */
  private calculateInterventionImpact(
    intervention: Intervention,
    metricKey: string,
    baselineValue: number,
    seed: string
  ): { impact: number; confidence: number } {
    // Deterministic pseudo-random based on seed
    const pseudoRandom = this.deterministicRandom(seed + intervention.type + metricKey);

    switch (intervention.type) {
      case 'metric_shift':
        if (intervention.metricKey === metricKey) {
          const impact = intervention.adjustmentType === 'percentage'
            ? baselineValue * (intervention.adjustment / 100)
            : intervention.adjustment;
          return { impact, confidence: 0.9 }; // High confidence for direct metric shifts
        }
        break;

      case 'cohort_mix_change':
        // Simplified: assume 10% correlation with all metrics
        const cohortImpact = baselineValue * 0.1 * (intervention.newMixRatio - 0.5) * pseudoRandom;
        return { impact: cohortImpact, confidence: 0.6 };

      case 'model_weight_override':
        // Simplified: assume model weight affects forecast accuracy
        const modelImpact = baselineValue * 0.05 * (intervention.newWeight - 1) * pseudoRandom;
        return { impact: modelImpact, confidence: 0.7 };

      case 'data_quality_improvement':
        if (intervention.metricKey === metricKey) {
          // Quality improvement reduces noise, potentially increases metric
          const qualityImpact = baselineValue * 0.02 * intervention.qualityScoreIncrease * pseudoRandom;
          return { impact: qualityImpact, confidence: 0.8 };
        }
        break;
    }

    return { impact: 0, confidence: 0 };
  }

  /**
   * Generate deterministic pseudo-random number from seed
   */
  private deterministicRandom(seed: string): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    // Convert to 0-1 range
    return Math.abs(hash) / 2147483647;
  }

  /**
   * Generate assumptions based on interventions
   */
  private generateAssumptions(interventions: Intervention[]): string[] {
    const assumptions: string[] = [
      'Causal relationships remain stable during projection period',
      'External factors maintain current influence levels',
      'Model performance characteristics persist'
    ];

    // Add intervention-specific assumptions
    for (const intervention of interventions) {
      switch (intervention.type) {
        case 'metric_shift':
          assumptions.push(`Direct metric adjustment for ${intervention.metricKey} is sustained`);
          break;
        case 'cohort_mix_change':
          assumptions.push(`Cohort mix change effects propagate linearly`);
          break;
        case 'model_weight_override':
          assumptions.push(`Model weight changes don't affect training data quality`);
          break;
        case 'data_quality_improvement':
          assumptions.push(`Data quality improvements have immediate effect`);
          break;
      }
    }

    return assumptions;
  }
}

// Export singleton instance
export const scenarioEngine = new ScenarioEngineService();