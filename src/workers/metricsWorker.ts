/**
 * Metrics Worker (Phase 4)
 * Web Worker for offloading heavy classification and aggregate computations
 */

// Import types for worker communication
interface WorkerMessage {
  type: 'compute' | 'result' | 'error';
  id?: string;
  domains?: any[];
  aggregates?: any;
  classifiedCounts?: any;
  error?: string;
  timingMs?: number;
}

// Import the pure functions used for computation
// Note: These need to be worker-safe (no DOM dependencies)
let classifyDomains: (domains: any[]) => any;
let computeAggregates: (domains: any[]) => any;
let enrichAggregatesWithHighPotential: (aggregates: any, highPotentialCount: number) => any;

// Fallback implementations for worker environment
function safeClassifyDomains(domains: any[]) {
  // Simplified classification logic for worker
  const total = domains.length;
  const highQuality = domains.filter(d => d.score && d.score > 80);
  const mediumQuality = domains.filter(d => d.score && d.score > 60 && d.score <= 80);
  const lowQuality = domains.filter(d => d.score && d.score <= 60);
  
  return {
    highPotential: highQuality,
    highQuality: { count: highQuality.length, percentage: (highQuality.length / total) * 100 },
    mediumQuality: { count: mediumQuality.length, percentage: (mediumQuality.length / total) * 100 },
    lowQuality: { count: lowQuality.length, percentage: (lowQuality.length / total) * 100 }
  };
}

function safeComputeAggregates(domains: any[]) {
  const total = domains.length;
  const scores = domains.map(d => d.score || 0).filter(s => s > 0);
  const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  
  return {
    totalDomains: total,
    averageScore,
    scoredDomains: scores.length,
    validDomains: domains.filter(d => d.domain && d.domain.length > 0).length
  };
}

function safeEnrichAggregatesWithHighPotential(aggregates: any, highPotentialCount: number) {
  return {
    ...aggregates,
    highPotentialCount,
    highPotentialPercentage: aggregates.totalDomains > 0 ? 
      (highPotentialCount / aggregates.totalDomains) * 100 : 0
  };
}

// Try to import actual functions, fall back to safe versions
try {
  // In worker context, we might not have access to the full module system
  // These would need to be manually copied or bundled
  classifyDomains = safeClassifyDomains;
  computeAggregates = safeComputeAggregates;
  enrichAggregatesWithHighPotential = safeEnrichAggregatesWithHighPotential;
} catch (error) {
  console.warn('Using fallback functions in worker:', error);
  classifyDomains = safeClassifyDomains;
  computeAggregates = safeComputeAggregates;
  enrichAggregatesWithHighPotential = safeEnrichAggregatesWithHighPotential;
}

// Worker message handler
self.onmessage = function(event: MessageEvent<WorkerMessage>) {
  const { type, id, domains } = event.data;
  
  if (type === 'compute' && domains) {
    const startTime = performance.now();
    
    try {
      // Perform the heavy computations
      const classified = classifyDomains(domains);
      const aggregates = computeAggregates(domains);
      const enrichedAggregates = enrichAggregatesWithHighPotential(
        aggregates, 
        classified.highPotential ? classified.highPotential.length : 0
      );
      
      const endTime = performance.now();
      const timingMs = endTime - startTime;
      
      // Convert classification to counts format
      const classifiedCounts = {
        highQuality: classified.highQuality?.count || 0,
        mediumQuality: classified.mediumQuality?.count || 0,
        lowQuality: classified.lowQuality?.count || 0,
        total: domains.length
      };
      
      // Send result back to main thread
      const response: WorkerMessage = {
        type: 'result',
        id,
        aggregates: enrichedAggregates,
        classifiedCounts,
        timingMs
      };
      
      self.postMessage(response);
      
    } catch (error) {
      // Send error back to main thread
      const errorResponse: WorkerMessage = {
        type: 'error',
        id,
        error: error instanceof Error ? error.message : 'Unknown worker error'
      };
      
      self.postMessage(errorResponse);
    }
  }
};

// Handle worker errors
self.onerror = function(error) {
  const errorMessage = typeof error === 'string' ? error : 
                      (error instanceof Error ? error.message : 'Worker error');
  
  const errorResponse: WorkerMessage = {
    type: 'error',
    error: errorMessage
  };
  
  self.postMessage(errorResponse);
};

// Export for TypeScript (though this won't execute in worker context)
export {};