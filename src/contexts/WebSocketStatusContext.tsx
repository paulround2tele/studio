"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { websocketService } from '@/lib/services/websocketService.simple';
import { useAuth } from '@/contexts/AuthContext';
import { logWebSocket } from '@/lib/utils/logger';

export interface WebSocketConnectionStatus {
  connectionKey: string;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  isOperational: boolean; // True if this is a real operational connection
  isTestConnection: boolean; // True if this is just a test connection
  lastConnected?: Date;
  lastError?: string;
  retryCount?: number;
}

export interface WebSocketStatusState {
  connections: Record<string, WebSocketConnectionStatus>;
  overallStatus: 'healthy' | 'degraded' | 'offline';
  isTestingConnection: boolean;
  lastTestResult?: {
    success: boolean;
    timestamp: Date;
    duration: number;
    error?: string;
  };
}

interface WebSocketStatusContextType {
  status: WebSocketStatusState;
  testConnection: () => Promise<boolean>;
  getConnectionStatus: (connectionKey: string) => WebSocketConnectionStatus | null;
  isOperationallyConnected: () => boolean;
  refreshStatus: () => void;
}

const WebSocketStatusContext = createContext<WebSocketStatusContextType | null>(null);

export function useWebSocketStatus() {
  const context = useContext(WebSocketStatusContext);
  if (!context) {
    throw new Error('useWebSocketStatus must be used within a WebSocketStatusProvider');
  }
  return context;
}

export function WebSocketStatusProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<WebSocketStatusState>({
    connections: {},
    overallStatus: 'offline',
    isTestingConnection: false,
  });

  // Update connection status
  const _updateConnectionStatus = useCallback((
    connectionKey: string,
    updates: Partial<WebSocketConnectionStatus>
  ) => {
    setState(prev => {
      const existingConnection = prev.connections[connectionKey];
      const newConnection: WebSocketConnectionStatus = {
        connectionKey,
        status: 'disconnected',
        isOperational: false,
        isTestConnection: false,
        ...existingConnection,
        ...updates,
      };
      
      return {
        ...prev,
        connections: {
          ...prev.connections,
          [connectionKey]: newConnection,
        },
      };
    });
  }, []);

  // Calculate overall status based on connections
  const calculateOverallStatus = useCallback((connections: Record<string, WebSocketConnectionStatus>): 'healthy' | 'degraded' | 'offline' => {
    const operationalConnections = Object.values(connections).filter(conn => conn.isOperational);
    const connectedOperational = operationalConnections.filter(conn => conn.status === 'connected');
    
    if (operationalConnections.length === 0) {
      return 'offline';
    }
    
    if (connectedOperational.length === operationalConnections.length) {
      return 'healthy';
    } else if (connectedOperational.length > 0) {
      return 'degraded';
    } else {
      return 'offline';
    }
  }, []);

  // Test WebSocket connection with diagnostic integration
  const testConnection = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated) {
      logWebSocket.warn('Cannot test WebSocket connection - not authenticated');
      return false;
    }

    setState(prev => ({ ...prev, isTestingConnection: true }));
    const testStartTime = Date.now();
    
    try {
      // Removed complex diagnostic - simple approach
      logWebSocket.connect('Starting WebSocket test connection...');
      
      const testResult = await new Promise<boolean>((resolve) => {
        let connected = false;
        let errorDetails: string | undefined;
        
        const cleanup = websocketService.connectToAllCampaigns(
          (_message) => {
            if (!connected) {
              connected = true;
              clearTimeout(timeout);
              cleanup();
              resolve(true);
            }
          },
          (error) => {
            if (!connected) {
              connected = true;
              clearTimeout(timeout);
              cleanup();
              // Handle WebSocket errors more gracefully - don't log full error objects for common connection issues
              if (error instanceof Error) {
                errorDetails = error.message;
              } else if (error && typeof error === 'object' && 'type' in error && error.type === 'error') {
                errorDetails = 'WebSocket connection failed (network or server issue)';
              } else {
                errorDetails = 'WebSocket connection failed';
              }
              logWebSocket.warn('Test connection failed', { message: errorDetails });
              resolve(false);
            }
          }
        );
        
        // ENTERPRISE AUTH FIX: Match optimized service timeout (30s connection timeout)
        // Use 15s for tests to give enough time but not block UI too long
        const timeout = setTimeout(() => {
          if (!connected) {
            connected = true;
            cleanup();
            errorDetails = 'WebSocket test timed out (likely auth delay)';
            logWebSocket.warn(errorDetails);
            resolve(false);
          }
        }, 15000); // 15 second timeout for tests - matches user-reported timeout
      });

      const testDuration = Date.now() - testStartTime;
      const testTimestamp = new Date();

      // Simple success logging
      logWebSocket.connect(`Test completed in ${testDuration}ms`);

      if (testResult) {
        logWebSocket.success(`Test connection successful in ${testDuration}ms`);
        setState(prev => ({
          ...prev,
          isTestingConnection: false,
          lastTestResult: {
            success: true,
            timestamp: testTimestamp,
            duration: testDuration,
          },
        }));
      } else {
        setState(prev => ({
          ...prev,
          isTestingConnection: false,
          lastTestResult: {
            success: false,
            timestamp: testTimestamp,
            duration: testDuration,
            error: 'Connection test failed or timed out',
          },
        }));
      }

      return testResult;
    } catch (error) {
      const testDuration = Date.now() - testStartTime;
      let errorMessage: string;
      
      // Handle different error types more gracefully
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'type' in error && error.type === 'error') {
        errorMessage = 'WebSocket connection failed (network or server issue)';
      } else {
        errorMessage = 'WebSocket connection test failed';
      }
      
      // Use warn level for connection issues instead of error
      logWebSocket.warn(`Test failed in ${testDuration}ms: ${errorMessage}`);
      
      setState(prev => ({
        ...prev,
        isTestingConnection: false,
        lastTestResult: {
          success: false,
          timestamp: new Date(),
          duration: testDuration,
          error: errorMessage,
        },
      }));
      
      return false;
    }
  }, [isAuthenticated]);

  // PERFORMANCE OPTIMIZATION: Memoize connection status lookup to prevent unnecessary computations
  const getConnectionStatus = useCallback((connectionKey: string): WebSocketConnectionStatus | null => {
    return state.connections[connectionKey] || null;
  }, [state.connections]);

  // PERFORMANCE OPTIMIZATION: Memoize operational connection check
  const isOperationallyConnected = useCallback((): boolean => {
    const operationalConnections = Object.values(state.connections).filter(conn => conn.isOperational);
    return operationalConnections.some(conn => conn.status === 'connected');
  }, [state.connections]);

  // PERFORMANCE OPTIMIZATION: Memoize refresh status function
  // Only depend on calculateOverallStatus, not state.connections to prevent excessive re-creation
  const refreshStatus = useCallback(() => {
    const connectionStatuses = websocketService.getConnectionStatus();
    const newConnections: Record<string, WebSocketConnectionStatus> = {};
    
    // Capture current connections state to prevent stale closure
    setState(prevState => {
      Object.entries(connectionStatuses).forEach(([key, isConnected]) => {
        const existingConnection = prevState.connections[key];
        newConnections[key] = {
          connectionKey: key,
          status: isConnected ? 'connected' : 'disconnected',
          isOperational: key !== 'test-connection', // Test connections are not operational
          isTestConnection: key === 'test-connection',
          lastConnected: isConnected ? new Date() : existingConnection?.lastConnected,
          lastError: existingConnection?.lastError,
          retryCount: existingConnection?.retryCount || 0,
        };
      });

      return {
        ...prevState,
        connections: newConnections,
        overallStatus: calculateOverallStatus(newConnections),
      };
    });
  }, [calculateOverallStatus]);

  // PERFORMANCE OPTIMIZATION: Memoize context value to prevent unnecessary re-renders
  // This prevents cascade re-renders when WebSocket status updates every 5 seconds
  const value: WebSocketStatusContextType = useMemo(() => ({
    status: state,
    testConnection,
    getConnectionStatus,
    isOperationallyConnected,
    refreshStatus,
  }), [
    // State dependencies - only re-render when meaningful state changes occur
    state,
    // All functions are memoized with useCallback, providing stable references
    testConnection,
    getConnectionStatus,
    isOperationallyConnected,
    refreshStatus,
  ]);

  // Prevent hydration mismatch by ensuring client-side initialization
  useEffect(() => {
    setMounted(true);
  }, []);

  // Monitor WebSocket service status
  useEffect(() => {
    if (!mounted) return;
    
    // 🚀 WEBSOCKET PUSH MODEL: Reduced to 5 minutes (300s) for infrastructure monitoring only
    const interval = setInterval(refreshStatus, 300000); // Check every 5 minutes
    refreshStatus(); // Initial check
    
    return () => clearInterval(interval);
  }, [refreshStatus, mounted]);

  // Update overall status when connections change
  useEffect(() => {
    setState(prev => ({
      ...prev,
      overallStatus: calculateOverallStatus(prev.connections),
    }));
  }, [state.connections, calculateOverallStatus]);

  // Don't render context until mounted to prevent SSR issues
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <WebSocketStatusContext.Provider value={value}>
      {children}
    </WebSocketStatusContext.Provider>
  );
}