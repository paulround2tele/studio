/**
 * Causal Graph Panel Component (Phase 10)
 * Displays causal influence graph with confidence filtering
 */

import React, { useState, useMemo } from 'react';
import { useCausalGraph, useFilteredCausalGraph, useCausalGraphStats } from '@/hooks/useCausalGraph';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { RefreshCw, Filter, Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface CausalGraphPanelProps {
  className?: string;
  autoRefresh?: boolean;
  showStats?: boolean;
  showControls?: boolean;
}

export function CausalGraphPanel({ 
  className = '', 
  autoRefresh = false,
  showStats = true,
  showControls = true
}: CausalGraphPanelProps) {
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.6);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  
  const [filteredState, filteredActions] = useFilteredCausalGraph(confidenceThreshold, {
    autoRefresh,
    refreshInterval: 30000
  });
  
  const stats = useCausalGraphStats();

  // Feature flag check
  if (!filteredState.capabilities.available) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <Info className="mx-auto h-8 w-8 mb-2" />
          <p>Causal Graph Analysis is not available.</p>
          <p className="text-sm mt-1">Enable NEXT_PUBLIC_ENABLE_CAUSAL_GRAPH to use this feature.</p>
        </div>
      </Card>
    );
  }

  const { graph, loading, error } = filteredState;

  // Group edges by confidence band
  const edgeBands = useMemo(() => {
    if (!graph) return { strong: [], medium: [], weak: [] };
    
    return {
      strong: graph.edges.filter(e => e.confidence > 0.6),
      medium: graph.edges.filter(e => e.confidence >= 0.3 && e.confidence <= 0.6),
      weak: graph.edges.filter(e => e.confidence < 0.3)
    };
  }, [graph]);

  // Get node connections
  const getNodeConnections = (nodeId: string) => {
    if (!graph) return { incoming: 0, outgoing: 0 };
    
    const incoming = graph.edges.filter(e => e.to === nodeId).length;
    const outgoing = graph.edges.filter(e => e.from === nodeId).length;
    
    return { incoming, outgoing };
  };

  const handleRefresh = () => {
    filteredActions.refresh();
  };

  const handlePruneByConfidence = () => {
    const pruned = filteredActions.pruneByConfidence(confidenceThreshold);
    console.log(`Pruned ${pruned} low-confidence edges`);
  };

  const renderNodeCard = (node: any) => {
    const connections = getNodeConnections(node.id);
    const isSelected = selectedNode === node.id;
    
    return (
      <div
        key={node.id}
        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
        }`}
        onClick={() => setSelectedNode(isSelected ? null : node.id)}
      >
        <div className="flex justify-between items-start mb-2">
          <div className="font-medium text-sm truncate flex-1">{node.metric}</div>
          <Badge variant={node.type === 'metric' ? 'default' : 'secondary'} className="ml-2 text-xs">
            {node.type}
          </Badge>
        </div>
        
        <div className="text-xs text-gray-600 space-y-1">
          <div>Samples: {node.sampleCount}</div>
          <div>Avg: {node.averageValue.toFixed(2)}</div>
          <div className="flex justify-between">
            <span>In: {connections.incoming}</span>
            <span>Out: {connections.outgoing}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderEdgeList = (edges: any[], title: string, variant: 'default' | 'secondary' | 'outline') => (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h4 className="font-medium text-sm">{title}</h4>
        <Badge variant={variant}>{edges.length}</Badge>
      </div>
      {edges.slice(0, 5).map(edge => (
        <div key={edge.id} className="text-xs p-2 bg-gray-50 rounded border">
          <div className="flex justify-between items-center mb-1">
            <span className="font-medium">{edge.from} → {edge.to}</span>
            <div className="flex items-center gap-1">
              {edge.direction === 'positive' ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className="text-gray-600">{(edge.confidence * 100).toFixed(0)}%</span>
            </div>
          </div>
          <div className="text-gray-600">
            Strength: {edge.strength.toFixed(2)} | Lag: {(edge.lagMs / 1000).toFixed(0)}s
          </div>
        </div>
      ))}
      {edges.length > 5 && (
        <div className="text-xs text-gray-500 text-center">
          +{edges.length - 5} more relationships
        </div>
      )}
    </div>
  );

  return (
    <Card className={`${className}`}>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold">Causal Influence Graph</h3>
            <p className="text-sm text-gray-600">
              Discover relationships between metrics and features
            </p>
          </div>
          
          {showControls && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePruneByConfidence}
                disabled={loading}
              >
                <Filter className="h-4 w-4" />
                Prune
              </Button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {showStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.totalNodes}</div>
              <div className="text-xs text-gray-600">Nodes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.totalEdges}</div>
              <div className="text-xs text-gray-600">Relationships</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.strongEdges}</div>
              <div className="text-xs text-gray-600">Strong Connections</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{(stats.avgConfidence * 100).toFixed(0)}%</div>
              <div className="text-xs text-gray-600">Avg Confidence</div>
            </div>
          </div>
        )}

        {showControls && (
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Confidence Threshold: {(confidenceThreshold * 100).toFixed(0)}%
            </label>
            <Slider
              value={[confidenceThreshold]}
              onValueChange={([value]) => setConfidenceThreshold(value || 0)}
              min={0}
              max={1}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0% (Show All)</span>
              <span>100% (High Confidence Only)</span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-gray-600">Loading causal graph...</p>
          </div>
        ) : !graph || graph.nodes.length === 0 ? (
          <div className="text-center py-8">
            <Minus className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-gray-600">No causal relationships found</p>
            <p className="text-sm text-gray-500">Data will appear as metrics are ingested</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Nodes Section */}
            <div>
              <h4 className="font-medium mb-3">Metrics & Features ({graph.nodes.length})</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                {graph.nodes.map(renderNodeCard)}
              </div>
            </div>

            {/* Relationships Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderEdgeList(edgeBands.strong, 'Strong Relationships', 'default')}
              {renderEdgeList(edgeBands.medium, 'Medium Relationships', 'secondary')}
              {renderEdgeList(edgeBands.weak, 'Weak Relationships', 'outline')}
            </div>

            {selectedNode && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium mb-2">Selected: {selectedNode}</h4>
                <div className="text-sm text-gray-600">
                  <p>Click on other nodes to see their details or click again to deselect.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {graph && filteredState.lastUpdate && (
          <div className="mt-4 pt-4 border-t text-xs text-gray-500 text-center">
            Last updated: {new Date(filteredState.lastUpdate).toLocaleString()}
          </div>
        )}
      </div>
    </Card>
  );
}