// src/components/proxies/ProxyTesting.tsx
// Advanced proxy testing functionality with health monitoring

"use client";

import { useState, useCallback, useMemo } from 'react';
import Button from '@/components/ta/ui/button/Button';
import Badge from '@/components/ta/ui/badge/Badge';
import Input from '@/components/ta/form/input/InputField';
import Label from '@/components/ta/form/Label';
import SelectAdapter from '@/components/ta/adapters/SelectAdapter';
import Switch from '@/components/ta/form/switch/Switch';
import { 
  TestTubeIcon, 
  PlayIcon, 
  StopIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  WifiIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ActivityIcon,
  LoaderIcon
} from '@/icons';
import type { Proxy as ProxyType } from '@/lib/api-client/models/proxy';
import { useTestProxyMutation } from '@/store/api/proxyApi';
import { useToast } from '@/hooks/use-toast';
import { useProxyHealth } from '@/lib/hooks/useProxyHealth';

export interface ProxyTestingProps {
  proxies: ProxyType[];
  onProxiesUpdate: () => void;
  disabled?: boolean;
}

interface TestResult {
  proxyId: string;
  success: boolean;
  responseTime: number | null;
  error?: string;
  timestamp: Date;
}

interface TestSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  totalProxies: number;
  completedTests: number;
  successfulTests: number;
  failedTests: number;
  results: TestResult[];
  isRunning: boolean;
}

export function ProxyTesting({ proxies, onProxiesUpdate, disabled = false }: ProxyTestingProps) {
  const { toast } = useToast();
  const [testProxy] = useTestProxyMutation();
  const { 
    healthMetrics, 
    runHealthChecks,
    healthCheckInProgress 
  } = useProxyHealth({
  // Realtime note: SSE is the standard push model elsewhere; this component does not rely on realtime push
    enableHealthChecks: false,
    healthCheckInterval: 3600000 // 1 hour (minimal health checks)
  });

  const [currentSession, setCurrentSession] = useState<TestSession | null>(null);
  const [testUrl, setTestUrl] = useState('https://httpbin.org/ip');
  const [testTimeout, setTestTimeout] = useState(10);
  const [parallelTests, setParallelTests] = useState(3);
  const [continuousMode, setContinuousMode] = useState(false);
  const [testInterval, setTestInterval] = useState(60);
  const [selectedProxyIds, setSelectedProxyIds] = useState<Set<string>>(new Set());

  // Memoized options for parallel tests dropdown
  const parallelTestOptions = useMemo(() => [
    { value: '1', label: '1 (Sequential)' },
    { value: '3', label: '3 (Recommended)' },
    { value: '5', label: '5 (Fast)' },
    { value: '10', label: '10 (Very Fast)' },
  ], []);

  /**
   * Start testing selected proxies or all proxies
   */
  const handleStartTesting = useCallback(async () => {
    const proxiesToTest = selectedProxyIds.size > 0 
      ? proxies.filter(p => p.id && selectedProxyIds.has(p.id))
      : proxies;

    if (proxiesToTest.length === 0) {
      toast({
        title: "No Proxies to Test",
        description: "Please ensure you have proxies configured.",
        variant: "destructive"
      });
      return;
    }

    const sessionId = `test-${Date.now()}`;
    const newSession: TestSession = {
      id: sessionId,
      startTime: new Date(),
      totalProxies: proxiesToTest.length,
      completedTests: 0,
      successfulTests: 0,
      failedTests: 0,
      results: [],
      isRunning: true
    };

    setCurrentSession(newSession);

    try {
      // Run tests in parallel batches
      const batches = [];
      for (let i = 0; i < proxiesToTest.length; i += parallelTests) {
        batches.push(proxiesToTest.slice(i, i + parallelTests));
      }

      for (const batch of batches) {
        const batchPromises = batch.map(proxy => testSingleProxy(proxy, sessionId));
        await Promise.allSettled(batchPromises);
        
        // Check if session was cancelled
        if (!currentSession?.isRunning) break;
      }

      // Complete session
      setCurrentSession(prev => prev ? {
        ...prev,
        endTime: new Date(),
        isRunning: false
      } : null);

      toast({
        title: "Testing Complete",
        description: `Tested ${newSession.totalProxies} proxies. ${newSession.successfulTests} successful, ${newSession.failedTests} failed.`,
        variant: newSession.failedTests === 0 ? "default" : "destructive"
      });

      // Refresh proxy data
      onProxiesUpdate();

    } catch (error) {
      console.error('Testing session failed:', error);
      toast({
        title: "Testing Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
      
      setCurrentSession(prev => prev ? {
        ...prev,
        endTime: new Date(),
        isRunning: false
      } : null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proxies, selectedProxyIds, parallelTests, currentSession?.isRunning, toast, onProxiesUpdate]);

  /**
   * Test a single proxy
   */
  const testSingleProxy = useCallback(async (proxy: ProxyType, sessionId: string): Promise<void> => {
    const startTime = Date.now();
    
    try {
      if (!proxy.id) return;
      const response = await testProxy(proxy.id);
      const responseTime = Date.now() - startTime;
      
      const result: TestResult = {
        proxyId: proxy.id || '',
        success: 'data' in response && !response.error,
        responseTime,
        error: 'error' in response && response.error ? 'Test failed' : undefined,
        timestamp: new Date()
      };

      // Update session
      setCurrentSession(prev => {
        if (!prev || prev.id !== sessionId) return prev;
        
        return {
          ...prev,
          completedTests: prev.completedTests + 1,
          successfulTests: prev.successfulTests + (result.success ? 1 : 0),
          failedTests: prev.failedTests + (result.success ? 0 : 1),
          results: [...prev.results, result]
        };
      });

    } catch (error) {
      const result: TestResult = {
        proxyId: proxy.id || '',
        success: false,
        responseTime: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };

      setCurrentSession(prev => {
        if (!prev || prev.id !== sessionId) return prev;
        
        return {
          ...prev,
          completedTests: prev.completedTests + 1,
          failedTests: prev.failedTests + 1,
          results: [...prev.results, result]
        };
      });
    }
  }, [testProxy]);

  /**
   * Stop current testing session
   */
  const handleStopTesting = useCallback(() => {
    setCurrentSession(prev => prev ? {
      ...prev,
      endTime: new Date(),
      isRunning: false
    } : null);
    
    toast({
      title: "Testing Stopped",
      description: "Current testing session has been cancelled.",
      variant: "default"
    });
  }, [toast]);

  /**
   * Toggle proxy selection
   */
  const toggleProxySelection = useCallback((proxyId: string) => {
    setSelectedProxyIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(proxyId)) {
        newSet.delete(proxyId);
      } else {
        newSet.add(proxyId);
      }
      return newSet;
    });
  }, []);

  /**
   * Select all/none proxies
   */
  const toggleSelectAll = useCallback(() => {
    if (selectedProxyIds.size === proxies.length) {
      setSelectedProxyIds(new Set());
    } else {
      setSelectedProxyIds(new Set(proxies.map(p => p.id as string).filter(id => !!id)));
    }
  }, [selectedProxyIds.size, proxies]);

  const progressPercentage = currentSession 
    ? Math.round((currentSession.completedTests / currentSession.totalProxies) * 100)
    : 0;

  const averageResponseTime = currentSession?.results && currentSession.results.length > 0
    ? currentSession.results
        .filter(r => r.responseTime !== null)
        .reduce((sum, r) => sum + (r.responseTime || 0), 0) / 
        Math.max(1, currentSession.results.filter(r => r.responseTime !== null).length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Testing Configuration */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 flex items-center gap-2">
            <TestTubeIcon className="h-5 w-5 text-brand-500" />
            Proxy Testing Configuration
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure and run comprehensive proxy tests with health monitoring.
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="test-url">Test URL</Label>
              <Input
                id="test-url"
                defaultValue={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                placeholder="https://httpbin.org/ip"
                disabled={disabled || currentSession?.isRunning}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="test-timeout">Timeout (seconds)</Label>
              <Input
                id="test-timeout"
                type="number"
                defaultValue={testTimeout}
                onChange={(e) => setTestTimeout(Number(e.target.value))}
                min="1"
                max="60"
                disabled={disabled || currentSession?.isRunning}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="parallel-tests">Parallel Tests</Label>
              <SelectAdapter
                options={parallelTestOptions}
                value={parallelTests.toString()}
                onChange={(value) => setParallelTests(Number(value))}
                disabled={disabled || currentSession?.isRunning}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="test-interval">Continuous Interval (seconds)</Label>
              <Input
                id="test-interval"
                type="number"
                defaultValue={testInterval}
                onChange={(e) => setTestInterval(Number(e.target.value))}
                min="30"
                max="3600"
                disabled={disabled || !continuousMode}
              />
            </div>
          </div>

          <Switch
            label="Continuous Testing Mode"
            defaultChecked={continuousMode}
            onChange={setContinuousMode}
            disabled={disabled || currentSession?.isRunning}
          />

          <div className="flex gap-2">
            <Button
              onClick={handleStartTesting}
              disabled={disabled || currentSession?.isRunning}
              className="flex-1"
              startIcon={currentSession?.isRunning ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <PlayIcon className="h-4 w-4" />}
            >
              {currentSession?.isRunning ? 'Testing...' : 'Start Testing'}
            </Button>
            
            {currentSession?.isRunning && (
              <Button
                variant="outline"
                onClick={handleStopTesting}
                className="text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10"
                startIcon={<StopIcon className="h-4 w-4" />}
              >
                Stop
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={runHealthChecks}
              disabled={disabled || healthCheckInProgress}
              startIcon={healthCheckInProgress ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <ActivityIcon className="h-4 w-4" />}
            >
              Health Check
            </Button>
          </div>
        </div>
      </div>

      {/* Testing Progress */}
      {currentSession && (
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 flex items-center gap-2">
              <ClockIcon className="h-5 w-5" />
              Testing Progress
            </h3>
            <Badge color={currentSession.isRunning ? "primary" : "light"}>
              {currentSession.isRunning ? "Running" : "Completed"}
            </Badge>
          </div>
          <div className="p-6 space-y-4">
            {/* Inline TailAdmin progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
              <div 
                className="bg-brand-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-800 dark:text-white/90">{currentSession.completedTests}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-success-600">{currentSession.successfulTests}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Successful</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-error-600">{currentSession.failedTests}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Failed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800 dark:text-white/90">{Math.round(averageResponseTime)}ms</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Avg Response</div>
              </div>
            </div>
            
            {currentSession.results.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-800 dark:text-white/90">Recent Results</h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {currentSession.results
                    .slice(-10)
                    .reverse()
                    .map((result, index) => {
                      const proxy = proxies.find(p => p.id === result.proxyId);
                      return (
                        <div
                          key={`${result.proxyId}-${index}`}
                          className="flex items-center justify-between p-2 bg-gray-100 dark:bg-white/[0.03] rounded text-sm"
                        >
                          <span className="flex items-center gap-2">
                            {result.success ? (
                              <CheckCircleIcon className="h-4 w-4 text-success-500" />
                            ) : (
                              <XCircleIcon className="h-4 w-4 text-error-500" />
                            )}
                            {proxy?.address || result.proxyId}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">
                            {result.responseTime ? `${result.responseTime}ms` : 'Failed'}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Health Metrics */}
      {healthMetrics && (
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 flex items-center gap-2">
              <ActivityIcon className="h-5 w-5 text-brand-500" />
              Health Metrics
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-800 dark:text-white/90">{healthMetrics.totalProxies}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Total Proxies</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-success-600">{healthMetrics.activeProxies}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Active</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800 dark:text-white/90">{healthMetrics.successRate}%</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                  {healthMetrics.successRate >= 80 ? (
                    <TrendingUpIcon className="h-3 w-3 text-success-500" />
                  ) : (
                    <TrendingDownIcon className="h-3 w-3 text-error-500" />
                  )}
                  Success Rate
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800 dark:text-white/90">{healthMetrics.averageResponseTime}ms</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Avg Response</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Proxy Selection */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 flex items-center gap-2">
              <WifiIcon className="h-5 w-5 text-brand-500" />
              Proxy Selection
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Select specific proxies to test, or leave empty to test all proxies.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSelectAll}
            disabled={disabled || proxies.length === 0}
          >
            {selectedProxyIds.size === proxies.length ? 'Deselect All' : 'Select All'}
          </Button>
        </div>
        <div className="p-6">
          {proxies.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">No proxies configured</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {proxies.map(proxy => (
                <div
                  key={proxy.id}
                  className={`flex items-center space-x-2 p-2 rounded border cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03] ${
                    (proxy.id && selectedProxyIds.has(proxy.id)) ? 'bg-brand-50 dark:bg-brand-500/10 border-brand-500' : 'border-gray-200 dark:border-gray-700'
                  }`}
                  onClick={() => proxy.id && toggleProxySelection(proxy.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-gray-800 dark:text-white/90">{proxy.address}</p>
                    <div className="flex items-center gap-1">
                      <Badge
                        color={proxy.isEnabled ? (proxy.isHealthy ? 'success' : 'error') : 'light'}
                        size="sm"
                      >
                        {proxy.isEnabled ? (proxy.isHealthy ? 'Active' : 'Failed') : 'Disabled'}
                      </Badge>
                      <Badge color="light" size="sm">
                        {proxy.protocol}
                      </Badge>
                      {proxy.successCount && proxy.failureCount && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {Number(proxy.successCount)}/{Number(proxy.failureCount)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
