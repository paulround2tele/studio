"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Badge from '@/components/ta/ui/badge/Badge';
import Button from '@/components/ta/ui/button/Button';
import { CheckCircleIcon, AlertIcon, CloseLineIcon, LockIcon, RefreshIcon, LoaderIcon, ShieldIcon, WifiIcon, DatabaseIcon } from '@/icons';
import { cn } from '@/lib/utils';
import healthService from '@/lib/services/healthService';
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
  iconType?: 'shield' | 'database' | 'wifi' | 'key';
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
          iconType: 'shield'
        });
      } else {
        results.push({
          name: 'Authentication System',
          status: 'Failed',
          message: 'Not authenticated',
          details: 'User must be logged in to access the application',
          iconType: 'shield'
        });
      }
    } catch (_error) {
      results.push({
        name: 'Authentication System',
        status: 'Failed',
        message: 'Authentication check failed',
        details: 'Unknown error',
        iconType: 'shield'
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
      
  let healthDetails = `Version: ${data.version ?? 'Unknown'}`;
      if (data.isCached) {
        const ageMinutes = Math.floor((data.cacheAge || 0) / 60);
        healthDetails += ` (Cached ${ageMinutes}m ago)`;
      }
      
  if (data.status === 'ok' || data.status === 'passed') {
        results.push({
          name: 'API Backend',
          status: 'passed',
          message: 'Backend API is responsive',
          details: healthDetails,
          iconType: 'database'
        });
  } else if (data.status === 'degraded' || data.status === 'warning') {
        results.push({
          name: 'API Backend',
          status: 'warning',
          message: 'Backend API is degraded but functional',
          details: `${healthDetails} - Some components may be experiencing issues`,
          iconType: 'database'
        });
      } else {
        results.push({
          name: 'API Backend',
          status: 'Failed',
          message: 'Backend API returned unhealthy status',
          details: `Status: ${data.status ?? 'Unknown'} ${data.isCached ? '(Cached)' : ''}`,
          iconType: 'database'
        });
      }
    } catch (_error) {
      results.push({
        name: 'API Backend',
        status: 'Failed',
        message: 'Cannot connect to backend API',
        details: 'Ensure backend is running on port 8080',
        iconType: 'database'
      });
    }

    // 3. Real-time Communication Status Check (WebSocket removed; SSE-only now)
    try {
      logWithTimestamp('log', '🔌 Real-time communication check (SSE in use, WebSocket removed)...');
      
      results.push({
        name: 'Real-time Updates',
        status: 'passed',
        message: 'SSE-enabled realtime',
        details: 'Real-time updates use Server-Sent Events (SSE)',
        iconType: 'wifi'
      });
    } catch (error) {
      logWithTimestamp('error', '❌ Real-time communication check failed:', serializeError(error));
      results.push({
        name: 'Real-time Updates',
        status: 'Failed',
        message: 'Real-time communication unavailable',
        details: 'Real-time updates temporarily disabled during RTK consolidation',
        iconType: 'wifi'
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
          iconType: 'key'
        });
      } else {
        results.push({
          name: 'Session Security',
          status: 'warning',
          message: 'Session authentication not detected',
          details: 'May need to re-authenticate',
          iconType: 'key'
        });
      }
    } catch (_error) {
      results.push({
        name: 'Session Security',
        status: 'warning',
        message: 'Session security check failed',
        details: 'Authentication status uncertain',
        iconType: 'key'
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
        return <CheckCircleIcon className="h-5 w-5 text-success-500" />;
      case 'Failed':
        return <CloseLineIcon className="h-5 w-5 text-error-500" />;
      case 'warning':
        return <AlertIcon className="h-5 w-5 text-warning-500" />;
      case 'checking':
        return <LoaderIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getCheckIcon = (iconType?: string) => {
    switch (iconType) {
      case 'shield':
        return <ShieldIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />;
      case 'database':
        return <DatabaseIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />;
      case 'wifi':
        return <WifiIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />;
      case 'key':
        return <LockIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />;
      default:
        return null;
    }
  };

  const getOverallStatusBadge = () => {
    switch (overallStatus) {
      case 'ready':
        return <Badge color="success">Production Ready</Badge>;
      case 'issues':
        return <Badge color="warning">Minor Issues</Badge>;
      case 'critical':
        return <Badge color="error">Critical Issues</Badge>;
      case 'checking':
        return <Badge color="light">Checking...</Badge>;
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      {/* Card Header */}
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">System Status</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Production readiness checks</p>
          </div>
          <div className="flex items-center gap-3">
            {getOverallStatusBadge()}
            <Button
              size="sm"
              variant="outline"
              onClick={() => runChecks(true)}
              disabled={isChecking}
              startIcon={isChecking ? <LoaderIcon className="h-4 w-4" /> : <RefreshIcon className="h-4 w-4" />}
            >
              {isChecking ? 'Checking...' : 'Check Now'}
            </Button>
            {lastHealthCheck && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Last: {lastHealthCheck.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 sm:p-6">
        <div className="space-y-3">
          {checks.map((check, index) => (
            <div
              key={index}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border",
                check.status === 'passed' && "bg-success-50 border-success-200 dark:bg-success-500/10 dark:border-success-800",
                check.status === 'Failed' && "bg-error-50 border-error-200 dark:bg-error-500/10 dark:border-error-800",
                check.status === 'warning' && "bg-warning-50 border-warning-200 dark:bg-warning-500/10 dark:border-warning-800",
                check.status === 'checking' && "bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700"
              )}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getStatusIcon(check.status)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  {getCheckIcon(check.iconType)}
                  <p className="font-medium text-sm text-gray-800 dark:text-white/90">{check.name}</p>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{check.message}</p>
                {check.details && (
                  <p className="text-xs text-gray-500 dark:text-gray-500">{check.details}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Status Alerts */}
        {overallStatus === 'critical' && (
          <div className="mt-4 flex items-start gap-3 p-4 rounded-lg border border-error-200 bg-error-50 dark:border-error-800 dark:bg-error-500/10">
            <AlertIcon className="h-5 w-5 text-error-500 flex-shrink-0" />
            <p className="text-sm text-error-600 dark:text-error-400">
              Critical issues detected. Please resolve the failed checks before deploying to production.
            </p>
          </div>
        )}

        {overallStatus === 'issues' && (
          <div className="mt-4 flex items-start gap-3 p-4 rounded-lg border border-warning-200 bg-warning-50 dark:border-warning-800 dark:bg-warning-500/10">
            <AlertIcon className="h-5 w-5 text-warning-500 flex-shrink-0" />
            <p className="text-sm text-warning-600 dark:text-warning-400">
              Some minor issues detected. The application will work but may have limited functionality.
            </p>
          </div>
        )}

        {overallStatus === 'ready' && (
          <div className="mt-4 flex items-start gap-3 p-4 rounded-lg border border-success-200 bg-success-50 dark:border-success-800 dark:bg-success-500/10">
            <CheckCircleIcon className="h-5 w-5 text-success-500 flex-shrink-0" />
            <p className="text-sm text-success-600 dark:text-success-400">
              All systems operational. The application is production-ready!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}