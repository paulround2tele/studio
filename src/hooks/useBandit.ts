/**
 * Bandit Experiments Hook (Phase 10)
 * React hook for adaptive experimentation
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  banditService, 
  type BanditArm, 
  type BanditContext,
  type BanditDecision,
  type BanditOutcome,
  type BanditConfig,
  isBanditAvailable 
} from '@/services/experimentation/banditService';

export interface UseBanditOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableOutcomeTracking?: boolean;
}

export interface BanditState {
  arms: BanditArm[];
  loading: boolean;
  error: string | null;
  lastUpdate: string | null;
  capabilities: {
    available: boolean;
    totalArms: number;
    totalPulls: number;
    bestArm: BanditArm | null;
  };
  performanceSummary: {
    totalPulls: number;
    totalArms: number;
    bestArm: BanditArm | null;
    worstArm: BanditArm | null;
    averageReward: number;
  };
}

export interface BanditActions {
  refresh: () => Promise<void>;
  registerArm: (id: string, meta: BanditArm['meta']) => Promise<void>;
  selectArm: (context: BanditContext) => Promise<BanditDecision>;
  recordOutcome: (armId: string, reward: number, context: BanditContext) => Promise<void>;
  getArm: (id: string) => BanditArm | undefined;
  getRecentOutcomes: (limit?: number) => BanditOutcome[];
  updateConfig: (config: Partial<BanditConfig>) => void;
  clear: () => void;
}

/**
 * Hook for bandit experiments functionality
 */
export function useBandit(options: UseBanditOptions = {}): [BanditState, BanditActions] {
  const {
    autoRefresh = false,
    refreshInterval = 30000, // 30 seconds
    enableOutcomeTracking = true
  } = options;

  const [state, setState] = useState<BanditState>({
    arms: [],
    loading: false,
    error: null,
    lastUpdate: null,
    capabilities: {
      available: isBanditAvailable(),
      totalArms: 0,
      totalPulls: 0,
      bestArm: null
    },
    performanceSummary: {
      totalPulls: 0,
      totalArms: 0,
      bestArm: null,
      worstArm: null,
      averageReward: 0
    }
  });

  // Refresh function
  const refresh = useCallback(async () => {
    if (!isBanditAvailable()) {
      setState(prev => ({
        ...prev,
        error: 'Bandit service is not available'
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const arms = banditService.getArms();
      const performanceSummary = banditService.getPerformanceSummary();
      
      setState(prev => ({
        ...prev,
        arms,
        performanceSummary,
        loading: false,
        lastUpdate: new Date().toISOString(),
        capabilities: {
          available: true,
          totalArms: arms.length,
          totalPulls: performanceSummary.totalPulls,
          bestArm: performanceSummary.bestArm
        }
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, []);

  // Register arm
  const registerArm = useCallback(async (id: string, meta: BanditArm['meta']) => {
    if (!isBanditAvailable()) {
      setState(prev => ({
        ...prev,
        error: 'Bandit service is not available'
      }));
      return;
    }

    try {
      banditService.registerArm(id, meta);
      await refresh();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to register arm'
      }));
    }
  }, [refresh]);

  // Select arm
  const selectArm = useCallback(async (context: BanditContext): Promise<BanditDecision> => {
    if (!isBanditAvailable()) {
      throw new Error('Bandit service is not available');
    }

    try {
      const decision = banditService.selectArm(context);
      return decision;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to select arm'
      }));
      throw error;
    }
  }, []);

  // Record outcome
  const recordOutcome = useCallback(async (
    armId: string, 
    reward: number, 
    context: BanditContext
  ) => {
    if (!isBanditAvailable() || !enableOutcomeTracking) return;

    try {
      banditService.recordOutcome(armId, reward, context);
      await refresh();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to record outcome'
      }));
    }
  }, [enableOutcomeTracking, refresh]);

  // Get arm
  const getArm = useCallback((id: string) => {
    if (!isBanditAvailable()) return undefined;
    return banditService.getArm(id);
  }, []);

  // Get recent outcomes
  const getRecentOutcomes = useCallback((limit?: number) => {
    if (!isBanditAvailable()) return [];
    return banditService.getRecentOutcomes(limit);
  }, []);

  // Update config
  const updateConfig = useCallback((config: Partial<BanditConfig>) => {
    if (!isBanditAvailable()) return;
    
    try {
      banditService.updateConfig(config);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update config'
      }));
    }
  }, []);

  // Clear
  const clear = useCallback(() => {
    if (!isBanditAvailable()) return;

    try {
      banditService.clear();
      setState(prev => ({
        ...prev,
        arms: [],
        performanceSummary: {
          totalPulls: 0,
          totalArms: 0,
          bestArm: null,
          worstArm: null,
          averageReward: 0
        },
        capabilities: {
          ...prev.capabilities,
          totalArms: 0,
          totalPulls: 0,
          bestArm: null
        }
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to clear bandit'
      }));
    }
  }, []);

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

  const actions: BanditActions = {
    refresh,
    registerArm,
    selectArm,
    recordOutcome,
    getArm,
    getRecentOutcomes,
    updateConfig,
    clear
  };

  return [state, actions];
}

/**
 * Hook for bandit arm performance tracking
 */
export function useBanditArmPerformance(armId: string) {
  const [state] = useBandit({ autoRefresh: true, refreshInterval: 10000 });

  const armPerformance = useMemo(() => {
    const arm = state.arms.find(a => a.id === armId);
    if (!arm) {
      return {
        found: false,
        pulls: 0,
        averageReward: 0,
        confidence: 0,
        lastUpdated: null,
        rank: 0
      };
    }

    // Calculate rank among all arms
    const sortedArms = [...state.arms]
      .filter(a => a.stats.pulls > 0)
      .sort((a, b) => b.stats.averageReward - a.stats.averageReward);
    
    const rank = sortedArms.findIndex(a => a.id === armId) + 1;

    return {
      found: true,
      pulls: arm.stats.pulls,
      averageReward: arm.stats.averageReward,
      confidence: arm.stats.confidence,
      lastUpdated: arm.stats.lastUpdated,
      rank
    };
  }, [state.arms, armId]);

  return armPerformance;
}

/**
 * Hook for bandit experiment context
 */
export function useBanditContext(
  userId?: string,
  campaignId?: string,
  additionalFeatures: Record<string, any> = {}
): BanditContext {
  return useMemo(() => ({
    userId,
    campaignId,
    features: {
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      ...additionalFeatures
    },
    timestamp: new Date().toISOString()
  }), [userId, campaignId, additionalFeatures]);
}

/**
 * Hook for A/B testing with bandit backend
 */
export function useBanditABTest(
  testName: string,
  variants: Array<{ id: string; name: string; description: string }>,
  context?: BanditContext
) {
  const [state, actions] = useBandit();
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Register variants as arms
  useEffect(() => {
    const registerVariants = async () => {
      for (const variant of variants) {
        try {
          await actions.registerArm(`${testName}_${variant.id}`, {
            name: variant.name,
            description: variant.description,
            category: testName,
            version: '1.0'
          });
        } catch (error) {
          // Ignore errors for already registered arms
        }
      }
    };

    if (isBanditAvailable() && variants.length > 0) {
      registerVariants();
    }
  }, [testName, variants, actions]);

  // Select variant
  const selectVariant = useCallback(async () => {
    if (!context || !isBanditAvailable() || variants.length === 0) {
      // Fallback to random selection
      const randomVariant = variants[Math.floor(Math.random() * variants.length)];
      if (randomVariant) {
        setSelectedVariant(randomVariant.id);
        return randomVariant.id;
      }
      return null;
    }

    setLoading(true);
    try {
      const decision = await actions.selectArm(context);
      const variantId = decision.armId.replace(`${testName}_`, '');
      setSelectedVariant(variantId);
      setLoading(false);
      return variantId;
    } catch (error) {
      // Fallback to random selection
      const randomVariant = variants[Math.floor(Math.random() * variants.length)];
      if (randomVariant) {
        setSelectedVariant(randomVariant.id);
        setLoading(false);
        return randomVariant.id;
      }
      setLoading(false);
      return null;
    }
  }, [context, variants, testName, actions]);

  // Record conversion
  const recordConversion = useCallback(async (reward: number = 1) => {
    if (!selectedVariant || !context || !isBanditAvailable()) return;

    try {
      await actions.recordOutcome(`${testName}_${selectedVariant}`, reward, context);
    } catch (error) {
      console.warn('Failed to record conversion:', error);
    }
  }, [selectedVariant, context, testName, actions]);

  return {
    selectedVariant,
    loading,
    selectVariant,
    recordConversion,
    isReady: !loading && selectedVariant !== null
  };

  return {
    selectedVariant,
    loading,
    selectVariant,
    recordConversion,
    isReady: !loading && selectedVariant !== null
  };
}