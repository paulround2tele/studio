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

  const checkSession = useCallback(async () => {
    // Prevent multiple simultaneous session checks
    if (sessionCheckStartedRef.current) {
      return;
    }

    sessionCheckStartedRef.current = true;
    
    try {
      console.log('[AuthContext] Checking session via backend cookie validation...');
      const user = await authService.getCurrentUser();

      if (user && user.id && user.email) {
        // Ensure user has required fields and set isActive to true by default
        const completeUser = {
          ...user,
          isActive: user.isActive !== undefined ? user.isActive : true
        };
        
        console.log('[AuthContext] Session valid, user authenticated:', {
          id: completeUser.id,
          email: completeUser.email,
          isActive: completeUser.isActive
        });
        
        setAuthState({
          user: completeUser as User,
          isAuthenticated: true,
          isLoading: false
        });
      } else {
        console.log('[AuthContext] Invalid or incomplete user data, treating as unauthenticated');
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false
        });
      }
    } catch (error) {
      console.warn('[AuthContext] Session check failed:', error);
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false
      });
    } finally {
      sessionCheckStartedRef.current = false;
    }
  }, []);

  // Check for existing session on mount AND handle page reload persistence
  useEffect(() => {
    // Only run session check once on mount
    if (!sessionCheckStartedRef.current) {
      console.log('[AuthContext] Component mounted, checking for existing session...');
      checkSession();
    }
    
    // Add visibility change listener to re-check session when tab becomes active
    // This helps with session persistence across browser refreshes and tab switches
    const handleVisibilityChange = () => {
      if (!document.hidden && !sessionCheckStartedRef.current) {
        console.log('[AuthContext] Tab became visible, re-checking session...');
        checkSession();
      }
    };

    // Add storage event listener to sync auth state across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_logout') {
        console.log('[AuthContext] Logout detected from another tab');
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleStorageChange);
    
    // Capture refs for cleanup to avoid stale reference warnings
    const currentSessionCheck = sessionCheckRef.current;
    const currentMinLoadingTime = minLoadingTimeRef.current;
    
    // Cleanup on unmount
    return () => {
      mountedRef.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorageChange);
      if (currentSessionCheck) {
        currentSessionCheck.abort();
      }
      if (currentMinLoadingTime) {
        clearTimeout(currentMinLoadingTime);
      }
    };
  }, [checkSession]); // Include checkSession dependency

  const login = useCallback(async (credentials: { email: string; password: string }) => {
    logger.info('AUTH_CONTEXT', 'Login attempt started', { email: credentials.email });
    
    try {
      const result = await authService.login(credentials);

      if (result.success && result.user) {
        logger.info('AUTH_CONTEXT', 'Login successful', { userId: result.user.id });
        setAuthState({
          user: result.user as User,
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
      // Signal logout to other tabs via localStorage
      localStorage.setItem('auth_logout', Date.now().toString());
      
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false
      });

      // Clean up the signal after a short delay
      setTimeout(() => {
        localStorage.removeItem('auth_logout');
      }, 1000);
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
