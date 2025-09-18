/**
 * Causal Graph Hook (Phase 10)
 * React hook for causal graph inference integration
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  causalGraphService, 
  type CausalGraph, 
  type CausalNode, 
  type CausalEdge,
  type ObservationFeatures,
  isCausalGraphAvailable 
} from '@/services/analytics/causalGraphService';

export interface UseCausalGraphOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  confidenceThreshold?: number;
  enableIngest?: boolean;
}

export interface CausalGraphState {
  graph: CausalGraph | null;
  loading: boolean;
  error: string | null;
  lastUpdate: string | null;
  capabilities: {
    available: boolean;
    nodeCount: number;
    edgeCount: number;
    version: string;
  };
}

export interface CausalGraphActions {
  refresh: () => Promise<void>;
  ingestObservation: (metricKey: string, value: number, features?: ObservationFeatures) => void;
  pruneByConfidence: (threshold: number) => number;
  getNodesByConfidence: (threshold: number) => CausalNode[];
  getEdgesByConfidence: (min: number, max?: number) => CausalEdge[];
  clearHistory: () => void;
}

/**
 * Hook for causal graph functionality
 */
export function useCausalGraph(options: UseCausalGraphOptions = {}): [CausalGraphState, CausalGraphActions] {
  const {
    autoRefresh = false,
    refreshInterval = 30000, // 30 seconds
    confidenceThreshold = 0.6,
    enableIngest = true
  } = options;

  const [state, setState] = useState<CausalGraphState>({
    graph: null,
    loading: false,
    error: null,
    lastUpdate: null,
    capabilities: {
      available: isCausalGraphAvailable(),
      nodeCount: 0,
      edgeCount: 0,
      version: '1.0.0'
    }
  });

  // Memoized capabilities check
  const capabilities = useMemo(() => ({
    available: isCausalGraphAvailable(),
    nodeCount: state.graph?.nodes.length || 0,
    edgeCount: state.graph?.edges.length || 0,
    version: state.graph?.version || '1.0.0'
  }), [state.graph]);

  // Update capabilities when graph changes
  useEffect(() => {
    setState(prev => ({
      ...prev,
      capabilities
    }));
  }, [capabilities]);

  // Refresh function
  const refresh = useCallback(async () => {
    if (!isCausalGraphAvailable()) {
      setState(prev => ({
        ...prev,
        error: 'Causal graph service is not available'
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const graph = causalGraphService.getCausalGraph();
      setState(prev => ({
        ...prev,
        graph,
        loading: false,
        lastUpdate: new Date().toISOString()
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, []);

  // Ingest observation
  const ingestObservation = useCallback((
    metricKey: string, 
    value: number, 
    features: ObservationFeatures = {}
  ) => {
    if (!enableIngest || !isCausalGraphAvailable()) return;

    try {
      causalGraphService.ingestObservation(
        metricKey,
        new Date().toISOString(),
        value,
        features
      );
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to ingest observation'
      }));
    }
  }, [enableIngest]);

  // Prune by confidence
  const pruneByConfidence = useCallback((threshold: number) => {
    if (!isCausalGraphAvailable()) return 0;

    try {
      const pruned = causalGraphService.pruneLowConfidence(threshold);
      // Refresh graph after pruning
      refresh();
      return pruned;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to prune graph'
      }));
      return 0;
    }
  }, [refresh]);

  // Get nodes by confidence
  const getNodesByConfidence = useCallback((threshold: number) => {
    if (!isCausalGraphAvailable()) return [];

    try {
      return causalGraphService.getNodesByConfidenceThreshold(threshold);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to get nodes'
      }));
      return [];
    }
  }, []);

  // Get edges by confidence
  const getEdgesByConfidence = useCallback((min: number, max: number = 1.0) => {
    if (!isCausalGraphAvailable()) return [];

    try {
      return causalGraphService.getEdgesByConfidenceBand(min, max);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to get edges'
      }));
      return [];
    }
  }, []);

  // Clear history
  const clearHistory = useCallback(() => {
    if (!isCausalGraphAvailable()) return;

    try {
      causalGraphService.clearHistory();
      refresh();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to clear history'
      }));
    }
  }, [refresh]);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(refresh, refreshInterval);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [autoRefresh, refreshInterval, refresh]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  const actions: CausalGraphActions = {
    refresh,
    ingestObservation,
    pruneByConfidence,
    getNodesByConfidence,
    getEdgesByConfidence,
    clearHistory
  };

  return [state, actions];
}

/**
 * Hook for filtered causal graph data
 */
export function useFilteredCausalGraph(
  confidenceThreshold: number = 0.6,
  options: UseCausalGraphOptions = {}
) {
  const [state, actions] = useCausalGraph(options);

  const filteredGraph = useMemo(() => {
    if (!state.graph) return null;

    const filteredEdges = state.graph.edges.filter(
      edge => edge.confidence >= confidenceThreshold
    );

    // Get nodes that have at least one filtered edge
    const connectedNodeIds = new Set([
      ...filteredEdges.map(edge => edge.from),
      ...filteredEdges.map(edge => edge.to)
    ]);

    const filteredNodes = state.graph.nodes.filter(
      node => connectedNodeIds.has(node.id)
    );

    return {
      ...state.graph,
      nodes: filteredNodes,
      edges: filteredEdges
    };
  }, [state.graph, confidenceThreshold]);

  return [
    { ...state, graph: filteredGraph },
    actions
  ] as const;
}

/**
 * Hook for causal graph statistics
 */
export function useCausalGraphStats() {
  const [state] = useCausalGraph({ autoRefresh: true, refreshInterval: 60000 });

  const stats = useMemo(() => {
    if (!state.graph) {
      return {
        totalNodes: 0,
        totalEdges: 0,
        strongEdges: 0,
        mediumEdges: 0,
        weakEdges: 0,
        avgConfidence: 0,
        lastConsolidation: null
      };
    }

    const edges = state.graph.edges;
    const strongEdges = edges.filter(e => e.confidence > 0.6).length;
    const mediumEdges = edges.filter(e => e.confidence >= 0.3 && e.confidence <= 0.6).length;
    const weakEdges = edges.filter(e => e.confidence < 0.3).length;
    
    const avgConfidence = edges.length > 0
      ? edges.reduce((sum, e) => sum + e.confidence, 0) / edges.length
      : 0;

    return {
      totalNodes: state.graph.nodes.length,
      totalEdges: edges.length,
      strongEdges,
      mediumEdges,
      weakEdges,
      avgConfidence,
      lastConsolidation: state.graph.lastUpdate
    };
  }, [state.graph]);

  return stats;
}