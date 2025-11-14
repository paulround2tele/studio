/**
 * Causal Graph Inference Service (Phase 10)
 * Incremental causal influence graph across metrics & cohorts
 */

// Feature flag check
const isCausalGraphEnabled = (): boolean => {
  return process.env.NEXT_PUBLIC_ENABLE_CAUSAL_GRAPH === 'true';
};

// Types for causal graph nodes and edges
export interface CausalNode {
  id: string;
  metric: string;
  type: 'metric' | 'feature' | 'external';
  lastUpdate: string;
  sampleCount: number;
  averageValue: number;
  variance: number;
}

export interface CausalEdge {
  id: string;
  from: string;
  to: string;
  confidence: number;
  strength: number;
  direction: 'positive' | 'negative';
  lagMs: number;
  lastUpdate: string;
  sampleCount: number;
  pValue: number;
}

export interface CausalGraph {
  nodes: CausalNode[];
  edges: CausalEdge[];
  version: string;
  generatedAt: string;
  lastUpdate: string;
  consolidationCount: number;
}

export interface ObservationFeatures {
  [key: string]: number | string | boolean;
}

// Telemetry events for causal graph
export interface CausalGraphUpdateEvent {
  nodes: number;
  edges: number;
  pruned: number;
  updated?: number;
}

/**
 * Causal Graph Service Class
 */
class CausalGraphService {
  private nodes = new Map<string, CausalNode>();
  private edges = new Map<string, CausalEdge>();
  private observations: Array<{
    metricKey: string;
    timestamp: string;
    value: number;
    features: ObservationFeatures;
  }> = [];
  private consolidationInterval: NodeJS.Timeout | null = null;
  private lastConsolidation = Date.now();
  private version = '1.0.0';

  constructor() {
    if (isCausalGraphEnabled()) {
      this.startConsolidationTimer();
    }
  }

  /**
   * Check if causal graph is available
   */
  isAvailable(): boolean {
    return isCausalGraphEnabled();
  }

  /**
   * Ingest a new observation
   */
  ingestObservation(metricKey: string, ts: string, value: number, features: ObservationFeatures = {}): void {
    if (!this.isAvailable()) return;

    this.observations.push({
      metricKey,
      timestamp: ts,
      value,
      features
    });

    // Update or create node
    this.updateNode(metricKey, value, ts);

    // Trigger immediate analysis if we have enough samples
    if (this.observations.length >= 300) {
      this.consolidateGraph();
    }
  }

  /**
   * Get current causal graph
   */
  getCausalGraph(): CausalGraph {
    if (!this.isAvailable()) {
      return this.getEmptyGraph();
    }

    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
      version: this.version,
      generatedAt: new Date().toISOString(),
      lastUpdate: new Date(this.lastConsolidation).toISOString(),
      consolidationCount: Math.floor((Date.now() - this.lastConsolidation) / (5 * 60 * 1000))
    };
  }

  /**
   * Prune edges below confidence threshold
   */
  pruneLowConfidence(threshold: number = 0.3): number {
    if (!this.isAvailable()) return 0;

    const initialCount = this.edges.size;
    const edgesToRemove: string[] = [];

    this.edges.forEach((edge, id) => {
      if (edge.confidence < threshold) {
        edgesToRemove.push(id);
      }
    });

    edgesToRemove.forEach(id => this.edges.delete(id));

    return initialCount - this.edges.size;
  }

  /**
   * Get nodes by confidence threshold
   */
  getNodesByConfidenceThreshold(threshold: number = 0.6): CausalNode[] {
    if (!this.isAvailable()) return [];

    return Array.from(this.nodes.values()).filter(node => {
      // Calculate node confidence based on connected edges
      const connectedEdges = Array.from(this.edges.values()).filter(
        edge => edge.from === node.id || edge.to === node.id
      );
      
      if (connectedEdges.length === 0) return false;
      
      const avgConfidence = connectedEdges.reduce((sum, edge) => sum + edge.confidence, 0) / connectedEdges.length;
      return avgConfidence >= threshold;
    });
  }

  /**
   * Get edges by confidence band
   */
  getEdgesByConfidenceBand(minConfidence: number, maxConfidence: number = 1.0): CausalEdge[] {
    if (!this.isAvailable()) return [];

    return Array.from(this.edges.values()).filter(
      edge => edge.confidence >= minConfidence && edge.confidence <= maxConfidence
    );
  }

  /**
   * Clear graph history (useful for testing)
   */
  clearHistory(): void {
    this.nodes.clear();
    this.edges.clear();
    this.observations = [];
    this.lastConsolidation = Date.now();
  }

  /**
   * Destroy service and cleanup timers
   */
  destroy(): void {
    if (this.consolidationInterval) {
      clearInterval(this.consolidationInterval);
      this.consolidationInterval = null;
    }
  }

  /**
   * Update or create a node
   */
  private updateNode(metricKey: string, value: number, timestamp: string): void {
    const existing = this.nodes.get(metricKey);
    
    if (existing) {
      // Update existing node with running statistics
      const newCount = existing.sampleCount + 1;
      const newMean = (existing.averageValue * existing.sampleCount + value) / newCount;
      const delta = value - existing.averageValue;
      const newVariance = ((existing.sampleCount - 1) * existing.variance + delta * (value - newMean)) / (newCount - 1);

      this.nodes.set(metricKey, {
        ...existing,
        sampleCount: newCount,
        averageValue: newMean,
        variance: Math.max(0, newVariance),
        lastUpdate: timestamp
      });
    } else {
      // Create new node
      this.nodes.set(metricKey, {
        id: metricKey,
        metric: metricKey,
        type: this.inferNodeType(metricKey),
        lastUpdate: timestamp,
        sampleCount: 1,
        averageValue: value,
        variance: 0
      });
    }
  }

  /**
   * Infer node type from metric key
   */
  private inferNodeType(metricKey: string): 'metric' | 'feature' | 'external' {
    if (metricKey.includes('external_') || metricKey.includes('env_')) {
      return 'external';
    }
    if (metricKey.includes('feature_') || metricKey.includes('attr_')) {
      return 'feature';
    }
    return 'metric';
  }

  /**
   * Start periodic consolidation timer
   */
  private startConsolidationTimer(): void {
    this.consolidationInterval = setInterval(() => {
      this.consolidateGraph();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Consolidate graph using lightweight Granger-like analysis
   */
  private consolidateGraph(): void {
    if (this.observations.length < 10) return;

    const _startTime = Date.now();
    let edgesUpdated = 0;
    let edgesPruned = 0;

    // Group observations by metric
    const metricObservations = new Map<string, Array<{ timestamp: string; value: number }>>();
    
    this.observations.forEach(obs => {
      if (!metricObservations.has(obs.metricKey)) {
        metricObservations.set(obs.metricKey, []);
      }
      metricObservations.get(obs.metricKey)!.push({
        timestamp: obs.timestamp,
        value: obs.value
      });
    });

    // Analyze pairwise relationships
    const metrics = Array.from(metricObservations.keys());
    for (let i = 0; i < metrics.length; i++) {
      for (let j = 0; j < metrics.length; j++) {
        if (i !== j) {
          const fromMetric = metrics[i];
          const toMetric = metrics[j];
          
          if (!fromMetric || !toMetric) continue;
          
          const edgeId = `${fromMetric}->${toMetric}`;
          
          const fromObs = metricObservations.get(fromMetric);
          const toObs = metricObservations.get(toMetric);
          
          if (!fromObs || !toObs) continue;

          const causalStrength = this.calculateCausalStrength(fromObs, toObs);

          if (causalStrength.confidence > 0.1) {
            this.edges.set(edgeId, {
              id: edgeId,
              from: fromMetric,
              to: toMetric,
              confidence: causalStrength.confidence,
              strength: causalStrength.strength,
              direction: causalStrength.direction,
              lagMs: causalStrength.lagMs,
              lastUpdate: new Date().toISOString(),
              sampleCount: causalStrength.sampleCount,
              pValue: causalStrength.pValue
            });
            edgesUpdated++;
          }
        }
      }
    }

    // Prune low confidence edges
    edgesPruned = this.pruneLowConfidence(0.15);

    this.lastConsolidation = Date.now();

    // Emit telemetry
    this.emitTelemetry({
      nodes: this.nodes.size,
      edges: this.edges.size,
      pruned: edgesPruned,
      updated: edgesUpdated
    });

    // Keep only recent observations (sliding window)
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    this.observations = this.observations.filter(obs => 
      new Date(obs.timestamp).getTime() > cutoffTime
    );
  }

  /**
   * Calculate causal strength between two time series using lightweight heuristic
   */
  private calculateCausalStrength(
    fromSeries: Array<{ timestamp: string; value: number }>,
    toSeries: Array<{ timestamp: string; value: number }>
  ): {
    confidence: number;
    strength: number;
    direction: 'positive' | 'negative';
    lagMs: number;
    sampleCount: number;
    pValue: number;
  } {
    // Simplified Granger-like causality test
    const minSamples = Math.min(fromSeries.length, toSeries.length);
    if (minSamples < 5) {
      return { confidence: 0, strength: 0, direction: 'positive', lagMs: 0, sampleCount: 0, pValue: 1 };
    }

    // Sort by timestamp
    const sortedFrom = fromSeries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const sortedTo = toSeries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Calculate correlation with various lags
    let bestCorrelation = 0;
    let bestLag = 0;
    const maxLag = Math.min(5, Math.floor(minSamples / 2));

    for (let lag = 0; lag <= maxLag; lag++) {
      const correlation = this.calculateLaggedCorrelation(sortedFrom, sortedTo, lag);
      if (Math.abs(correlation) > Math.abs(bestCorrelation)) {
        bestCorrelation = correlation;
        bestLag = lag;
      }
    }

    const confidence = Math.abs(bestCorrelation);
    const strength = confidence;
    const direction = bestCorrelation >= 0 ? 'positive' : 'negative';
    
    // Estimate p-value using approximation
    const pValue = Math.max(0.001, 1 - confidence);

    return {
      confidence,
      strength,
      direction,
      lagMs: bestLag * 60000, // Assume 1 minute per lag unit
      sampleCount: minSamples,
      pValue
    };
  }

  /**
   * Calculate lagged correlation between two series
   */
  private calculateLaggedCorrelation(
    series1: Array<{ timestamp: string; value: number }>,
    series2: Array<{ timestamp: string; value: number }>,
    lag: number
  ): number {
    if (series1.length <= lag || series2.length <= lag) return 0;

    const values1 = series1.slice(0, series1.length - lag).map(s => s.value);
    const values2 = series2.slice(lag).map(s => s.value);

    return this.correlation(values1, values2);
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private correlation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;

    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.reduce((sum, val) => sum + val, 0) / n;

    let numerator = 0;
    let sumSqX = 0;
    let sumSqY = 0;

    for (let i = 0; i < n; i++) {
      const xVal = x[i];
      const yVal = y[i];
      
      if (xVal === undefined || yVal === undefined) continue;
      
      const deltaX = xVal - meanX;
      const deltaY = yVal - meanY;
      numerator += deltaX * deltaY;
      sumSqX += deltaX * deltaX;
      sumSqY += deltaY * deltaY;
    }

    const denominator = Math.sqrt(sumSqX * sumSqY);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Get empty graph for disabled state
   */
  private getEmptyGraph(): CausalGraph {
    return {
      nodes: [],
      edges: [],
      version: this.version,
      generatedAt: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      consolidationCount: 0
    };
  }

  /**
   * Emit telemetry event
   */
  private emitTelemetry(data: CausalGraphUpdateEvent): void {
    // Integrate with existing telemetry service if available
    if (typeof window !== 'undefined' && window.__telemetryService) {
      const telemetryService = window.__telemetryService;
      telemetryService.emit('causal_graph_update', data);
    }
  }
}

// Export singleton instance
export const causalGraphService = new CausalGraphService();

// Availability check functions
export const isCausalGraphAvailable = (): boolean => {
  return causalGraphService.isAvailable();
};