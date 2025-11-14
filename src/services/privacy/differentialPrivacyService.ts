/**
 * Differential Privacy Service (Phase 10)
 * Apply differential privacy noise for shared aggregates
 */

// Feature flag check
const isDifferentialPrivacyEnabled = (): boolean => {
  return process.env.NEXT_PUBLIC_ENABLE_DIFFERENTIAL_PRIVACY === 'true';
};

// Types for differential privacy
export interface DPConfig {
  epsilon: number;
  delta: number;
  sensitivity: number;
  mechanism: 'laplace' | 'gaussian' | 'exponential';
  clampingBounds?: { min: number; max: number };
}

export interface DPResult {
  noisyValue: number;
  originalValue: number;
  epsilon: number;
  noiseAdded: number;
  mechanism: string;
  timestamp: string;
}

export interface DPDomain {
  name: string;
  epsilon: number;
  queries: number;
  lastUsed: string;
}

// Telemetry events
export interface DifferentialPrivacyNoiseEvent {
  epsilon: number;
  domain: string;
}

/**
 * Differential Privacy Service Class
 */
class DifferentialPrivacyService {
  private domainBudgets = new Map<string, DPDomain>();
  private defaultEpsilon = 1.0;
  private defaultDelta = 1e-5;

  constructor() {
    // Initialize with default domains
    this.initializeDefaultDomains();
  }

  /**
   * Check if differential privacy is available
   */
  isAvailable(): boolean {
    return isDifferentialPrivacyEnabled();
  }

  /**
   * Add Laplace noise to a value
   */
  addLaplaceNoise(value: number, epsilon: number = this.defaultEpsilon): DPResult {
    if (!this.isAvailable()) {
      return this.createNoNoiseResult(value, epsilon, 'disabled');
    }

    const sensitivity = 1.0; // Default sensitivity
    const scale = sensitivity / epsilon;
    const noise = this.sampleLaplace(scale);
    const noisyValue = value + noise;

    const result: DPResult = {
      noisyValue,
      originalValue: value,
      epsilon,
      noiseAdded: noise,
      mechanism: 'laplace',
      timestamp: new Date().toISOString()
    };

    this.emitNoiseEvent({
      epsilon,
      domain: 'default'
    });

    return result;
  }

  /**
   * Add Gaussian noise to a value
   */
  addGaussianNoise(
    value: number, 
    epsilon: number = this.defaultEpsilon, 
    delta: number = this.defaultDelta
  ): DPResult {
    if (!this.isAvailable()) {
      return this.createNoNoiseResult(value, epsilon, 'disabled');
    }

    const sensitivity = 1.0;
    const sigma = this.calculateGaussianSigma(sensitivity, epsilon, delta);
    const noise = this.sampleGaussian(0, sigma);
    const noisyValue = value + noise;

    const result: DPResult = {
      noisyValue,
      originalValue: value,
      epsilon,
      noiseAdded: noise,
      mechanism: 'gaussian',
      timestamp: new Date().toISOString()
    };

    this.emitNoiseEvent({
      epsilon,
      domain: 'default'
    });

    return result;
  }

  /**
   * Apply differential privacy with clamping
   */
  applyDPWithClamping(
    value: number,
    config: DPConfig,
    domain: string = 'default'
  ): DPResult {
    if (!this.isAvailable()) {
      return this.createNoNoiseResult(value, config.epsilon, 'disabled');
    }

    // Check domain budget
    if (!this.canUseEpsilon(domain, config.epsilon)) {
      throw new Error(`Insufficient privacy budget for domain ${domain}`);
    }

    let clampedValue = value;
    
    // Apply clamping if bounds are specified
    if (config.clampingBounds) {
      clampedValue = Math.max(
        config.clampingBounds.min,
        Math.min(config.clampingBounds.max, value)
      );
    }

    let result: DPResult;

    switch (config.mechanism) {
      case 'laplace':
        result = this.addLaplaceNoiseWithSensitivity(clampedValue, config.epsilon, config.sensitivity);
        break;
      case 'gaussian':
        result = this.addGaussianNoiseWithSensitivity(clampedValue, config.epsilon, config.sensitivity, config.delta);
        break;
      case 'exponential':
        result = this.addExponentialNoise(clampedValue, config.epsilon, config.sensitivity);
        break;
      default:
        result = this.addLaplaceNoiseWithSensitivity(clampedValue, config.epsilon, config.sensitivity);
    }

    // Update domain budget
    this.updateDomainBudget(domain, config.epsilon);

    this.emitNoiseEvent({
      epsilon: config.epsilon,
      domain
    });

    return result;
  }

  /**
   * Apply noise to an array of values
   */
  applyDPToArray(
    values: number[],
    config: DPConfig,
    domain: string = 'default'
  ): DPResult[] {
    return values.map(value => this.applyDPWithClamping(value, config, domain));
  }

  /**
   * Apply noise to aggregate statistics
   */
  applyDPToAggregates(
    aggregates: { count: number; sum: number; avg: number },
    epsilon: number = this.defaultEpsilon,
    _domain: string = 'aggregates'
  ): {
    count: DPResult;
    sum: DPResult;
    avg: DPResult;
  } {
    if (!this.isAvailable()) {
      return {
        count: this.createNoNoiseResult(aggregates.count, epsilon, 'disabled'),
        sum: this.createNoNoiseResult(aggregates.sum, epsilon, 'disabled'),
        avg: this.createNoNoiseResult(aggregates.avg, epsilon, 'disabled')
      };
    }

    // Split epsilon budget across the three queries
    const epsilonPerQuery = epsilon / 3;

    return {
      count: this.addLaplaceNoise(aggregates.count, epsilonPerQuery),
      sum: this.addLaplaceNoise(aggregates.sum, epsilonPerQuery),
      avg: this.addLaplaceNoise(aggregates.avg, epsilonPerQuery)
    };
  }

  /**
   * Check if domain can use epsilon budget
   */
  canUseEpsilon(domain: string, epsilon: number): boolean {
    if (!this.isAvailable()) return true;

    const domainBudget = this.domainBudgets.get(domain);
    if (!domainBudget) {
      // Create new domain with default budget
      this.domainBudgets.set(domain, {
        name: domain,
        epsilon: 10.0, // Default budget
        queries: 0,
        lastUsed: new Date().toISOString()
      });
      return true;
    }

    return domainBudget.epsilon >= epsilon;
  }

  /**
   * Update domain budget
   */
  updateDomainBudget(domain: string, epsilonUsed: number): void {
    const domainBudget = this.domainBudgets.get(domain);
    if (domainBudget) {
      domainBudget.epsilon -= epsilonUsed;
      domainBudget.queries += 1;
      domainBudget.lastUsed = new Date().toISOString();
      this.domainBudgets.set(domain, domainBudget);
    }
  }

  /**
   * Get domain budget status
   */
  getDomainBudget(domain: string): DPDomain | null {
    return this.domainBudgets.get(domain) || null;
  }

  /**
   * Get all domain budgets
   */
  getAllDomainBudgets(): DPDomain[] {
    return Array.from(this.domainBudgets.values());
  }

  /**
   * Reset domain budget
   */
  resetDomainBudget(domain: string, newBudget: number = 10.0): void {
    const existing = this.domainBudgets.get(domain);
    this.domainBudgets.set(domain, {
      name: domain,
      epsilon: newBudget,
      queries: 0,
      lastUsed: existing?.lastUsed || new Date().toISOString()
    });
  }

  /**
   * Create default configuration
   */
  createDefaultConfig(epsilon?: number): DPConfig {
    return {
      epsilon: epsilon || this.defaultEpsilon,
      delta: this.defaultDelta,
      sensitivity: 1.0,
      mechanism: 'laplace'
    };
  }

  /**
   * Sample from Laplace distribution
   */
  private sampleLaplace(scale: number): number {
    const u = Math.random() - 0.5;
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }

  /**
   * Sample from Gaussian distribution
   */
  private sampleGaussian(mean: number = 0, stdDev: number = 1): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + stdDev * z0;
  }

  /**
   * Calculate Gaussian sigma for (epsilon, delta)-DP
   */
  private calculateGaussianSigma(sensitivity: number, epsilon: number, delta: number): number {
    return sensitivity * Math.sqrt(2 * Math.log(1.25 / delta)) / epsilon;
  }

  /**
   * Add Laplace noise with custom sensitivity
   */
  private addLaplaceNoiseWithSensitivity(
    value: number,
    epsilon: number,
    sensitivity: number
  ): DPResult {
    const scale = sensitivity / epsilon;
    const noise = this.sampleLaplace(scale);
    const noisyValue = value + noise;

    return {
      noisyValue,
      originalValue: value,
      epsilon,
      noiseAdded: noise,
      mechanism: 'laplace',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Add Gaussian noise with custom sensitivity
   */
  private addGaussianNoiseWithSensitivity(
    value: number,
    epsilon: number,
    sensitivity: number,
    delta: number = this.defaultDelta
  ): DPResult {
    const sigma = this.calculateGaussianSigma(sensitivity, epsilon, delta);
    const noise = this.sampleGaussian(0, sigma);
    const noisyValue = value + noise;

    return {
      noisyValue,
      originalValue: value,
      epsilon,
      noiseAdded: noise,
      mechanism: 'gaussian',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Add exponential mechanism noise (for discrete values)
   */
  private addExponentialNoise(
    value: number,
    epsilon: number,
    sensitivity: number
  ): DPResult {
    // Simplified exponential mechanism - just adds geometric noise
    const p = 1 - Math.exp(-epsilon / sensitivity);
    const sign = Math.random() < 0.5 ? -1 : 1;
    const noise = sign * Math.floor(Math.log(Math.random()) / Math.log(1 - p));
    const noisyValue = value + noise;

    return {
      noisyValue,
      originalValue: value,
      epsilon,
      noiseAdded: noise,
      mechanism: 'exponential',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create result with no noise (when DP is disabled)
   */
  private createNoNoiseResult(value: number, epsilon: number, mechanism: string): DPResult {
    return {
      noisyValue: value,
      originalValue: value,
      epsilon,
      noiseAdded: 0,
      mechanism,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Initialize default domains
   */
  private initializeDefaultDomains(): void {
    const defaultDomains = [
      { name: 'default', epsilon: 10.0 },
      { name: 'aggregates', epsilon: 5.0 },
      { name: 'metrics', epsilon: 8.0 },
      { name: 'cohorts', epsilon: 3.0 },
      { name: 'recommendations', epsilon: 2.0 }
    ];

    defaultDomains.forEach(domain => {
      this.domainBudgets.set(domain.name, {
        name: domain.name,
        epsilon: domain.epsilon,
        queries: 0,
        lastUsed: new Date().toISOString()
      });
    });
  }

  /**
   * Emit noise telemetry
   */
  private emitNoiseEvent(data: DifferentialPrivacyNoiseEvent): void {
    if (typeof window !== 'undefined' && window.__telemetryService) {
      const telemetryService = window.__telemetryService;
      telemetryService.emit('differential_privacy_noise', data);
    }
  }
}

// Export singleton instance
export const differentialPrivacyService = new DifferentialPrivacyService();

// Availability check function
export const isDifferentialPrivacyAvailable = (): boolean => {
  return differentialPrivacyService.isAvailable();
};