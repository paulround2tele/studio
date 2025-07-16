// src/lib/hooks/useProxyHealth.ts
// Advanced proxy health monitoring with branded types integration

import { useState, useEffect, useCallback } from 'react';
import { getProxies, testProxy, testAllProxies } from '@/lib/services/proxyService.production';
import type { ProxiesListResponse } from '@/lib/services/proxyService.production';
import type { Proxy } from '@/lib/api-client/models';
import { useToast } from '@/hooks/use-toast';

// Use Proxy directly - no extension needed since all fields are already there
type ExtendedProxy = Proxy;


export interface ProxyHealthMetrics {
  totalProxies: number;
  activeProxies: number;
  failedProxies: number;
  testingProxies: number;
  disabledProxies: number;
  averageResponseTime: number;
  successRate: number;
  lastUpdateTime: Date;
}

export interface ProxyHealthDetails {
  id: string;
  address: string;
  status: string;
  latencyMs: number | null;
  lastTested: Date | null;
  successCount: number;
  failureCount: number;
  lastError: string | null;
  isHealthy: boolean;
}

interface UseProxyHealthOptions {
  // 🚀 WEBSOCKET PUSH MODEL: Removed autoRefresh and refreshInterval - now uses WebSocket push events
  enableHealthChecks?: boolean;
  healthCheckInterval?: number;
}

/**
 * Enhanced proxy health monitoring hook with advanced metrics
 */
export function useProxyHealth(options: UseProxyHealthOptions = {}) {
  const {
    // 🚀 WEBSOCKET PUSH MODEL: Removed autoRefresh and refreshInterval - now uses WebSocket push events
    enableHealthChecks: _enableHealthChecks = false,
    healthCheckInterval: _healthCheckInterval = 3600000 // CRITICAL FIX: 1 hour (3600 seconds) instead of 5 minutes
  } = options;

  const { toast } = useToast();
  
  const [proxies, setProxies] = useState<ExtendedProxy[]>([]);
  const [healthMetrics, setHealthMetrics] = useState<ProxyHealthMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [healthCheckInProgress, setHealthCheckInProgress] = useState(false);

  /**
   * Calculate health metrics from proxy data
   */
  const calculateHealthMetrics = useCallback((proxyData: ExtendedProxy[]): ProxyHealthMetrics => {
    // Ensure proxyData is always an array
    const safeProxyData = Array.isArray(proxyData) ? proxyData : [];
    const totalProxies = safeProxyData.length;
    const activeProxies = safeProxyData.filter(p => p.isEnabled && p.isHealthy).length;
    const failedProxies = safeProxyData.filter(p => p.isEnabled && !p.isHealthy).length;
    const testingProxies = 0; // OpenAPI doesn't have testing status
    const disabledProxies = safeProxyData.filter(p => !p.isEnabled).length;

    const proxiesWithLatency = safeProxyData.filter(p => (typeof p.latencyMs === "object" && p.latencyMs && (p.latencyMs as any).valid) && p.latencyMs && p.latencyMs > 0);
    const averageResponseTime = proxiesWithLatency.length > 0
      ? proxiesWithLatency.reduce((sum, p) => sum + (typeof p.latencyMs === "number" ? p.latencyMs : 0), 0) / proxiesWithLatency.length
      : 0;

    const totalTests = safeProxyData.reduce((sum, p) => {
      const successCount = p.successCount || 0;
      const failureCount = p.failureCount || 0;
      return sum + (typeof successCount === "number" ? successCount : parseInt(String(successCount)) || 0) + (typeof failureCount === "number" ? failureCount : parseInt(String(failureCount)) || 0);
    }, 0);
    
    const totalSuccesses = safeProxyData.reduce((sum, p) => {
      const successCount = p.successCount || 0;
      return sum + (typeof successCount === "number" ? successCount : parseInt(String(successCount)) || 0);
    }, 0);
    
    const successRate = totalTests > 0 ? (totalSuccesses / totalTests) * 100 : 0;

    return {
      totalProxies,
      activeProxies,
      failedProxies,
      testingProxies,
      disabledProxies,
      averageResponseTime: Math.round(averageResponseTime),
      successRate: Math.round(successRate * 100) / 100,
      lastUpdateTime: new Date()
    };
  }, []);

  /**
   * Get detailed health information for proxies
   */
  const getProxyHealthDetails = useCallback((): ProxyHealthDetails[] => {
    return proxies.map(proxy => ({
      id: proxy.id || '',
      address: proxy.address || '',
      status: proxy.isHealthy ? 'Active' : 'Failed',
      latencyMs: proxy.latencyMs ? (typeof proxy.latencyMs === 'string' ? parseFloat(proxy.latencyMs) : proxy.latencyMs) : null,
      lastTested: proxy.lastCheckedAt ? new Date(proxy.lastCheckedAt as any) : null,
      successCount: typeof proxy.successCount === 'string' ? parseInt(proxy.successCount, 10) : (proxy.successCount || 0),
      failureCount: typeof proxy.failureCount === 'string' ? parseInt(proxy.failureCount, 10) : (proxy.failureCount || 0),
      lastError: proxy.lastError || null,
      isHealthy: Boolean(proxy.isHealthy)
    }));
  }, [proxies]);

  /**
   * Fetch proxy data and update metrics
   */
  const fetchProxyData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const response: ProxiesListResponse = await getProxies();
      
      if (response.success === true && response.data) {
        // Ensure data is always an array
        const proxiesArray = Array.isArray(response.data) ? response.data : [];
        setProxies(proxiesArray as ExtendedProxy[]);
        const metrics = calculateHealthMetrics(proxiesArray as ExtendedProxy[]);
        setHealthMetrics(metrics);
        setLastRefresh(new Date());
      } else {
        toast({
          title: "Error Loading Proxy Data",
          description: response.message || "Failed to fetch proxy information",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching proxy data:', error);
      toast({
        title: "Network Error",
        description: "Failed to connect to proxy service",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [calculateHealthMetrics, toast]);

  /**
   * Run health checks on all proxies
   */
  const runHealthChecks = useCallback(async () => {
    if (healthCheckInProgress) return;
    
    setHealthCheckInProgress(true);
    
    try {
      const response = await testAllProxies();
      
      if (response.success === true) {
        toast({
          title: "Health Check Complete",
          description: "All proxies have been tested",
          variant: "default"
        });
        
        // Refresh data after health check
        await fetchProxyData(true);
      } else {
        toast({
          title: "Health Check Failed",
          description: response.message || "Failed to run health checks",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error running health checks:', error);
      toast({
        title: "Health Check Error",
        description: "Failed to complete health checks",
        variant: "destructive"
      });
    } finally {
      setHealthCheckInProgress(false);
    }
  }, [healthCheckInProgress, toast, fetchProxyData]);

  /**
   * Test a specific proxy
   */
  const testSpecificProxy = useCallback(async (proxyId: string) => {
    try {
      const response = await testProxy(proxyId);
      
      if (response.success === true && response.data) {
        // Update the specific proxy in our state
        setProxies(prev => prev.map(p =>
          p.id === proxyId ? response.data as ExtendedProxy : p
        ));
        
        // Recalculate metrics
        const updatedProxies = proxies.map(p =>
          p.id === proxyId ? response.data as ExtendedProxy : p
        );
        const metrics = calculateHealthMetrics(updatedProxies);
        setHealthMetrics(metrics);
        
        return response.data;
      } else {
        throw new Error(response.message || 'Test failed');
      }
    } catch (error) {
      console.error(`Error testing proxy ${proxyId}:`, error);
      throw error;
    }
  }, [proxies, calculateHealthMetrics]);

  /**
   * Get unhealthy proxies
   */
  const getUnhealthyProxies = useCallback((): ProxyHealthDetails[] => {
    return getProxyHealthDetails().filter(proxy => !proxy.isHealthy);
  }, [getProxyHealthDetails]);

  /**
   * Get proxy uptime percentage
   */
  const getProxyUptime = useCallback((proxyId: string): number => {
    const proxy = proxies.find(p => p.id === proxyId);
    if (!proxy) return 0;
    
    const successCount = proxy.successCount || 0;
    const failureCount = proxy.failureCount || 0;
    const totalTests = (typeof successCount === "number" ? successCount : parseInt(String(successCount)) || 0) + (typeof failureCount === "number" ? failureCount : parseInt(String(failureCount)) || 0);
    
    if (totalTests === 0) return 100; // Assume 100% if no tests
    
    return Math.round(((typeof successCount === "number" ? successCount : parseInt(String(successCount)) || 0) / totalTests) * 100);
  }, [proxies]);

  // 🚀 WEBSOCKET PUSH MODEL: Remove polling, use WebSocket events instead
  useEffect(() => {
    // Initial fetch only - no polling
    fetchProxyData();
    console.log('[useProxyHealth] Using WebSocket push model - no polling needed');
    
    // Future: WebSocket handler for proxy updates will trigger fetchProxyData
    // This removes the 30-second polling that was causing rate limiting
    return () => {}; // No cleanup needed since no polling
  }, [fetchProxyData]);

  // 🚀 WEBSOCKET PUSH MODEL: Health checks disabled - proxy health updates via WebSocket events
  // No polling needed - backend will push proxy health status changes in real-time
  useEffect(() => {
    // Future: Health check results will be received via WebSocket proxy_status_update messages
    // This eliminates the need for polling-based health checks
    console.log('[useProxyHealth] Health checks via WebSocket push model - no polling needed');
    return () => {}; // No cleanup needed
  }, []);

  return {
    // Data
    proxies,
    healthMetrics,
    lastRefresh,
    
    // Loading states
    isLoading,
    isRefreshing,
    healthCheckInProgress,
    
    // Actions
    refreshData: () => fetchProxyData(true),
    runHealthChecks,
    testSpecificProxy,
    
    // Utilities
    getProxyHealthDetails,
    getUnhealthyProxies,
    getProxyUptime,
    
    // Computed values
    isHealthy: healthMetrics ? healthMetrics.successRate > 80 : true,
    criticalIssues: healthMetrics ? healthMetrics.failedProxies > healthMetrics.totalProxies * 0.5 : false
  };
}
