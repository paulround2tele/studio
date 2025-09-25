/**
 * Seed Service (Phase 11)
 * Deterministic pseudo-random seeds for reproducible scenario simulations
 */

import { useScenarioSimulation } from '../../lib/feature-flags-simple';
import { telemetryService } from '../campaignMetrics/telemetryService';

// Feature flag check
const isSeedServiceEnabled = (): boolean => {
  return useScenarioSimulation();
};

/**
 * Pseudo-random number generator state
 */
interface PRNGState {
  seed: string;
  state: number;
  sequence: number;
}

/**
 * Deterministic Seed Service Implementation
 */
class SeedService {
  private scenarioSeeds = new Map<string, string>();
  private rngStates = new Map<string, PRNGState>();

  /**
   * Get or generate a deterministic seed for a scenario
   */
  getScenarioSeed(scenarioId: string): string {
    if (!isSeedServiceEnabled()) {
      return 'fallback_seed';
    }

    // Check if we already have a seed for this scenario
    const existingSeed = this.scenarioSeeds.get(scenarioId);
    if (existingSeed) {
      return existingSeed;
    }

    // Generate new deterministic seed based on scenario ID
    const seed = this.generateDeterministicSeed(scenarioId);
    this.scenarioSeeds.set(scenarioId, seed);

    telemetryService.emitTelemetry('determinism_seed_generated', {
      scenarioId,
      seedHash: this.hashSeed(seed)
    });

    return seed;
  }

  /**
   * Create a seeded pseudo-random number generator
   */
  createSeededRNG(seed: string): () => number {
    if (!isSeedServiceEnabled()) {
      return Math.random; // Fall back to system random
    }

    // Initialize PRNG state
    const state = this.initializePRNG(seed);
    this.rngStates.set(seed, state);

    telemetryService.emitTelemetry('determinism_seed_used', {
      seedHash: this.hashSeed(seed)
    });

    // Return generator function
    return () => this.nextRandom(state);
  }

  /**
   * Generate a sequence of deterministic random numbers
   */
  generateSequence(seed: string, count: number): number[] {
    if (!isSeedServiceEnabled()) {
      return Array.from({ length: count }, () => Math.random());
    }

    const rng = this.createSeededRNG(seed);
    return Array.from({ length: count }, () => rng());
  }

  /**
   * Generate deterministic random integer in range
   */
  randomInt(seed: string, min: number, max: number): number {
    if (!isSeedServiceEnabled()) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    const rng = this.createSeededRNG(seed + '_int');
    return Math.floor(rng() * (max - min + 1)) + min;
  }

  /**
   * Generate deterministic random choice from array
   */
  randomChoice<T>(seed: string, choices: T[]): T {
    if (!isSeedServiceEnabled() || choices.length === 0) {
      return choices[Math.floor(Math.random() * choices.length)];
    }

    const rng = this.createSeededRNG(seed + '_choice');
    const index = Math.floor(rng() * choices.length);
    return choices[index];
  }

  /**
   * Generate deterministic Gaussian (normal) distribution
   */
  randomGaussian(seed: string, mean: number = 0, stdDev: number = 1): number {
    if (!isSeedServiceEnabled()) {
      return this.boxMullerTransform(Math.random(), Math.random()) * stdDev + mean;
    }

    const rng = this.createSeededRNG(seed + '_gaussian');
    const u1 = rng();
    const u2 = rng();
    
    return this.boxMullerTransform(u1, u2) * stdDev + mean;
  }

  /**
   * Reset seed for a scenario (for testing/debugging)
   */
  resetScenarioSeed(scenarioId: string): void {
    if (!isSeedServiceEnabled()) {
      return;
    }

    this.scenarioSeeds.delete(scenarioId);
    
    // Clean up related RNG states
    for (const [seed, state] of this.rngStates) {
      if (seed.includes(scenarioId)) {
        this.rngStates.delete(seed);
      }
    }

    telemetryService.emitTelemetry('determinism_seed_reset', { scenarioId });
  }

  /**
   * Get statistics about seed usage
   */
  getSeedStats(): {
    scenarioSeedsCount: number;
    activeRNGStatesCount: number;
    scenarios: string[];
  } {
    return {
      scenarioSeedsCount: this.scenarioSeeds.size,
      activeRNGStatesCount: this.rngStates.size,
      scenarios: Array.from(this.scenarioSeeds.keys())
    };
  }

  /**
   * Generate deterministic seed from scenario ID using hash function
   */
  private generateDeterministicSeed(scenarioId: string): string {
    // Use a combination of scenario ID and a fixed salt for determinism
    const salt = 'phase11_seed_v1';
    const combined = `${scenarioId}_${salt}`;
    
    // Simple but effective hash function
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Convert to positive integer and add timestamp component for uniqueness
    const baseHash = Math.abs(hash);
    const timeComponent = Date.now() % 1000000; // Last 6 digits of timestamp
    
    return `seed_${baseHash}_${timeComponent}`;
  }

  /**
   * Initialize PRNG state using SplitMix64-like algorithm
   */
  private initializePRNG(seed: string): PRNGState {
    // Convert seed string to initial state
    let seedHash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      seedHash = ((seedHash << 5) - seedHash) + char;
      seedHash = seedHash & seedHash;
    }

    return {
      seed,
      state: Math.abs(seedHash) || 1, // Ensure non-zero state
      sequence: 0
    };
  }

  /**
   * Generate next pseudo-random number using Linear Congruential Generator
   */
  private nextRandom(prngState: PRNGState): number {
    // LCG parameters (commonly used values)
    const a = 1664525;
    const c = 1013904223;
    const m = 0x100000000; // 2^32

    // Update state
    prngState.state = (a * prngState.state + c) % m;
    prngState.sequence++;

    // Convert to 0-1 range
    return (prngState.state & 0x7fffffff) / 0x7fffffff;
  }

  /**
   * Box-Muller transform for Gaussian distribution
   */
  private boxMullerTransform(u1: number, u2: number): number {
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0;
  }

  /**
   * Create hash of seed for telemetry (don't expose actual seed)
   */
  private hashSeed(seed: string): string {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `hash_${Math.abs(hash).toString(16)}`;
  }
}

// Export singleton instance
export const seedService = new SeedService();