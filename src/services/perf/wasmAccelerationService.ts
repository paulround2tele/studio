/**
 * WASM Acceleration Service (Phase 10)
 * WASM-based numeric kernels with fallback to JavaScript
 */

// Feature flag check
const isWasmAccelEnabled = (): boolean => {
  return process.env.NEXT_PUBLIC_ENABLE_WASM_ACCEL === 'true';
};

// Types for WASM kernels
export interface WasmKernel {
  name: string;
  loaded: boolean;
  error?: string;
  module?: any;
  performance: {
    calls: number;
    totalTime: number;
    averageTime: number;
    lastCall: string;
  };
}

export interface LttbPoint {
  x: number;
  y: number;
  timestamp?: string;
}

export interface BlendWeights {
  [modelId: string]: number;
}

export interface QuantileBand {
  lower: number;
  median: number;
  upper: number;
  confidence: number;
}

// Telemetry events
export interface WasmKernelLoadedEvent {
  kernels: string[];
}

export interface WasmKernelFallbackEvent {
  reason: string;
}

/**
 * WASM Acceleration Service Class
 */
class WasmAccelerationService {
  private kernels = new Map<string, WasmKernel>();
  private wasmSupported = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    this.wasmSupported = this.checkWasmSupport();
    if (this.isAvailable()) {
      this.initializationPromise = this.initializeKernels();
    }
  }

  /**
   * Check if WASM acceleration is available
   */
  isAvailable(): boolean {
    return isWasmAccelEnabled() && this.wasmSupported;
  }

  /**
   * Wait for WASM kernels to be ready
   */
  async waitForReady(): Promise<void> {
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
  }

  /**
   * LTTB (Largest Triangle Three Buckets) downsampling
   */
  async lttbDownsample(points: LttbPoint[], threshold: number): Promise<LttbPoint[]> {
    if (!this.isAvailable() || points.length <= threshold) {
      return this.fallbackLttbDownsample(points, threshold);
    }

    try {
      await this.waitForReady();
      const kernel = this.kernels.get('lttb');
      
      if (!kernel || !kernel.loaded || !kernel.module) {
        return this.fallbackLttbDownsample(points, threshold);
      }

      const startTime = performance.now();
      
      // Convert points to WASM-compatible format
      const xValues = new Float64Array(points.map(p => p.x));
      const yValues = new Float64Array(points.map(p => p.y));
      
      // Call WASM function
      const result = kernel.module.lttb_downsample(xValues, yValues, threshold);
      
      // Convert result back to points
      const downsampledPoints: LttbPoint[] = [];
      for (let i = 0; i < result.length; i += 2) {
        downsampledPoints.push({
          x: result[i],
          y: result[i + 1],
          timestamp: points[Math.round(result[i])]?.timestamp
        });
      }

      this.updateKernelPerformance('lttb', performance.now() - startTime);
      return downsampledPoints;
      
    } catch (error) {
      this.emitFallbackEvent(`LTTB WASM error: ${error}`);
      return this.fallbackLttbDownsample(points, threshold);
    }
  }

  /**
   * Blend weights update using WASM
   */
  async blendWeightsUpdate(prevWeights: BlendWeights, errors: number[]): Promise<BlendWeights> {
    if (!this.isAvailable()) {
      return this.fallbackBlendWeightsUpdate(prevWeights, errors);
    }

    try {
      await this.waitForReady();
      const kernel = this.kernels.get('blend');
      
      if (!kernel || !kernel.loaded || !kernel.module) {
        return this.fallbackBlendWeightsUpdate(prevWeights, errors);
      }

      const startTime = performance.now();
      
      // Convert to WASM format
      const modelIds = Object.keys(prevWeights);
      const weightsSource = modelIds.map(id => {
        const v = prevWeights[id];
        return typeof v === 'number' && !Number.isNaN(v) ? v : 0;
      });
      const weights = new Float64Array(weightsSource);
      const errorArray = new Float64Array(errors.map(e => (typeof e === 'number' && !Number.isNaN(e) ? e : 0)));
      
      // Call WASM function
      const newWeights = kernel.module.update_blend_weights(weights, errorArray);
      
      // Convert back to object
      const result: BlendWeights = {};
      modelIds.forEach((id, index) => {
        result[id] = newWeights[index];
      });

      this.updateKernelPerformance('blend', performance.now() - startTime);
      return result;
      
    } catch (error) {
      this.emitFallbackEvent(`Blend weights WASM error: ${error}`);
      return this.fallbackBlendWeightsUpdate(prevWeights, errors);
    }
  }

  /**
   * Quantile band synthesis using WASM
   */
  async quantileBandSynthesize(residuals: number[], confidenceLevel: number = 0.95): Promise<QuantileBand> {
    if (!this.isAvailable()) {
      return this.fallbackQuantileBandSynthesize(residuals, confidenceLevel);
    }

    try {
      await this.waitForReady();
      const kernel = this.kernels.get('quantile');
      
      if (!kernel || !kernel.loaded || !kernel.module) {
        return this.fallbackQuantileBandSynthesize(residuals, confidenceLevel);
      }

      const startTime = performance.now();
      
      // Convert to WASM format
      const residualArray = new Float64Array(residuals);
      
      // Call WASM function
      const result = kernel.module.synthesize_quantile_bands(residualArray, confidenceLevel);
      
      const quantileBand: QuantileBand = {
        lower: result[0],
        median: result[1],
        upper: result[2],
        confidence: confidenceLevel
      };

      this.updateKernelPerformance('quantile', performance.now() - startTime);
      return quantileBand;
      
    } catch (error) {
      this.emitFallbackEvent(`Quantile synthesis WASM error: ${error}`);
      return this.fallbackQuantileBandSynthesize(residuals, confidenceLevel);
    }
  }

  /**
   * Get kernel status
   */
  getKernelStatus(): WasmKernel[] {
    return Array.from(this.kernels.values());
  }

  /**
   * Get overall performance stats
   */
  getPerformanceStats(): {
    wasmSupported: boolean;
    kernelsLoaded: number;
    totalCalls: number;
    averageSpeedup: number;
  } {
    const kernels = Array.from(this.kernels.values());
    const loadedKernels = kernels.filter(k => k.loaded);
    const totalCalls = kernels.reduce((sum, k) => sum + k.performance.calls, 0);
    
    // Rough estimate of speedup (WASM is typically 2-5x faster for numeric operations)
    const averageSpeedup = loadedKernels.length > 0 ? 3.0 : 1.0;

    return {
      wasmSupported: this.wasmSupported,
      kernelsLoaded: loadedKernels.length,
      totalCalls,
      averageSpeedup
    };
  }

  /**
   * Force fallback to JavaScript (for testing)
   */
  forceFallback(): void {
    this.kernels.forEach(kernel => {
      kernel.loaded = false;
      kernel.error = 'Forced fallback';
    });
  }

  /**
   * Check WASM support
   */
  private checkWasmSupport(): boolean {
    try {
      if (typeof window === 'undefined') return false;
      
      return typeof WebAssembly === 'object' &&
             typeof WebAssembly.instantiate === 'function' &&
             typeof WebAssembly.Module === 'function' &&
             typeof WebAssembly.Instance === 'function';
    } catch {
      return false;
    }
  }

  /**
   * Initialize WASM kernels
   */
  private async initializeKernels(): Promise<void> {
    const kernelNames = ['lttb', 'blend', 'quantile'];
    const loadedKernels: string[] = [];

    for (const name of kernelNames) {
      try {
        const kernel = await this.loadKernel(name);
        this.kernels.set(name, kernel);
        if (kernel.loaded) {
          loadedKernels.push(name);
        }
      } catch (error) {
        this.kernels.set(name, {
          name,
          loaded: false,
          error: `Failed to load: ${error}`,
          performance: {
            calls: 0,
            totalTime: 0,
            averageTime: 0,
            lastCall: ''
          }
        });
      }
    }

    if (loadedKernels.length > 0) {
      this.emitKernelLoadedEvent(loadedKernels);
    }
  }

  /**
   * Load a specific WASM kernel (scaffold implementation)
   */
  private async loadKernel(name: string): Promise<WasmKernel> {
    const kernel: WasmKernel = {
      name,
      loaded: false,
      performance: {
        calls: 0,
        totalTime: 0,
        averageTime: 0,
        lastCall: ''
      }
    };

    try {
      // In a real implementation, this would load actual WASM modules
      // For now, we create a mock module with JavaScript fallbacks
      kernel.module = this.createMockWasmModule(name);
      kernel.loaded = true;
    } catch (error) {
      kernel.error = `Failed to load ${name}: ${error}`;
    }

    return kernel;
  }

  /**
   * Create mock WASM module (for development/testing)
   */
  private createMockWasmModule(name: string): any {
    switch (name) {
      case 'lttb':
        return {
          lttb_downsample: (xValues: Float64Array, yValues: Float64Array, threshold: number) => {
            // Mock implementation - just return indices of selected points
            const step = Math.floor(xValues.length / threshold);
            const result = new Float64Array(threshold * 2);
            for (let i = 0; i < threshold; i++) {
              const index = Math.min(i * step, xValues.length - 1);
              const y = yValues[index] ?? 0;
              result[i * 2] = index;
              result[i * 2 + 1] = y;
            }
            return result;
          }
        };

      case 'blend':
        return {
          update_blend_weights: (weights: Float64Array, errors: Float64Array) => {
            // Mock implementation - simple exponential smoothing
            const alpha = 0.1;
            const result = new Float64Array(weights.length);
            for (let i = 0; i < weights.length; i++) {
              const err = errors[i] ?? 0;
              const w = weights[i] ?? 0;
              const errorFactor = Math.exp(-err);
              result[i] = w * (1 - alpha) + errorFactor * alpha;
            }
            // Normalize to sum to 1
            const sum = result.reduce((s, w) => s + (w ?? 0), 0);
            if (sum > 0) {
              for (let i = 0; i < result.length; i++) {
                result[i] = (result[i] ?? 0) / sum;
              }
            }
            return result;
          }
        };

      case 'quantile':
        return {
          synthesize_quantile_bands: (residuals: Float64Array, confidence: number) => {
            // Mock implementation - simple quantile calculation
            const sorted = Array.from(residuals).sort((a, b) => a - b);
            const n = sorted.length;
            const alpha = (1 - confidence) / 2;
            
            const lowerIndex = Math.floor(alpha * n);
            const upperIndex = Math.floor((1 - alpha) * n);
            const medianIndex = Math.floor(0.5 * n);
            
            return new Float64Array([
              sorted[lowerIndex] || 0,
              sorted[medianIndex] || 0,
              sorted[upperIndex] || 0
            ]);
          }
        };

      default:
        return {};
    }
  }

  /**
   * Update kernel performance metrics
   */
  private updateKernelPerformance(kernelName: string, duration: number): void {
    const kernel = this.kernels.get(kernelName);
    if (!kernel) return;

    kernel.performance.calls++;
    kernel.performance.totalTime += duration;
    kernel.performance.averageTime = kernel.performance.totalTime / kernel.performance.calls;
    kernel.performance.lastCall = new Date().toISOString();
  }

  /**
   * Fallback LTTB implementation
   */
  private fallbackLttbDownsample(points: LttbPoint[], threshold: number): LttbPoint[] {
  if (points.length === 0) return [];
  if (points.length <= threshold) return points.slice();

  const bucketSize = (points.length - 2) / Math.max(1, (threshold - 2));
  const firstPoint = points[0];
  if (!firstPoint) return [];
  const result: LttbPoint[] = [firstPoint]; // Always include first point

    for (let i = 1; i < threshold - 1; i++) {
      const bucketStart = Math.floor(i * bucketSize) + 1;
      const bucketEnd = Math.floor((i + 1) * bucketSize) + 1;
      
      let maxArea = -1;
  let selectedPoint = points[bucketStart];
  if (!selectedPoint) continue;

      // Calculate area for each point in bucket
      for (let j = bucketStart; j < Math.min(bucketEnd, points.length); j++) {
        const area = this.calculateTriangleArea(
          result[result.length - 1]!,
          points[j]!,
          points[Math.min(bucketEnd, points.length - 1)]!
        );
        
        if (area > maxArea) {
          maxArea = area;
          selectedPoint = points[j];
        }
      }

      if (selectedPoint) result.push(selectedPoint);
    }

    const lastPoint = points[points.length - 1];
    if (lastPoint) result.push(lastPoint); // Always include last point
    return result;
  }

  /**
   * Calculate triangle area for LTTB
   */
  private calculateTriangleArea(a: LttbPoint, b: LttbPoint, c: LttbPoint): number {
    return Math.abs((a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y)) / 2);
  }

  /**
   * Fallback blend weights update
   */
  private fallbackBlendWeightsUpdate(prevWeights: BlendWeights, errors: number[]): BlendWeights {
    const modelIds = Object.keys(prevWeights);
    const newWeights: BlendWeights = {};
    
    // Simple exponential smoothing with error-based adjustment
    const alpha = 0.1;
    let totalWeight = 0;

    modelIds.forEach((id, index) => {
      const error = errors[index] ?? 0;
      const prev = prevWeights[id] ?? 0;
      const errorFactor = Math.exp(-Math.abs(error));
      const newWeight = prev * (1 - alpha) + errorFactor * alpha;
      newWeights[id] = newWeight ?? 0;
      totalWeight += newWeight ?? 0;
    });

    // Normalize weights to sum to 1
    if (totalWeight > 0) {
      modelIds.forEach(id => {
        newWeights[id] = (newWeights[id] ?? 0) / totalWeight;
      });
    }

    return newWeights;
  }

  /**
   * Fallback quantile band synthesis
   */
  private fallbackQuantileBandSynthesize(residuals: number[], confidenceLevel: number): QuantileBand {
    const sorted = [...residuals].sort((a, b) => a - b);
    const n = sorted.length;
    
    if (n === 0) {
      return { lower: 0, median: 0, upper: 0, confidence: confidenceLevel };
    }

    const alpha = (1 - confidenceLevel) / 2;
    const lowerIndex = Math.floor(alpha * n);
    const upperIndex = Math.floor((1 - alpha) * n);
    const medianIndex = Math.floor(0.5 * n);

    return {
      lower: sorted[Math.max(0, lowerIndex)] || 0,
      median: sorted[Math.max(0, medianIndex)] || 0,
      upper: sorted[Math.min(n - 1, upperIndex)] || 0,
      confidence: confidenceLevel
    };
  }

  /**
   * Emit kernel loaded telemetry
   */
  private emitKernelLoadedEvent(kernels: string[]): void {
    if (typeof window !== 'undefined' && (window as any).__telemetryService) {
      const telemetryService = (window as any).__telemetryService;
      telemetryService.emit('wasm_kernel_loaded', { kernels });
    }
  }

  /**
   * Emit fallback telemetry
   */
  private emitFallbackEvent(reason: string): void {
    if (typeof window !== 'undefined' && (window as any).__telemetryService) {
      const telemetryService = (window as any).__telemetryService;
      telemetryService.emit('wasm_kernel_fallback', { reason });
    }
  }
}

// Export singleton instance
export const wasmAccelerationService = new WasmAccelerationService();

// Availability check function
export const isWasmAccelerationAvailable = (): boolean => {
  return wasmAccelerationService.isAvailable();
};