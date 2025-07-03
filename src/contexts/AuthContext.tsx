'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { User } from '@/lib/types';
import { authService } from '@/lib/services/authService';
import { useLoadingStore, LOADING_OPERATIONS } from '@/lib/stores/loadingStore';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (credentials: { email: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  setAuthState: (state: AuthState) => void;
  // Compatibility properties for existing code
  isInitialized: boolean;
  changePassword?: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  validatePassword?: (password: string) => Promise<{ isValid: boolean; errors?: string[] }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true
  });

  const loadingStore = useLoadingStore();
  const sessionCheckRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const sessionCheckStartedRef = useRef(false);

  // Ensure auth loading state gets cleared when loading operations complete
  const isSessionLoading = loadingStore.isOperationLoading(LOADING_OPERATIONS.SESSION_CHECK);
  
  // Force update auth loading state when session loading changes
  useEffect(() => {
    if (!isSessionLoading && authState.isLoading) {
      // Session check completed but auth state still loading - force update
      setAuthState(prev => ({
        ...prev,
        isLoading: false
      }));
    }
  }, [isSessionLoading, authState.isLoading]);

  const checkSession = useCallback(async () => {
    // Prevent multiple simultaneous session checks
    if (sessionCheckStartedRef.current) {
      logger.debug('AUTH_CONTEXT', 'Session check already in progress, skipping');
      return;
    }

    sessionCheckStartedRef.current = true;
    logger.debug('AUTH_CONTEXT', 'Starting session check');
    
    // Cancel any existing session check
    if (sessionCheckRef.current) {
      sessionCheckRef.current.abort();
    }
    
    // Create new abort controller for this session check
    sessionCheckRef.current = new AbortController();
    
    // Start loading operation
    loadingStore.startLoading(
      LOADING_OPERATIONS.SESSION_CHECK,
      'Checking session...',
      {
        timeout: 15000, // 15 second timeout
        showSpinner: false,
        blockUI: false
      }
    );

    try {
      const user = await authService.getCurrentUser();

      if (user) {
        logger.info('AUTH_CONTEXT', 'Session check successful - user authenticated', {
          userId: user.id
        });
        
        // Only update state if component is still mounted
        if (mountedRef.current) {
          setAuthState({
            user,
            isAuthenticated: true,
            isLoading: false
          });
        } else {
          logger.debug('AUTH_CONTEXT', 'Component unmounted, skipping session check state update');
        }
        
        loadingStore.stopLoading(LOADING_OPERATIONS.SESSION_CHECK, 'succeeded');
      } else {
        logger.debug('AUTH_CONTEXT', 'Session check completed - no valid session');
        
        // Only update state if component is still mounted
        if (mountedRef.current) {
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false
          });
        } else {
          logger.debug('AUTH_CONTEXT', 'Component unmounted, skipping session check state update');
        }
        
        loadingStore.stopLoading(LOADING_OPERATIONS.SESSION_CHECK, 'succeeded');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Session check failed';
      logger.warn('AUTH_CONTEXT', 'Session check failed', { error: errorMsg });
      
      // Only update state if component is still mounted
      if (mountedRef.current) {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false
        });
      } else {
        logger.debug('AUTH_CONTEXT', 'Component unmounted, skipping session check error state update');
      }
      
      // Always stop loading operation, even if component unmounted
      loadingStore.stopLoading(LOADING_OPERATIONS.SESSION_CHECK, 'failed', errorMsg);
    } finally {
      sessionCheckRef.current = null;
      sessionCheckStartedRef.current = false;
    }
  }, [loadingStore]);

  // Check for existing session on mount ONLY - no dependencies to prevent infinite loops
  useEffect(() => {
    // Only run session check once on mount
    if (!sessionCheckStartedRef.current) {
      checkSession();
    }
    
    // Cleanup on unmount
    return () => {
      mountedRef.current = false;
      if (sessionCheckRef.current) {
        sessionCheckRef.current.abort();
      }
    };
  }, []); // FIXED: Empty dependency array to prevent infinite loop

  const login = useCallback(async (credentials: { email: string; password: string }) => {
    logger.info('AUTH_CONTEXT', 'Login attempt started', { email: credentials.email });
    
    try {
      const result = await authService.login(credentials);

      if (result.success && result.user) {
        logger.info('AUTH_CONTEXT', 'Login successful', { userId: result.user.id });
        setAuthState({
          user: result.user,
          isAuthenticated: true,
          isLoading: false
        });
        return { success: true };
      } else {
        logger.warn('AUTH_CONTEXT', 'Login failed', { error: result.error });
        return {
          success: false,
          error: result.error || 'Login failed'
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Network error. Please try again.';
      logger.error('AUTH_CONTEXT', 'Login error', { error: errorMsg });
      return {
        success: false,
        error: errorMsg
      };
    }
  }, []);

  const logout = useCallback(async () => {
    logger.info('AUTH_CONTEXT', 'Logout started');
    
    try {
      await authService.logout();
      logger.info('AUTH_CONTEXT', 'Logout successful');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Logout error';
      logger.error('AUTH_CONTEXT', 'Logout error', { error: errorMsg });
    } finally {
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false
      });
    }
  }, []);

  const setAuthStateExternal = useCallback((state: AuthState) => {
    setAuthState(state);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    return await authService.changePassword(currentPassword, newPassword);
  }, []);

  const value: AuthContextType = {
    ...authState,
    login,
    logout,
    setAuthState: setAuthStateExternal,
    isInitialized: !authState.isLoading,
    changePassword,
    validatePassword: async () => ({ isValid: true }) // Simple placeholder
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
