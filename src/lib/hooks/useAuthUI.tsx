'use client';

import { useCallback, useState, useEffect } from 'react';
import { authApi } from '@/lib/api-client/client';
import { extractResponseData } from '@/lib/utils/apiResponseHelpers';
import type { components } from '@/lib/api-client/types';

// Type definitions using proper OpenAPI schema types
type User = components['schemas']['User'];
type LoginRequest = components['schemas']['LoginRequest'];

type LoginResult =
  | { success: true }
  | { success: false; error: string };

type AuthStatus = {
  isAuthenticated: boolean;
  user?: User;
};

// PERFORMANCE OPTIMIZATION: Global authentication cache to prevent redundant API calls
let globalAuthCache: {
  status: AuthStatus;
  timestamp: number;
  isLoading: boolean;
} | null = null;

const AUTH_CACHE_DURATION = 30000; // 30 seconds cache
const listeners = new Set<() => void>();

// Global auth cache manager
const authCache = {
  get: () => globalAuthCache,
  set: (status: AuthStatus, isLoading: boolean = false) => {
    globalAuthCache = {
      status,
      timestamp: Date.now(),
      isLoading
    };
    // Notify all listeners of auth state change
    listeners.forEach(listener => listener());
  },
  isValid: () => {
    if (!globalAuthCache) return false;
    return Date.now() - globalAuthCache.timestamp < AUTH_CACHE_DURATION;
  },
  clear: () => {
    globalAuthCache = null;
    listeners.forEach(listener => listener());
  },
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }
};

/**
 * OPTIMIZED Authentication hook with global caching to prevent redundant API calls
 * Uses shared auth state across all components for better performance
 */
export function useAuthUI() {
  // Authentication state management with cache initialization
  const [authStatus, setAuthStatus] = useState<AuthStatus>(() => {
    const cached = authCache.get();
    return cached?.status || { isAuthenticated: false };
  });
  const [isLoading, setIsLoading] = useState(() => {
    const cached = authCache.get();
    return cached?.isLoading ?? true;
  });
  const [isInitialized, setIsInitialized] = useState(() => {
    const cached = authCache.get();
    return cached ? true : false;
  });
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isLogoutLoading, setIsLogoutLoading] = useState(false);

  // Subscribe to global auth cache changes
  useEffect(() => {
    const unsubscribe = authCache.subscribe(() => {
      const cached = authCache.get();
      if (cached) {
        setAuthStatus(cached.status);
        setIsLoading(cached.isLoading);
        setIsInitialized(true);
      }
    });
    return unsubscribe;
  }, []);

  // OPTIMIZED: Check authentication status with caching
  const checkAuthStatus = useCallback(async (forceRefresh = false) => {
    const cached = authCache.get();
    
    // Use cached result if valid and not forcing refresh
    if (!forceRefresh && cached && authCache.isValid()) {
      console.log('[useAuthUI] Using cached auth status');
      setAuthStatus(cached.status);
      setIsLoading(cached.isLoading);
      setIsInitialized(true);
      return;
    }

    // Prevent multiple concurrent auth calls
    if (cached?.isLoading) {
      console.log('[useAuthUI] Auth check already in progress, waiting...');
      return;
    }

    console.log('[useAuthUI] Fetching fresh auth status from backend');
    authCache.set({ isAuthenticated: false }, true); // Mark as loading
    
    try {
      const response = await authApi.getCurrentUser();
      const userData = extractResponseData<User>(response);
      
      const newAuthStatus: AuthStatus = userData
        ? { isAuthenticated: true, user: userData }
        : { isAuthenticated: false };
      
      authCache.set(newAuthStatus, false);
      setAuthStatus(newAuthStatus);
    } catch (error) {
      console.error('[useAuthUI] Auth status check failed:', error);
      const failedAuthStatus: AuthStatus = { isAuthenticated: false };
      authCache.set(failedAuthStatus, false);
      setAuthStatus(failedAuthStatus);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, []);

  // Initialize authentication check on mount (with caching)
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // OPTIMIZED: Enhanced login with cache clearing
  const login = useCallback(async (credentials: { email: string; password: string }): Promise<LoginResult> => {
    setIsLoginLoading(true);
    try {
      // Use proper auto-generated API client
      const loginRequest: LoginRequest = {
        email: credentials.email,
        password: credentials.password
      };
      
      const response = await authApi.login(loginRequest);
      const loginData = extractResponseData(response);
      
      if (loginData) {
        // Clear cache and refresh auth status after successful login
        authCache.clear();
        await checkAuthStatus(true); // Force refresh
        // Backend sets session cookie - redirect to dashboard
        window.location.href = '/dashboard';
        return { success: true };
      } else {
        return { success: false, error: 'Login failed' };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Network error' };
    } finally {
      setIsLoginLoading(false);
    }
  }, [checkAuthStatus]);

  // OPTIMIZED: Enhanced logout with cache clearing
  const logout = useCallback(async () => {
    setIsLogoutLoading(true);
    try {
      // Use proper auto-generated API client
      await authApi.logout();
      // Clear cache and update auth status immediately
      authCache.clear();
      const loggedOutStatus: AuthStatus = { isAuthenticated: false };
      authCache.set(loggedOutStatus, false);
      setAuthStatus(loggedOutStatus);
      // Backend clears session cookie - redirect to login
      window.location.href = '/login';
    } catch (error) {
      console.error('[useAuthUI] Logout failed:', error);
      // Still clear cache and redirect even if logout fails
      authCache.clear();
      const loggedOutStatus: AuthStatus = { isAuthenticated: false };
      authCache.set(loggedOutStatus, false);
      setAuthStatus(loggedOutStatus);
      window.location.href = '/login';
    } finally {
      setIsLogoutLoading(false);
    }
  }, []);

  return {
    // Real authentication state from backend
    isAuthenticated: authStatus.isAuthenticated,
    isLoading,
    isInitialized,
    user: authStatus.user,
    
    // Auth actions
    login,
    logout,
    checkAuthStatus, // Expose for manual refresh
    
    // UI loading states
    isLoginLoading,
    isLogoutLoading,
    
    // Convenience properties for UI
    isReady: isInitialized,
  };
}

export default useAuthUI;