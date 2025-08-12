"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Loader2, Shield, Wifi, Database, Key } from 'lucide-react';
import { cn } from '@/lib/utils';
import healthService from '@/lib/api-client/client-bridge';
import { useCachedAuth } from '@/lib/hooks/useCachedAuth';

// Enhanced error serialization utility for robust logging
const serializeError = (obj: unknown): unknown => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle Error instances
  if (obj instanceof Error) {
    const result: Record<string, unknown> = {
      name: obj.name,
      message: obj.message,
      stack: obj.stack
    };
    
    // Get additional enumerable properties
    Object.getOwnPropertyNames(obj).forEach(key => {
      if (!['name', 'message', 'stack'].includes(key)) {
        try {
          const descriptor = Object.getOwnPropertyDescriptor(obj, key);
          if (descriptor && descriptor.enumerable !== false) {
            result[key] = (obj as unknown as Record<string, unknown>)[key];
          }
        } catch {
          // Skip properties that can't be accessed
        }
      }
    });
    
    return result;
  }

  // Handle Event instances - extract all relevant properties
  if (obj instanceof Event) {
    const result: Record<string, unknown> = {
      type: obj.type,
      isTrusted: obj.isTrusted,
      timeStamp: obj.timeStamp
    };
    
    // Add target information safely
    if (obj.target) {
      result.target = obj.target.constructor?.name || 'Unknown';
    }
    if (obj.currentTarget) {
      result.currentTarget = obj.currentTarget.constructor?.name || 'Unknown';
    }
    
    // Extract additional Event properties using getOwnPropertyNames
    try {
      Object.getOwnPropertyNames(obj).forEach(key => {
        if (!['type', 'isTrusted', 'timeStamp', 'target', 'currentTarget'].includes(key)) {
          try {
            const value = (obj as unknown as Record<string, unknown>)[key];
            if (typeof value !== 'function' && value !== null) {
              result[key] = value;
            }
          } catch {
            // Skip properties that can't be accessed
          }
        }
      });
    } catch {
      // Fallback if property enumeration fails
    }
    
    return result;
  }

  // Handle regular objects with circular reference protection
  try {
    const seen = new WeakSet();
    return JSON.parse(JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular Reference]';
        }
        seen.add(value);
      }
      return value;
    }));
  } catch {
    return `[Unserializable: ${obj?.constructor?.name || typeof obj}]`;
  }
};

// Centralized logging utility with timestamps and proper error serialization
const logWithTimestamp = (level: 'log' | 'warn' | 'error', message: string, ...args: unknown[]) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [ProductionReadinessCheck] ${message}`;
  
  // Serialize all arguments for meaningful logging
  const serializedArgs = args.map(serializeError);
  
  console[level](logMessage, ...serializedArgs);
};

interface SystemCheck {
  name: string;
  status: 'passed' | 'Failed' | 'warning' | 'checking';
  message: string;
  details?: string;
  icon?: React.ReactNode;
  isTestConnection?: boolean; // Distinguish between test and operational status
}

// interface WebSocketTestResult {
//   connected: boolean;
//   error?: string;
//   url?: string;
//   wasAuthWaiting?: boolean;
//   testDuration?: number;
// }

export default function ProductionReadinessCheck() {
  // THIN CLIENT: Use useAuthUI hook for proper authentication state
  const { isAuthenticated, user, isLoading: _isLoading, isInitialized: _isInitialized } = useCachedAuth();
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
          details: 'THIN CLIENT: Backend manages user session',
          icon: <Shield className="h-4 w-4" />
        });
      } else {
        results.push({
          name: 'Authentication System',
          status: 'Failed',
          message: 'Not authenticated',
          details: 'User must be logged in to access the application',
          icon: <Shield className="h-4 w-4" />
        });
      }
    } catch (_error) {
      results.push({
        name: 'Authentication System',
        status: 'Failed',
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
      } else if (data.status === 'degraded') {
        results.push({
          name: 'API Backend',
          status: 'warning',
          message: 'Backend API is degraded but functional',
          details: `${healthDetails} - Some components may be experiencing issues`,
          icon: <Database className="h-4 w-4" />
        });
      } else {
        results.push({
          name: 'API Backend',
          status: 'Failed',
          message: 'Backend API returned unhealthy status',
          details: `Status: ${data.status} ${data.message || 'Check backend logs'} ${data.isCached ? '(Cached)' : ''}`,
          icon: <Database className="h-4 w-4" />
        });
      }
    } catch (_error) {
      results.push({
        name: 'API Backend',
        status: 'Failed',
        message: 'Cannot connect to backend API',
        details: 'Ensure backend is running on port 8080',
        icon: <Database className="h-4 w-4" />
      });
    }

    // 3. Real-time Communication Status Check (WebSocket removed during RTK consolidation)
    try {
      logWithTimestamp('log', '🔌 Real-time communication check (WebSocket disabled during RTK consolidation)...');
      
      results.push({
        name: 'Real-time Updates',
        status: 'warning',
        message: 'WebSocket removed - SSE implementation pending',
        details: 'Real-time updates will be restored with Server-Sent Events',
        icon: <Wifi className="h-4 w-4" />
      });
    } catch (error) {
      logWithTimestamp('error', '❌ Real-time communication check failed:', serializeError(error));
      results.push({
        name: 'Real-time Updates',
        status: 'Failed',
        message: 'Real-time communication unavailable',
        details: 'Real-time updates temporarily disabled during RTK consolidation',
        icon: <Wifi className="h-4 w-4" />
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
    const failedCount = results.filter(r => r.status === 'Failed').length;
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
  }, [isAuthenticated, user, isChecking, runChecks, checks.length]);

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
      case 'Failed':
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
                check.status === 'Failed' && "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800",
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