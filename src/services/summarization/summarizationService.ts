/**
 * Semantic Summarization Service (Phase 10)
 * Lightweight on-device or edge model summarization with graceful fallback
 */

// Feature flag check
const isSemanticSummaryEnabled = (): boolean => {
  return process.env.NEXT_PUBLIC_ENABLE_SEMANTIC_SUMMARY === 'true';
};

// Types for summarization
export interface AnomalyCluster {
  id: string;
  anomalies: Array<{
    metric: string;
    value: number;
    expected: number;
    severity: 'low' | 'medium' | 'high';
    timestamp: string;
  }>;
  timeRange: { start: string; end: string };
  affectedDomains: string[];
  category: string;
}

export interface CausalGraphDelta {
  previousGraph: {
    nodes: number;
    edges: number;
    version: string;
  };
  currentGraph: {
    nodes: number;
    edges: number;
    version: string;
  };
  changes: {
    nodesAdded: number;
    nodesRemoved: number;
    edgesAdded: number;
    edgesRemoved: number;
    confidenceChanges: number;
  };
  timestamp: string;
}

export interface SummaryResult {
  summary: string;
  confidence: number;
  method: 'local_model' | 'remote_endpoint' | 'template_fallback';
  tokensApprox: number;
  generatedAt: string;
  metadata: {
    processingTime: number;
    fallbackReason?: string;
    modelVersion?: string;
  };
}

// Telemetry events
export interface SemanticSummaryGeneratedEvent {
  type: 'anomaly_cluster' | 'causal_delta';
  method: 'local_model' | 'remote_endpoint' | 'template_fallback';
  tokensApprox: number;
}

/**
 * Summarization Service Class
 */
class SummarizationService {
  private worker: Worker | null = null;
  private workerReady = false;
  private modelLoaded = false;
  private remoteEndpoint: string | null = null;

  constructor() {
    if (this.isAvailable()) {
      this.initialize();
    }
  }

  /**
   * Check if semantic summarization is available
   */
  isAvailable(): boolean {
    return isSemanticSummaryEnabled();
  }

  /**
   * Summarize an anomaly cluster
   */
  async summarizeAnomalyCluster(cluster: AnomalyCluster): Promise<SummaryResult> {
    if (!this.isAvailable()) {
      return this.getDisabledSummary();
    }

    const startTime = performance.now();

    try {
      // Try local model first
      if (this.workerReady && this.modelLoaded) {
        return await this.summarizeWithLocalModel(cluster, 'anomaly_cluster');
      }

      // Try remote endpoint
      if (this.remoteEndpoint) {
        return await this.summarizeWithRemoteEndpoint(cluster, 'anomaly_cluster');
      }

      // Fall back to template
      return this.summarizeWithTemplate(cluster, startTime);

    } catch (error) {
      return this.summarizeWithTemplate(cluster, startTime, `Error: ${error}`);
    }
  }

  /**
   * Summarize causal graph changes
   */
  async summarizeCausalDelta(delta: CausalGraphDelta): Promise<SummaryResult> {
    if (!this.isAvailable()) {
      return this.getDisabledSummary();
    }

    const startTime = performance.now();

    try {
      // Try local model first
      if (this.workerReady && this.modelLoaded) {
        return await this.summarizeWithLocalModel(delta, 'causal_delta');
      }

      // Try remote endpoint
      if (this.remoteEndpoint) {
        return await this.summarizeWithRemoteEndpoint(delta, 'causal_delta');
      }

      // Fall back to template
      return this.summarizeCausalDeltaWithTemplate(delta, startTime);

    } catch (error) {
      return this.summarizeCausalDeltaWithTemplate(delta, startTime, `Error: ${error}`);
    }
  }

  /**
   * Get summarization capabilities
   */
  getCapabilities(): {
    available: boolean;
    localModel: boolean;
    remoteEndpoint: boolean;
    workerReady: boolean;
    modelLoaded: boolean;
  } {
    return {
      available: this.isAvailable(),
      localModel: this.modelLoaded,
      remoteEndpoint: !!this.remoteEndpoint,
      workerReady: this.workerReady,
      modelLoaded: this.modelLoaded
    };
  }

  /**
   * Update remote endpoint configuration
   */
  setRemoteEndpoint(endpoint: string): void {
    this.remoteEndpoint = endpoint;
  }

  /**
   * Clear remote endpoint
   */
  clearRemoteEndpoint(): void {
    this.remoteEndpoint = null;
  }

  /**
   * Destroy service and cleanup
   */
  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.workerReady = false;
      this.modelLoaded = false;
    }
  }

  /**
   * Initialize the service
   */
  private async initialize(): void {
    try {
      // Try to initialize web worker for local model
      await this.initializeWorker();
    } catch (error) {
      console.warn('Failed to initialize summarization worker:', error);
    }

    // Set default remote endpoint if available
    const endpoint = process.env.NEXT_PUBLIC_SUMMARIZATION_ENDPOINT;
    if (endpoint) {
      this.remoteEndpoint = endpoint;
    }
  }

  /**
   * Initialize web worker
   */
  private async initializeWorker(): Promise<void> {
    if (typeof window === 'undefined' || !window.Worker) {
      throw new Error('Web Workers not supported');
    }

    try {
      // Create worker with inline script for now (in production, this would load a separate worker file)
      const workerScript = this.createWorkerScript();
      const blob = new Blob([workerScript], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      
      this.worker = new Worker(workerUrl);
      
      this.worker.onmessage = (event) => {
        const { type, success, data } = event.data;
        
        if (type === 'init') {
          this.workerReady = success;
          if (success) {
            this.loadModel();
          }
        } else if (type === 'model_loaded') {
          this.modelLoaded = success;
        }
      };

      this.worker.onerror = (error) => {
        console.error('Summarization worker error:', error);
        this.workerReady = false;
        this.modelLoaded = false;
      };

      // Initialize worker
      this.worker.postMessage({ type: 'init' });

    } catch (error) {
      throw new Error(`Failed to create worker: ${error}`);
    }
  }

  /**
   * Load model in worker
   */
  private loadModel(): void {
    if (this.worker && this.workerReady) {
      this.worker.postMessage({ type: 'load_model' });
    }
  }

  /**
   * Summarize with local model
   */
  private async summarizeWithLocalModel(
    data: AnomalyCluster | CausalGraphDelta,
    type: 'anomaly_cluster' | 'causal_delta'
  ): Promise<SummaryResult> {
    return new Promise((resolve, reject) => {
      if (!this.worker || !this.workerReady || !this.modelLoaded) {
        reject(new Error('Local model not ready'));
        return;
      }

      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const startTime = performance.now();

      const handler = (event: MessageEvent) => {
        const { type: msgType, requestId: msgRequestId, success, result, error } = event.data;
        
        if (msgType === 'summarize_response' && msgRequestId === requestId) {
          this.worker!.removeEventListener('message', handler);
          
          if (success) {
            const summary: SummaryResult = {
              summary: result.summary,
              confidence: result.confidence,
              method: 'local_model',
              tokensApprox: result.tokensApprox,
              generatedAt: new Date().toISOString(),
              metadata: {
                processingTime: performance.now() - startTime,
                modelVersion: result.modelVersion
              }
            };

            this.emitSummaryEvent({
              type,
              method: 'local_model',
              tokensApprox: result.tokensApprox
            });

            resolve(summary);
          } else {
            reject(new Error(error || 'Local model summarization failed'));
          }
        }
      };

      this.worker.addEventListener('message', handler);
      
      // Send summarization request
      this.worker.postMessage({
        type: 'summarize',
        requestId,
        data,
        summaryType: type
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        this.worker!.removeEventListener('message', handler);
        reject(new Error('Local model summarization timeout'));
      }, 30000);
    });
  }

  /**
   * Summarize with remote endpoint
   */
  private async summarizeWithRemoteEndpoint(
    data: AnomalyCluster | CausalGraphDelta,
    type: 'anomaly_cluster' | 'causal_delta'
  ): Promise<SummaryResult> {
    if (!this.remoteEndpoint) {
      throw new Error('No remote endpoint configured');
    }

    const startTime = performance.now();

    try {
      const response = await fetch(this.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          data
        })
      });

      if (!response.ok) {
        throw new Error(`Remote endpoint error: ${response.status}`);
      }

      const result = await response.json();

      const summary: SummaryResult = {
        summary: result.summary,
        confidence: result.confidence || 0.8,
        method: 'remote_endpoint',
        tokensApprox: result.tokensApprox || this.estimateTokens(result.summary),
        generatedAt: new Date().toISOString(),
        metadata: {
          processingTime: performance.now() - startTime,
          modelVersion: result.modelVersion
        }
      };

      this.emitSummaryEvent({
        type,
        method: 'remote_endpoint',
        tokensApprox: summary.tokensApprox
      });

      return summary;

    } catch (error) {
      throw new Error(`Remote summarization failed: ${error}`);
    }
  }

  /**
   * Summarize anomaly cluster with template
   */
  private summarizeWithTemplate(
    cluster: AnomalyCluster,
    startTime: number,
    fallbackReason?: string
  ): SummaryResult {
    const anomalyCount = cluster.anomalies.length;
    const highSeverityCount = cluster.anomalies.filter(a => a.severity === 'high').length;
    const metrics = [...new Set(cluster.anomalies.map(a => a.metric))];
    const domainCount = cluster.affectedDomains.length;

    let summary = `Detected ${anomalyCount} anomal${anomalyCount === 1 ? 'y' : 'ies'} in ${cluster.category} category`;
    
    if (highSeverityCount > 0) {
      summary += `, including ${highSeverityCount} high-severity issue${highSeverityCount === 1 ? '' : 's'}`;
    }
    
    summary += `. Affected metrics: ${metrics.slice(0, 3).join(', ')}`;
    
    if (metrics.length > 3) {
      summary += ` and ${metrics.length - 3} more`;
    }
    
    summary += `. Impact spans ${domainCount} domain${domainCount === 1 ? '' : 's'}.`;

    if (highSeverityCount > 0) {
      summary += ' Immediate investigation recommended for high-severity anomalies.';
    }

    const result: SummaryResult = {
      summary,
      confidence: 0.7,
      method: 'template_fallback',
      tokensApprox: this.estimateTokens(summary),
      generatedAt: new Date().toISOString(),
      metadata: {
        processingTime: performance.now() - startTime,
        fallbackReason
      }
    };

    this.emitSummaryEvent({
      type: 'anomaly_cluster',
      method: 'template_fallback',
      tokensApprox: result.tokensApprox
    });

    return result;
  }

  /**
   * Summarize causal delta with template
   */
  private summarizeCausalDeltaWithTemplate(
    delta: CausalGraphDelta,
    startTime: number,
    fallbackReason?: string
  ): SummaryResult {
    const { changes } = delta;
    const totalChanges = changes.nodesAdded + changes.nodesRemoved + changes.edgesAdded + changes.edgesRemoved;

    let summary = `Causal graph updated with ${totalChanges} total change${totalChanges === 1 ? '' : 's'}`;

    if (changes.nodesAdded > 0) {
      summary += `. Added ${changes.nodesAdded} new metric${changes.nodesAdded === 1 ? '' : 's'}`;
    }

    if (changes.edgesAdded > 0) {
      summary += `. Discovered ${changes.edgesAdded} new relationship${changes.edgesAdded === 1 ? '' : 's'}`;
    }

    if (changes.edgesRemoved > 0) {
      summary += `. Removed ${changes.edgesRemoved} weak connection${changes.edgesRemoved === 1 ? '' : 's'}`;
    }

    if (changes.confidenceChanges > 0) {
      summary += `. Updated confidence for ${changes.confidenceChanges} relationship${changes.confidenceChanges === 1 ? '' : 's'}`;
    }

    if (totalChanges === 0) {
      summary = 'Causal graph remained stable with no significant changes detected.';
    }

    const result: SummaryResult = {
      summary,
      confidence: 0.7,
      method: 'template_fallback',
      tokensApprox: this.estimateTokens(summary),
      generatedAt: new Date().toISOString(),
      metadata: {
        processingTime: performance.now() - startTime,
        fallbackReason
      }
    };

    this.emitSummaryEvent({
      type: 'causal_delta',
      method: 'template_fallback',
      tokensApprox: result.tokensApprox
    });

    return result;
  }

  /**
   * Get disabled summary result
   */
  private getDisabledSummary(): SummaryResult {
    return {
      summary: 'Semantic summarization is disabled.',
      confidence: 0,
      method: 'template_fallback',
      tokensApprox: 0,
      generatedAt: new Date().toISOString(),
      metadata: {
        processingTime: 0,
        fallbackReason: 'Feature disabled'
      }
    };
  }

  /**
   * Estimate token count from text
   */
  private estimateTokens(text: string): number {
    // Rough approximation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Create worker script (inline for simplicity)
   */
  private createWorkerScript(): string {
    return `
      let modelLoaded = false;
      
      self.onmessage = function(event) {
        const { type, requestId, data, summaryType } = event.data;
        
        if (type === 'init') {
          // Initialize worker
          self.postMessage({ type: 'init', success: true });
        } else if (type === 'load_model') {
          // Mock model loading
          setTimeout(() => {
            modelLoaded = true;
            self.postMessage({ type: 'model_loaded', success: true });
          }, 1000);
        } else if (type === 'summarize') {
          if (!modelLoaded) {
            self.postMessage({ 
              type: 'summarize_response', 
              requestId, 
              success: false, 
              error: 'Model not loaded' 
            });
            return;
          }
          
          // Mock summarization (in production, this would use a real model)
          setTimeout(() => {
            let summary = '';
            let tokensApprox = 0;
            
            if (summaryType === 'anomaly_cluster') {
              summary = 'AI-generated summary: Detected significant anomalies requiring attention.';
              tokensApprox = 12;
            } else if (summaryType === 'causal_delta') {
              summary = 'AI-generated summary: Causal relationships have been updated based on recent data.';
              tokensApprox = 16;
            }
            
            self.postMessage({
              type: 'summarize_response',
              requestId,
              success: true,
              result: {
                summary,
                confidence: 0.85,
                tokensApprox,
                modelVersion: 'mock-v1.0'
              }
            });
          }, Math.random() * 2000 + 500); // 0.5-2.5 seconds
        }
      };
    `;
  }

  /**
   * Emit summarization telemetry
   */
  private emitSummaryEvent(data: SemanticSummaryGeneratedEvent): void {
    if (typeof window !== 'undefined' && (window as any).__telemetryService) {
      const telemetryService = (window as any).__telemetryService;
      telemetryService.emit('semantic_summary_generated', data);
    }
  }
}

// Export singleton instance
export const summarizationService = new SummarizationService();

// Availability check function
export const isSummarizationAvailable = (): boolean => {
  return summarizationService.isAvailable();
};