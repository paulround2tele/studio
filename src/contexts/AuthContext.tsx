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
  // Initialize auth state from localStorage if available
  const [authState, setAuthState] = useState<AuthState>(() => {
    // Try to restore auth state from localStorage on initial load
    if (typeof window !== 'undefined') {
      try {
        const storedAuth = localStorage.getItem('auth_state');
        if (storedAuth) {
          const parsed = JSON.parse(storedAuth);
          console.log('[AuthContext] RESTORE: Found stored auth state:', {
            hasUser: !!parsed.user,
            userId: parsed.user?.id,
            timestamp: new Date().toISOString()
          });
          return {
            user: parsed.user,
            isAuthenticated: !!parsed.user && !!parsed.user.id,
            isLoading: true // Still need to validate with backend
          };
        }
      } catch (error) {
        console.warn('[AuthContext] RESTORE: Failed to parse stored auth state:', error);
        localStorage.removeItem('auth_state');
      }
    }
    
    return {
      user: null,
      isAuthenticated: false,
      isLoading: true
    };
  });

  // DIAGNOSTIC: Track auth state changes and persist to localStorage
  useEffect(() => {
    console.log('[AuthContext] AUTH STATE CHANGE:', {
      timestamp: new Date().toISOString(),
      hasUser: !!authState.user,
      userId: authState.user?.id,
      isAuthenticated: authState.isAuthenticated,
      isLoading: authState.isLoading,
      userEmail: authState.user?.email,
      location: window.location.pathname,
      referrer: document.referrer
    });
    
    // Persist auth state to localStorage for navigation persistence
    if (typeof window !== 'undefined') {
      if (authState.user && authState.isAuthenticated) {
        localStorage.setItem('auth_state', JSON.stringify({
          user: authState.user,
          timestamp: Date.now()
        }));
        console.log('[AuthContext] PERSIST: Stored auth state to localStorage');
      } else if (!authState.isLoading) {
        // Only clear when not loading to avoid clearing during initialization
        localStorage.removeItem('auth_state');
        console.log('[AuthContext] PERSIST: Cleared auth state from localStorage');
      }
    }
  }, [authState]);

  const loadingStore = useLoadingStore();
  const sessionCheckRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const sessionCheckStartedRef = useRef(false);
  const minLoadingTimeRef = useRef<NodeJS.Timeout | null>(null);
  const lastSessionCheckRef = useRef<number>(0);
  const sessionCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const checkSession = useCallback(async (force = false, skipIfNoStoredAuth = true) => {
    const now = Date.now();
    const timeSinceLastCheck = now - lastSessionCheckRef.current;
    const MIN_CHECK_INTERVAL = 2000; // Minimum 2 seconds between checks

    console.log('[AuthContext] DIAGNOSTIC: checkSession called', {
      timestamp: new Date().toISOString(),
      sessionCheckStarted: sessionCheckStartedRef.current,
      currentPath: window.location.pathname,
      timeSinceLastCheck,
      force,
      skipIfNoStoredAuth
    });

    // Check if we have any indication that user might be authenticated
    const hasStoredAuth = typeof window !== 'undefined' && localStorage.getItem('auth_state');
    const hasCurrentUser = !!authState.user;
    const shouldSkipCheck = skipIfNoStoredAuth && !hasStoredAuth && !hasCurrentUser && !force;

    if (shouldSkipCheck) {
      console.log('[AuthContext] DIAGNOSTIC: Skipping session check - no stored auth data and not forced');
      // Set loading to false for fresh sessions without any auth indicators
      if (authState.isLoading && !authState.user) {
        setAuthState(prev => ({
          ...prev,
          isLoading: false
        }));
      }
      return;
    }

    // Rate limiting: Prevent excessive session checks
    if (!force && timeSinceLastCheck < MIN_CHECK_INTERVAL) {
      console.log('[AuthContext] DIAGNOSTIC: Rate limited - too soon since last check, skipping');
      return;
    }

    // Prevent multiple simultaneous session checks
    if (sessionCheckStartedRef.current) {
      console.log('[AuthContext] DIAGNOSTIC: Session check already in progress, skipping');
      return;
    }

    lastSessionCheckRef.current = now;
    sessionCheckStartedRef.current = true;
    console.log('[AuthContext] DIAGNOSTIC: Starting session check...', {
      hasStoredAuth: !!hasStoredAuth,
      hasCurrentUser,
      reason: force ? 'forced' : 'has auth indicators'
    });
    
    try {
      console.log('[AuthContext] Checking session via backend cookie validation...');
      const user = await authService.getCurrentUser();
      console.log('[AuthContext] DIAGNOSTIC: getCurrentUser result:', {
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
        hasId: !!(user?.id),
        hasEmail: !!(user?.email)
      });

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
        
        if (mountedRef.current) {
          setAuthState({
            user: completeUser as User,
            isAuthenticated: true,
            isLoading: false
          });
          console.log('[AuthContext] DIAGNOSTIC: Auth state updated to authenticated');
        } else {
          console.log('[AuthContext] DIAGNOSTIC: Component unmounted but user authenticated');
        }
      } else {
        console.log('[AuthContext] Invalid or incomplete user data, treating as unauthenticated');
        // Implement grace period: don't immediately clear auth state for stored sessions
        if (hasStoredAuth || hasCurrentUser) {
          console.log('[AuthContext] DIAGNOSTIC: Backend validation failed but preserving stored auth state with grace period');
          // Keep the current auth state but set loading to false
          setAuthState(prev => ({
            ...prev,
            isLoading: false
          }));
        } else {
          console.log('[AuthContext] DIAGNOSTIC: No stored auth, just setting loading to false');
          setAuthState(prev => ({
            ...prev,
            isLoading: false
          }));
        }
      }
    } catch (error) {
      console.warn('[AuthContext] Session check failed:', error);
      
      // Implement grace period: preserve stored auth state during temporary backend failures
      if (hasStoredAuth || hasCurrentUser) {
        console.log('[AuthContext] DIAGNOSTIC: Backend error but preserving stored auth state with grace period');
        // Keep the current auth state but set loading to false
        setAuthState(prev => ({
          ...prev,
          isLoading: false
        }));
      } else {
        console.log('[AuthContext] DIAGNOSTIC: Backend error but no auth indicators - just stop loading');
        setAuthState(prev => ({
          ...prev,
          isLoading: false
        }));
      }
      
      if (!mountedRef.current) {
        console.log('[AuthContext] DIAGNOSTIC: Component unmounted but error state handled');
      }
    } finally {
      sessionCheckStartedRef.current = false;
      console.log('[AuthContext] DIAGNOSTIC: Session check completed, flag reset');
    }
  }, [authState.user, authState.isLoading]); // Include dependencies we actually use

  // Check for existing session on mount AND handle page reload persistence
  useEffect(() => {
    // Only run session check once on mount unless we're navigating with existing auth
    if (!sessionCheckStartedRef.current) {
      console.log('[AuthContext] Component mounted, checking for existing session...');
      console.log('[AuthContext] Current auth state on mount:', {
        hasUser: !!authState.user,
        isAuthenticated: authState.isAuthenticated,
        isLoading: authState.isLoading
      });
      
      // If we already have a user (from previous context), preserve it but still validate
      if (authState.user && authState.isAuthenticated) {
        console.log('[AuthContext] Preserving existing auth state during navigation');
        // Still validate the session but don't clear auth state immediately
        setTimeout(() => checkSession(true, false), 100); // Force validation for existing users
      } else {
        // For fresh sessions, only check if we have stored auth indicators
        checkSession(false, true); // Use smart checking - don't force unnecessary /me calls
      }
    }
    
    // Add debounced visibility change listener to re-check session when tab becomes active
    // This helps with session persistence across browser refreshes and tab switches
    const handleVisibilityChange = () => {
      if (!document.hidden && !sessionCheckStartedRef.current) {
        console.log('[AuthContext] Tab became visible, scheduling session check...');
        
        // Clear any existing timeout
        if (sessionCheckTimeoutRef.current) {
          clearTimeout(sessionCheckTimeoutRef.current);
        }
        
        // Debounce session check by 1 second
        sessionCheckTimeoutRef.current = setTimeout(() => {
          checkSession(false, false); // Check on visibility change, but only if we have auth indicators
        }, 1000);
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
    const currentSessionCheckTimeout = sessionCheckTimeoutRef.current;
    
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
      if (currentSessionCheckTimeout) {
        clearTimeout(currentSessionCheckTimeout);
      }
    };
  }, []); // FIXED: Remove checkSession dependency to prevent re-initialization

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

      // Redirect to login page
      window.location.href = '/login';
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
