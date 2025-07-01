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
  login: (credentials: { email: string; password: string; rememberMe?: boolean }) => Promise<{ success: boolean; error?: string }>;
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

  const checkSession = useCallback(async () => {
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

      // Only update state if component is still mounted
      if (!mountedRef.current) {
        logger.debug('AUTH_CONTEXT', 'Component unmounted, skipping session check result');
        return;
      }

      if (user) {
        logger.info('AUTH_CONTEXT', 'Session check successful - user authenticated', {
          userId: user.id
        });
        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false
        });
        loadingStore.stopLoading(LOADING_OPERATIONS.SESSION_CHECK, 'succeeded');
      } else {
        logger.debug('AUTH_CONTEXT', 'Session check completed - no valid session');
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false
        });
        loadingStore.stopLoading(LOADING_OPERATIONS.SESSION_CHECK, 'succeeded');
      }
    } catch (error) {
      // Only update state if component is still mounted
      if (!mountedRef.current) {
        logger.debug('AUTH_CONTEXT', 'Component unmounted, skipping session check error');
        return;
      }

      const errorMsg = error instanceof Error ? error.message : 'Session check failed';
      logger.warn('AUTH_CONTEXT', 'Session check failed', { error: errorMsg });
      
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false
      });
      
      loadingStore.stopLoading(LOADING_OPERATIONS.SESSION_CHECK, 'failed', errorMsg);
    } finally {
      sessionCheckRef.current = null;
    }
  }, [loadingStore]);

  // Check for existing session on mount with proper loading state management
  useEffect(() => {
    checkSession();
    
    // Cleanup on unmount
    return () => {
      mountedRef.current = false;
      if (sessionCheckRef.current) {
        sessionCheckRef.current.abort();
      }
    };
  }, [checkSession]);

  const login = useCallback(async (credentials: { email: string; password: string; rememberMe?: boolean }) => {
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
