import { NonEmptyArray, selectRandom, normalizeArmStats } from '@/lib/utils/typeSafetyPrimitives';

/**
 * Adaptive Experimentation Service (Phase 10)
 * Contextual bandit implementation with UCB/Thompson sampling
 */

// Feature flag check
const isBanditExperimentsEnabled = (): boolean => {
  return typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_ENABLE_BANDIT_EXPERIMENTS === 'true';
};

// Types for bandit arms and context
export interface BanditArm {
  id: string;
  meta: {
    name: string;
    description: string;
    category: string;
    version: string;
  };
  stats: {
    pulls: number;
    totalReward: number;
    averageReward: number;
    confidence: number;
    lastUpdated: string;
  };
  created: string;
}

export interface BanditContext {
  userId?: string;
  campaignId?: string;
  domain?: string;
  features: Record<string, number | string | boolean>;
  timestamp: string;
}

export interface BanditOutcome {
  armId: string;
  reward: number;
  context: BanditContext;
  timestamp: string;
}

export interface BanditDecision {
  armId: string;
  estimatedReward: number;
  strategy: 'ucb' | 'thompson' | 'epsilon_greedy' | 'deterministic_cycle';
  confidence: number;
  explorationFactor: number;
}

// Configuration for bandit strategies
export interface BanditConfig {
  strategy: 'ucb' | 'thompson' | 'epsilon_greedy' | 'hybrid';
  explorationFactor: number;
  minSampleSize: number;
  confidenceLevel: number;
  epsilonDecay: number;
}

// Telemetry events
export interface BanditDecisionEvent {
  armId: string;
  estimatedReward: number;
  strategy: string;
}

export interface BanditRewardEvent {
  armId: string;
  reward: number;
}

/**
 * Bandit Service Class
 */
class BanditService {
  private arms = new Map<string, BanditArm>();
  private outcomes: BanditOutcome[] = [];
  private config: BanditConfig;
  private totalPulls = 0;

  constructor(config: Partial<BanditConfig> = {}) {
    this.config = {
      strategy: config.strategy || 'hybrid',
      explorationFactor: config.explorationFactor || 1.0,
      minSampleSize: config.minSampleSize || 10,
      confidenceLevel: config.confidenceLevel || 0.95,
      epsilonDecay: config.epsilonDecay || 0.999
    };
  }

  /**
   * Check if bandit experiments are available
   */
  isAvailable(): boolean {
    return isBanditExperimentsEnabled();
  }

  /**
   * Register a new arm
   */
  registerArm(id: string, meta: BanditArm['meta']): void {
    if (!this.isAvailable()) return;

    if (this.arms.has(id)) {
      throw new Error(`Arm with id ${id} already exists`);
    }

    const arm: BanditArm = {
      id,
      meta,
      stats: {
        pulls: 0,
        totalReward: 0,
        averageReward: 0,
        confidence: 0,
        lastUpdated: new Date().toISOString()
      },
      created: new Date().toISOString()
    };

    this.arms.set(id, arm);
  }

  /**
   * Record outcome for an arm
   */
  recordOutcome(armId: string, reward: number, context: BanditContext): void {
    if (!this.isAvailable()) return;

    const arm = this.arms.get(armId);
    if (!arm) {
      throw new Error(`Arm with id ${armId} not found`);
    }

    // Record outcome
    const outcome: BanditOutcome = {
      armId,
      reward,
      context,
      timestamp: new Date().toISOString()
    };

    this.outcomes.push(outcome);
    this.totalPulls++;

    // Update arm statistics
    arm.stats.pulls++;
    arm.stats.totalReward += reward;
    arm.stats.averageReward = arm.stats.totalReward / arm.stats.pulls;
    arm.stats.confidence = this.calculateConfidence(arm);
    arm.stats.lastUpdated = new Date().toISOString();

    this.arms.set(armId, arm);

    // Emit telemetry
    this.emitRewardTelemetry({
      armId,
      reward
    });

    // Cleanup old outcomes (keep last 1000)
    if (this.outcomes.length > 1000) {
      this.outcomes = this.outcomes.slice(-1000);
    }
  }

  /**
   * Select best arm based on context
   */
  selectArm(context: BanditContext): BanditDecision {
    if (!this.isAvailable() || this.arms.size === 0) {
      throw new Error('No arms available for selection');
    }

    const armIds = Array.from(this.arms.keys());

    // Use deterministic cycle if insufficient samples
    if (this.totalPulls < this.config.minSampleSize * this.arms.size) {
      const armIds = Array.from(this.arms.keys());
      const selectedArmId = armIds[this.totalPulls % armIds.length];
      if (!selectedArmId) {
        throw new Error('No arms available in deterministic cycle');
      }
      
      const decision: BanditDecision = {
        armId: selectedArmId,
        estimatedReward: 0.5,
        strategy: 'deterministic_cycle',
        confidence: 0,
        explorationFactor: 1.0
      };

      this.emitDecisionTelemetry(decision);
      return decision;
    }

    // Select strategy
    let selectedStrategy = this.config.strategy;
    if (selectedStrategy === 'hybrid') {
      // Use UCB for early exploration, Thompson for later exploitation
      selectedStrategy = this.totalPulls < 100 ? 'ucb' : 'thompson';
    }

    let decision: BanditDecision;

    switch (selectedStrategy) {
      case 'ucb':
        decision = this.selectArmUCB(context);
        break;
      case 'thompson':
        decision = this.selectArmThompson(context);
        break;
      case 'epsilon_greedy':
        decision = this.selectArmEpsilonGreedy(context);
        break;
      default:
        decision = this.selectArmUCB(context);
    }

    this.emitDecisionTelemetry(decision);
    return decision;
  }

  /**
   * Get all registered arms
   */
  getArms(): BanditArm[] {
    if (!this.isAvailable()) return [];
    return Array.from(this.arms.values());
  }

  /**
   * Get arm by ID
   */
  getArm(id: string): BanditArm | undefined {
    if (!this.isAvailable()) return undefined;
    return this.arms.get(id);
  }

  /**
   * Get recent outcomes
   */
  getRecentOutcomes(limit: number = 100): BanditOutcome[] {
    if (!this.isAvailable()) return [];
    return this.outcomes.slice(-limit);
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    totalPulls: number;
    totalArms: number;
    bestArm: BanditArm | null;
    worstArm: BanditArm | null;
    averageReward: number;
  } {
    if (!this.isAvailable() || this.arms.size === 0) {
      return {
        totalPulls: 0,
        totalArms: 0,
        bestArm: null,
        worstArm: null,
        averageReward: 0
      };
    }

    const arms = Array.from(this.arms.values());
    const validArms = arms.filter(arm => arm.stats.pulls > 0);

    const bestArm = validArms.reduce((best, arm) => 
      arm.stats.averageReward > best.stats.averageReward ? arm : best
    );

    const worstArm = validArms.reduce((worst, arm) => 
      arm.stats.averageReward < worst.stats.averageReward ? arm : worst
    );

    const totalReward = this.outcomes.reduce((sum, outcome) => sum + outcome.reward, 0);
    const averageReward = this.totalPulls > 0 ? totalReward / this.totalPulls : 0;

    return {
      totalPulls: this.totalPulls,
      totalArms: this.arms.size,
      bestArm: validArms.length > 0 ? bestArm : null,
      worstArm: validArms.length > 0 ? worstArm : null,
      averageReward
    };
  }

  /**
   * Clear all data (useful for testing)
   */
  clear(): void {
    this.arms.clear();
    this.outcomes = [];
    this.totalPulls = 0;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<BanditConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * UCB (Upper Confidence Bound) arm selection
   */
  private selectArmUCB(context: BanditContext): BanditDecision {
    const arms = Array.from(this.arms.values());
    let bestArm: BanditArm | null = null;
    let bestUcbValue = -Infinity;

    for (const arm of arms) {
      if (arm.stats.pulls === 0) {
        // Always try untested arms first
        return {
          armId: arm.id,
          estimatedReward: 1.0,
          strategy: 'ucb',
          confidence: 0,
          explorationFactor: this.config.explorationFactor
        };
      }

      const ucbValue = this.calculateUCB(arm);
      if (ucbValue > bestUcbValue) {
        bestUcbValue = ucbValue;
        bestArm = arm;
      }
    }

    if (!bestArm) {
      throw new Error('No valid arm found for UCB selection');
    }

    return {
      armId: bestArm.id,
      estimatedReward: bestUcbValue,
      strategy: 'ucb',
      confidence: bestArm.stats.confidence,
      explorationFactor: this.config.explorationFactor
    };
  }

  /**
   * Thompson Sampling arm selection
   */
  private selectArmThompson(context: BanditContext): BanditDecision {
    const arms = Array.from(this.arms.values());
    let bestArm: BanditArm | null = null;
    let bestSample = -Infinity;

    for (const arm of arms) {
      if (arm.stats.pulls === 0) {
        // Sample from uniform distribution for untested arms
        const sample = Math.random();
        if (sample > bestSample) {
          bestSample = sample;
          bestArm = arm;
        }
      } else {
        // Sample from Beta distribution approximation
        const sample = this.sampleFromBeta(arm);
        if (sample > bestSample) {
          bestSample = sample;
          bestArm = arm;
        }
      }
    }

    if (!bestArm) {
      throw new Error('No valid arm found for Thompson sampling');
    }

    return {
      armId: bestArm.id,
      estimatedReward: bestSample,
      strategy: 'thompson',
      confidence: bestArm.stats.confidence,
      explorationFactor: this.config.explorationFactor
    };
  }

  /**
   * Epsilon-Greedy arm selection
   */
  private selectArmEpsilonGreedy(context: BanditContext): BanditDecision {
    const epsilon = Math.pow(this.config.epsilonDecay, this.totalPulls) * this.config.explorationFactor;
    
    if (Math.random() < epsilon) {
      // Explore: select random arm
      const arms = Array.from(this.arms.values());
      const randomArm = selectRandom(arms);
      
      if (!randomArm) {
        throw new Error('No arms available for random selection');
      }
      
      return {
        armId: randomArm.id,
        estimatedReward: randomArm.stats.averageReward,
        strategy: 'epsilon_greedy',
        confidence: randomArm.stats.confidence,
        explorationFactor: epsilon
      };
    } else {
      // Exploit: select best arm
      const arms = Array.from(this.arms.values());
      if (arms.length === 0) {
        throw new Error('No arms available for exploitation');
      }
      
      const bestArm = arms.reduce((best, arm) => 
        arm.stats.averageReward > best.stats.averageReward ? arm : best
      );

      return {
        armId: bestArm.id,
        estimatedReward: bestArm.stats.averageReward,
        strategy: 'epsilon_greedy',
        confidence: bestArm.stats.confidence,
        explorationFactor: epsilon
      };
    }
  }

  /**
   * Calculate UCB value for an arm
   */
  private calculateUCB(arm: BanditArm): number {
    if (arm.stats.pulls === 0 || this.totalPulls === 0) return Infinity;

    const explorationTerm = this.config.explorationFactor * 
      Math.sqrt((2 * Math.log(this.totalPulls)) / arm.stats.pulls);
    
    return arm.stats.averageReward + explorationTerm;
  }

  /**
   * Sample from Beta distribution (approximation)
   */
  private sampleFromBeta(arm: BanditArm): number {
    // Use reward rate to approximate beta parameters
    const successes = arm.stats.totalReward;
    const failures = arm.stats.pulls - successes;
    
    // Add priors to avoid edge cases
    const alpha = successes + 1;
    const beta = failures + 1;

    // Simple beta sampling using gamma distribution approximation
    const gammaAlpha = this.sampleGamma(alpha);
    const gammaBeta = this.sampleGamma(beta);
    
    return gammaAlpha / (gammaAlpha + gammaBeta);
  }

  /**
   * Sample from Gamma distribution (simple approximation)
   */
  private sampleGamma(shape: number): number {
    // Simple gamma sampling for shape > 1
    if (shape < 1) return Math.pow(Math.random(), 1 / shape);
    
    // Use Marsaglia and Tsang method approximation
    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    
    while (true) {
      const x = this.sampleNormal();
      const v = Math.pow(1 + c * x, 3);
      
      if (v > 0) {
        const u = Math.random();
        if (u < 1 - 0.0331 * Math.pow(x, 4) || 
            Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
          return d * v;
        }
      }
    }
  }

  /**
   * Sample from standard normal distribution
   */
  private sampleNormal(): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  /**
   * Calculate confidence interval for an arm
   */
  private calculateConfidence(arm: BanditArm): number {
    if (arm.stats.pulls < 2) return 0;

    // Calculate confidence based on sample size and variance
    const sampleSize = arm.stats.pulls;
    const mean = arm.stats.averageReward;
    
    // Estimate variance from outcomes
    const armOutcomes = this.outcomes.filter(outcome => outcome.armId === arm.id);
    if (armOutcomes.length < 2) return 0;

    const variance = armOutcomes.reduce((sum, outcome) => {
      return sum + Math.pow(outcome.reward - mean, 2);
    }, 0) / (armOutcomes.length - 1);

    const standardError = Math.sqrt(variance / sampleSize);
    const tValue = 1.96; // 95% confidence level
    
    return tValue * standardError;
  }

  /**
   * Emit decision telemetry
   */
  private emitDecisionTelemetry(decision: BanditDecisionEvent): void {
    if (typeof window !== 'undefined' && window.__telemetryService) {
      const telemetryService = window.__telemetryService;
      telemetryService.emit('bandit_decision', decision);
    }
  }

  /**
   * Emit reward telemetry
   */
  private emitRewardTelemetry(reward: BanditRewardEvent): void {
    if (typeof window !== 'undefined' && window.__telemetryService) {
      const telemetryService = window.__telemetryService;
      telemetryService.emit('bandit_reward', reward);
    }
  }
}

// Export singleton instance
export const banditService = new BanditService();

// Availability check function
export const isBanditAvailable = (): boolean => {
  return banditService.isAvailable();
};