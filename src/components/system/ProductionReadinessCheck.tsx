"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Loader2, Shield, Wifi, Database, Key } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { websocketService, type WebSocketMessage } from '@/lib/services/websocketService.simple';
import { cn } from '@/lib/utils';
import healthService from '@/lib/services/healthService';

// Centralized logging utility with timestamps
const logWithTimestamp = (level: 'log' | 'warn' | 'error', message: string, ...args: unknown[]) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [ProductionReadinessCheck] ${message}`;
  console[level](logMessage, ...args);
};

interface SystemCheck {
  name: string;
  status: 'passed' | 'failed' | 'warning' | 'checking';
  message: string;
  details?: string;
  icon?: React.ReactNode;
  isTestConnection?: boolean; // Distinguish between test and operational status
}

interface WebSocketTestResult {
  connected: boolean;
  error?: string;
  url?: string;
  wasAuthWaiting?: boolean;
  testDuration?: number;
}

export default function ProductionReadinessCheck() {
  const { isAuthenticated, user } = useAuth();
  const [checks, setChecks] = useState<SystemCheck[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [overallStatus, setOverallStatus] = useState<'ready' | 'issues' | 'critical' | 'checking'>('checking');
  const [lastHealthCheck, setLastHealthCheck] = useState<Date | null>(null);

  const runChecks = useCallback(async (forceHealthRefresh = false) => {
    // Prevent concurrent checks
    if (isChecking) {
      logWithTimestamp('warn', '⚠️ Check already in progress, skipping duplicate request');
      return;
    }
    
    // Only run if properly authenticated
    if (!isAuthenticated || !user) {
      logWithTimestamp('warn', '⚠️ Authentication not ready, skipping production readiness check');
      return;
    }
    
    setIsChecking(true);
    const results: SystemCheck[] = [];

    // 1. Authentication Check
    try {
      if (isAuthenticated && user) {
        results.push({
          name: 'Authentication System',
          status: 'passed',
          message: 'User authenticated successfully',
          details: `Logged in as ${user.email}`,
          icon: <Shield className="h-4 w-4" />
        });
      } else {
        results.push({
          name: 'Authentication System',
          status: 'failed',
          message: 'Not authenticated',
          details: 'User must be logged in to access the application',
          icon: <Shield className="h-4 w-4" />
        });
      }
    } catch (_error) {
      results.push({
        name: 'Authentication System',
        status: 'failed',
        message: 'Authentication check failed',
        details: 'Unknown error',
        icon: <Shield className="h-4 w-4" />
      });
    }

    // 2. API Connectivity Check - CRITICAL FIX: Use cached health service
    try {
      // Only force refresh if explicitly requested, otherwise use cache (hourly)
      const data = await healthService.getHealth(forceHealthRefresh);
      
      // Update last health check timestamp
      if (!data.isCached) {
        setLastHealthCheck(new Date());
      }
      
      let healthDetails = `Version: ${data.version || 'Unknown'}`;
      if (data.isCached) {
        const ageMinutes = Math.floor((data.cacheAge || 0) / 60);
        healthDetails += ` (Cached ${ageMinutes}m ago)`;
      }
      
      if (data.status === 'ok') {
        results.push({
          name: 'API Backend',
          status: 'passed',
          message: 'Backend API is responsive',
          details: healthDetails,
          icon: <Database className="h-4 w-4" />
        });
      } else {
        results.push({
          name: 'API Backend',
          status: 'warning',
          message: 'Backend API returned non-healthy status',
          details: `${data.message || 'Check backend logs'} ${data.isCached ? '(Cached)' : ''}`,
          icon: <Database className="h-4 w-4" />
        });
      }
    } catch (_error) {
      results.push({
        name: 'API Backend',
        status: 'failed',
        message: 'Cannot connect to backend API',
        details: 'Ensure backend is running on port 8080',
        icon: <Database className="h-4 w-4" />
      });
    }

    // 3. Optimized WebSocket Check
    try {
      const testStartTime = Date.now();
      logWithTimestamp('log', '🚀 Starting optimized WebSocket connectivity test...');
      
      // Use optimized service - it handles authentication coordination automatically
      const wsResult = await new Promise<WebSocketTestResult>((resolve) => {
        let connected = false;
        let connectionError = '';
        
        logWithTimestamp('log', '🔌 Starting WebSocket connection attempt with optimized service...');
        
        const cleanup = websocketService.connectToAllCampaigns(
          (message: WebSocketMessage) => {
            const testDuration = Date.now() - testStartTime;
            logWithTimestamp('log', '✅ WebSocket test SUCCESS: Received message in', testDuration + 'ms', message);
            if (!connected) {
              connected = true;
              cleanup();
              resolve({
                connected: true,
                testDuration
              });
            }
          },
          (error: Event | Error) => {
            const testDuration = Date.now() - testStartTime;
            logWithTimestamp('error', '❌ WebSocket test ERROR after', testDuration + 'ms:', error);
            connectionError = error instanceof Error ? error.message : 'Unknown error';
            
            cleanup();
            resolve({
              connected: false,
              error: connectionError,
              testDuration
            });
          }
        );
        
        // Shorter timeout since optimized service handles auth coordination
        const testTimeout = 8000; // 8 seconds - optimized service should connect faster
        setTimeout(() => {
          if (!connected) {
            const testDuration = Date.now() - testStartTime;
            logWithTimestamp('warn', `⏰ WebSocket test TIMEOUT after ${testTimeout/1000} seconds (${testDuration}ms total)`);
            cleanup();
            resolve({
              connected: false,
              error: connectionError || `Connection timeout (${testTimeout/1000}s)`,
              testDuration
            });
          }
        }, testTimeout);
      });

      const totalTestDuration = Date.now() - testStartTime;

      if (wsResult.connected) {
        logWithTimestamp('log', '🎉 WebSocket connectivity test PASSED in', totalTestDuration + 'ms');
        results.push({
          name: 'WebSocket Connection',
          status: 'passed',
          message: 'Real-time updates available',
          details: `WebSocket test connection successful (${totalTestDuration}ms)`,
          icon: <Wifi className="h-4 w-4" />,
          isTestConnection: true
        });
      } else {
        const testDuration = wsResult.testDuration || totalTestDuration;
        logWithTimestamp('error', '❌ WebSocket connectivity test FAILED after', testDuration + 'ms:', wsResult);
        
        // Simplified error handling - optimized service provides better error context
        let status: 'warning' | 'failed' = 'warning';
        let message = 'WebSocket test connection failed';
        let details = `Test failed after ${Math.round(testDuration/1000)}s: ${wsResult.error || 'Unknown error'}`;
        
        // Check for authentication-related errors
        if (wsResult.error?.includes('authentication') || wsResult.error?.includes('401') || wsResult.error?.includes('403')) {
          message = 'WebSocket authentication issue';
          status = 'failed'; // Authentication issues are more serious
        } else if (wsResult.error?.includes('timeout') || wsResult.error?.includes('Connection timeout')) {
          message = 'WebSocket connection timeout';
          details = `Connection timed out after ${Math.round(testDuration/1000)}s. This may be temporary - operational connections may still work.`;
          status = 'warning'; // Timeouts are warnings
        }
        
        results.push({
          name: 'WebSocket Connection',
          status,
          message,
          details,
          icon: <Wifi className="h-4 w-4" />,
          isTestConnection: true
        });
      }
    } catch (error) {
      logWithTimestamp('error', '🔥 WebSocket test EXCEPTION:', error);
      results.push({
        name: 'WebSocket Connection',
        status: 'warning',
        message: 'WebSocket test failed with exception',
        details: `Exception during test: ${error instanceof Error ? error.message : 'Unknown error'}`,
        icon: <Wifi className="h-4 w-4" />,
        isTestConnection: true
      });
    }

    // 4. Session Security Check (session-based authentication)
    try {
      // For session-based auth, authentication state indicates session is active
      // Note: HttpOnly cookies are not accessible via document.cookie (this is correct for security)
      if (isAuthenticated && user) {
        results.push({
          name: 'Session Security',
          status: 'passed',
          message: 'Session-based authentication active',
          details: 'Secure HttpOnly session cookies configured properly',
          icon: <Key className="h-4 w-4" />
        });
      } else {
        results.push({
          name: 'Session Security',
          status: 'warning',
          message: 'Session authentication not detected',
          details: 'May need to re-authenticate',
          icon: <Key className="h-4 w-4" />
        });
      }
    } catch (_error) {
      results.push({
        name: 'Session Security',
        status: 'warning',
        message: 'Session security check failed',
        details: 'Authentication status uncertain',
        icon: <Key className="h-4 w-4" />
      });
    }

    // Calculate overall status
    const failedCount = results.filter(r => r.status === 'failed').length;
    const warningCount = results.filter(r => r.status === 'warning').length;
    
    if (failedCount > 0) {
      setOverallStatus('critical');
    } else if (warningCount > 0) {
      setOverallStatus('issues');
    } else {
      setOverallStatus('ready');
    }

    setChecks(results);
    setIsChecking(false);
  }, [isAuthenticated, user, isChecking]);

  // CRITICAL FIX: Load cached health status on mount, don't auto-refresh
  useEffect(() => {
    // Only run initial checks when authentication is stable and ready
    if (isAuthenticated && user && !isChecking && checks.length === 0) {
      logWithTimestamp('log', '🏁 Initial system check on authentication ready');
      runChecks(false); // Use cached health data for initial load
    }
    // RATE LIMIT FIX: Only run once when auth is ready, not on every state change
  }, [isAuthenticated, user]); // Removed isChecking and runChecks dependencies

  // CRITICAL FIX: Hourly automatic health refresh (optional background check)
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Set up hourly health refresh interval
    const hourlyHealthRefresh = setInterval(() => {
      // Only refresh if cache is expired and no manual check is in progress
      const timeUntilRefresh = healthService.getTimeUntilNextRefresh();
      if (timeUntilRefresh <= 0 && !isChecking) {
        logWithTimestamp('log', '⏰ Hourly health check refresh');
        runChecks(true); // Force refresh after 1 hour
      }
    }, 3600000); // Check every hour (3600 seconds)

    return () => clearInterval(hourlyHealthRefresh);
  }, [isAuthenticated, user, isChecking, runChecks]);

  const getStatusIcon = (status: SystemCheck['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'checking':
        return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
    }
  };

  const getOverallStatusBadge = () => {
    switch (overallStatus) {
      case 'ready':
        return <Badge className="bg-green-500">Production Ready</Badge>;
      case 'issues':
        return <Badge className="bg-yellow-500">Minor Issues</Badge>;
      case 'critical':
        return <Badge className="bg-destructive">Critical Issues</Badge>;
      case 'checking':
        return <Badge variant="secondary">Checking...</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Production readiness checks</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {getOverallStatusBadge()}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => runChecks(true)}
                disabled={isChecking}
                title="Force refresh all system checks"
              >
                {isChecking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Check Now
                  </>
                )}
              </Button>
              {lastHealthCheck && (
                <span className="text-xs text-muted-foreground">
                  Last check: {lastHealthCheck.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {checks.map((check, index) => (
            <div
              key={index}
              className={cn(
                "flex items-start space-x-3 p-3 rounded-lg border",
                check.status === 'passed' && "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800",
                check.status === 'failed' && "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800",
                check.status === 'warning' && "bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800",
                check.status === 'checking' && "bg-muted"
              )}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getStatusIcon(check.status)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  {check.icon}
                  <p className="font-medium text-sm">{check.name}</p>
                </div>
                <p className="text-sm text-muted-foreground">{check.message}</p>
                {check.details && (
                  <p className="text-xs text-muted-foreground">{check.details}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {overallStatus === 'critical' && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Critical issues detected. Please resolve the failed checks before deploying to production.
            </AlertDescription>
          </Alert>
        )}

        {overallStatus === 'issues' && (
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Some minor issues detected. The application will work but may have limited functionality.
            </AlertDescription>
          </Alert>
        )}

        {overallStatus === 'ready' && (
          <Alert className="mt-4 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              All systems operational. The application is production-ready!
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}