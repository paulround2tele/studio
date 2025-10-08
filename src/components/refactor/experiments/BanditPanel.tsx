/**
 * Bandit Experiments Panel Component (Phase 10)
 * Adaptive experimentation dashboard with arm performance tracking
 */

import React, { useState } from 'react';
import { useBandit, useBanditArmPerformance } from '@/hooks/useBandit';
import type { BanditArm } from '@/services/experimentation/banditService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, Plus, TrendingUp, Target, Award, AlertCircle } from 'lucide-react';

interface BanditPanelProps {
  className?: string;
  autoRefresh?: boolean;
  showPerformance?: boolean;
  showControls?: boolean;
}

export function BanditPanel({ 
  className = '', 
  autoRefresh = false,
  showPerformance = true,
  showControls = true
}: BanditPanelProps) {
  const [state, actions] = useBandit({ 
    autoRefresh,
    refreshInterval: 10000,
    enableOutcomeTracking: true
  });

  const [newArmName, setNewArmName] = useState('');
  const [newArmDescription, setNewArmDescription] = useState('');
  const [selectedArm, setSelectedArm] = useState<string | null>(null);

  // Feature flag check
  if (!state.capabilities.available) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <AlertCircle className="mx-auto h-8 w-8 mb-2" />
          <p>Bandit Experiments are not available.</p>
          <p className="text-sm mt-1">Enable NEXT_PUBLIC_ENABLE_BANDIT_EXPERIMENTS to use this feature.</p>
        </div>
      </Card>
    );
  }

  const { arms, loading, error, performanceSummary } = state;

  const handleRefresh = () => {
    actions.refresh();
  };

  const handleAddArm = async () => {
    if (!newArmName.trim()) return;

    try {
      await actions.registerArm(newArmName, {
        name: newArmName,
        description: newArmDescription || `Experiment arm: ${newArmName}`,
        category: 'user_created',
        version: '1.0'
      });
      setNewArmName('');
      setNewArmDescription('');
    } catch (error) {
      console.error('Failed to add arm:', error);
    }
  };

  const handleClearExperiments = () => {
    if (confirm('Are you sure you want to clear all experiment data? This cannot be undone.')) {
      actions.clear();
    }
  };

  const getArmStatusColor = (arm: BanditArm) => {
    if (arm.stats.pulls === 0) return 'gray';
    if (arm.stats.averageReward > 0.7) return 'green';
    if (arm.stats.averageReward > 0.4) return 'yellow';
    return 'red';
  };

  const getArmStatusText = (arm: BanditArm) => {
    if (arm.stats.pulls === 0) return 'Untested';
    if (arm.stats.averageReward > 0.7) return 'Performing Well';
    if (arm.stats.averageReward > 0.4) return 'Average';
    return 'Underperforming';
  };

  const formatReward = (reward: number) => {
    return (reward * 100).toFixed(1) + '%';
  };

  const renderArmCard = (arm: BanditArm) => {
    const statusColor = getArmStatusColor(arm);
    const statusText = getArmStatusText(arm);
    const isSelected = selectedArm === arm.id;
    const isBest = performanceSummary.bestArm?.id === arm.id;
    
    return (
      <div
        key={arm.id}
        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
        } ${isBest ? 'ring-2 ring-green-200' : ''}`}
        onClick={() => setSelectedArm(isSelected ? null : arm.id)}
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="font-medium text-sm">{arm.meta.name}</div>
            <div className="text-xs text-gray-600 mt-1">{arm.meta.description}</div>
          </div>
          <div className="flex items-center gap-2">
            {isBest && <Award className="h-4 w-4 text-yellow-500" />}
            <Badge 
              variant={statusColor === 'green' ? 'default' : statusColor === 'yellow' ? 'secondary' : 'outline'}
              className="text-xs"
            >
              {statusText}
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Pulls:</span>
            <span className="font-medium">{arm.stats.pulls}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Avg Reward:</span>
            <span className="font-medium">{formatReward(arm.stats.averageReward)}</span>
          </div>

          {arm.stats.pulls > 0 && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Reward:</span>
                <span className="font-medium">{arm.stats.totalReward.toFixed(1)}</span>
              </div>
              
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>Performance</span>
                  <span>{formatReward(arm.stats.averageReward)}</span>
                </div>
                <Progress 
                  value={arm.stats.averageReward * 100} 
                  className="h-2"
                />
              </div>
            </>
          )}

          <div className="text-xs text-gray-500 mt-2">
            Last updated: {new Date(arm.stats.lastUpdated).toLocaleTimeString()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className={`${className}`}>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold">Bandit Experiments</h3>
            <p className="text-sm text-gray-600">
              Adaptive experimentation with multi-armed bandit optimization
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
                variant="destructive"
                size="sm"
                onClick={handleClearExperiments}
                disabled={loading || arms.length === 0}
              >
                Clear All
              </Button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {showPerformance && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{performanceSummary.totalArms}</div>
              <div className="text-xs text-gray-600">Total Arms</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{performanceSummary.totalPulls}</div>
              <div className="text-xs text-gray-600">Total Pulls</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{formatReward(performanceSummary.averageReward)}</div>
              <div className="text-xs text-gray-600">Avg Reward</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {performanceSummary.bestArm ? performanceSummary.bestArm.meta.name : 'None'}
              </div>
              <div className="text-xs text-gray-600">Best Performer</div>
            </div>
          </div>
        )}

        {showControls && (
          <div className="mb-6 p-4 border rounded-lg bg-gray-50">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add New Experiment Arm
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <Input
                  placeholder="e.g., Version A"
                  value={newArmName}
                  onChange={(e) => setNewArmName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                <Input
                  placeholder="Brief description..."
                  value={newArmDescription}
                  onChange={(e) => setNewArmDescription(e.target.value)}
                />
              </div>
            </div>
            <Button
              className="mt-3"
              onClick={handleAddArm}
              disabled={!newArmName.trim() || loading}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Arm
            </Button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-gray-600">Loading experiments...</p>
          </div>
        ) : arms.length === 0 ? (
          <div className="text-center py-8">
            <Target className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-gray-600">No experiment arms configured</p>
            <p className="text-sm text-gray-500">Add arms above to start experimenting</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {arms.map(renderArmCard)}
            </div>

            {selectedArm && (
              <ArmDetailView armId={selectedArm} onClose={() => setSelectedArm(null)} />
            )}
          </div>
        )}

        {state.lastUpdate && (
          <div className="mt-4 pt-4 border-t text-xs text-gray-500 text-center">
            Last updated: {new Date(state.lastUpdate).toLocaleString()}
          </div>
        )}
      </div>
    </Card>
  );
}

// Detailed arm view component
function ArmDetailView({ armId, onClose }: { armId: string; onClose: () => void }) {
  const armPerformance = useBanditArmPerformance(armId);

  if (!armPerformance.found) {
    return (
      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">Arm not found: {armId}</p>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex justify-between items-start mb-3">
        <h4 className="font-medium">Arm Details: {armId}</h4>
        <Button variant="ghost" size="sm" onClick={onClose}>×</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-gray-600">Pulls</div>
          <div className="font-medium">{armPerformance.pulls}</div>
        </div>
        <div>
          <div className="text-gray-600">Avg Reward</div>
          <div className="font-medium">{(armPerformance.averageReward * 100).toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-gray-600">Confidence</div>
          <div className="font-medium">±{(armPerformance.confidence * 100).toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-gray-600">Rank</div>
          <div className="font-medium">
            #{armPerformance.rank} 
            {armPerformance.rank === 1 && (
              <Award className="inline h-3 w-3 ml-1 text-yellow-500" />
            )}
          </div>
        </div>
      </div>

      {armPerformance.lastUpdated && (
        <div className="mt-3 text-xs text-gray-500">
          Last activity: {new Date(armPerformance.lastUpdated).toLocaleString()}
        </div>
      )}
    </div>
  );
}