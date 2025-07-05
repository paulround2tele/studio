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
  const minLoadingTimeRef = useRef<NodeJS.Timeout | null>(null);

  // Ensure auth loading state gets cleared when loading operations complete
  const isSessionLoading = loadingStore.isOperationLoading(LOADING_OPERATIONS.SESSION_CHECK);
  
  // Force update auth loading state when session loading changes - but with minimum loading time
  useEffect(() => {
    if (!isSessionLoading && authState.isLoading) {
      // Minimum loading time to prevent flash - give time for cookies to be available
      if (minLoadingTimeRef.current) {
        clearTimeout(minLoadingTimeRef.current);
      }
      
      minLoadingTimeRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setAuthState(prev => ({
            ...prev,
            isLoading: false
          }));
        }
      }, 200); // 200ms minimum loading time to prevent flash
    }
  }, [isSessionLoading, authState.isLoading]);

  const checkSession = useCallback(async () => {
    // Prevent multiple simultaneous session checks
    if (sessionCheckStartedRef.current) {
      return;
    }

    sessionCheckStartedRef.current = true;
    
    try {
      // SIMPLE SESSION CHECK - just call the API, don't overthink it
      const user = await authService.getCurrentUser();

      if (user) {
        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false
        });
      } else {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false
        });
      }
    } catch (_error) {
      // On any error, just set as unauthenticated - don't make it complicated
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false
      });
    } finally {
      sessionCheckStartedRef.current = false;
    }
  }, []);

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
      if (minLoadingTimeRef.current) {
        clearTimeout(minLoadingTimeRef.current);
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
