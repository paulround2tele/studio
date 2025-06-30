// src/contexts/AuthContext.tsx
// Enhanced React context for authentication state management with RBAC and security features
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';
import { authService, type AuthState, type LoginCredentials } from '@/lib/services/authService';
// HMR SAFE: Local feature flags implementation to avoid environment.ts import chain
const getFeatureFlags = () => ({
  enableDebugMode: process.env.NODE_ENV === 'development',
  enableSessionValidation: true
});
import type {
  AuthResponse,
  PasswordValidationResult
} from '@/lib/types';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<{ 
    success: boolean; 
    error?: string; 
    fieldErrors?: { [key: string]: string }; 
  }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<AuthResponse<void>>;
  validatePassword: (password: string) => Promise<PasswordValidationResult>;
  isSessionExpiringSoon: () => boolean;
  isInitialized: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
    sessionExpiry: null
  });
  const [isInitialized, setIsInitialized] = useState(false);

  // MEMORY LEAK FIX: Track initialization status globally to prevent multiple initializations
  const mountedRef = React.useRef(true);
  const initializationRef = React.useRef<Promise<void> | null>(null);

  // Initialize auth service on mount
  useEffect(() => {
    mountedRef.current = true;

    const initializeAuth = async () => {
      // MEMORY LEAK FIX: Prevent multiple concurrent initializations
      if (initializationRef.current) {
        console.log('[AuthContext] Auth service already initializing, waiting for completion');
        await initializationRef.current;
        if (mountedRef.current) {
          setIsInitialized(true);
        }
        return;
      }

      try {
        console.log('[AuthContext] Starting auth service initialization');
        initializationRef.current = authService.initialize();
        await initializationRef.current;
        
        if (mountedRef.current) {
          console.log('[AuthContext] Auth service initialized successfully');
          
          // Get current state after initialization
          const state = authService.getState();
          console.log('[AuthContext] Post-initialization auth state:', {
            isAuthenticated: state.isAuthenticated,
            hasUser: !!state.user,
            userEmail: state.user?.email || 'none'
          });
          
          // In session-based auth, the initialize() method already checks for active session
          // No need for additional session validation since it's handled by cookies
          
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('[AuthContext] Failed to initialize auth service:', error);
        if (mountedRef.current) {
          setIsInitialized(true);
        }
      } finally {
        initializationRef.current = null;
      }
    };

    initializeAuth();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Subscribe to auth state changes
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const setupSubscription = () => {
      unsubscribe = authService.subscribe((newState) => {
        if (mountedRef.current) {
          setAuthState(newState);
        }
      });

      // Get initial state
      if (mountedRef.current) {
        setAuthState(authService.getState());
      }
    };

    setupSubscription();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // MEMORY LEAK FIX: Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      // Note: We don't destroy the auth service itself as it may be used by other components
      // The auth service should have its own cleanup mechanisms
    };
  }, []);

  // Login function
  const login = useCallback(async (credentials: LoginCredentials) => {
    const features = getFeatureFlags();
    
    if (features.enableDebugMode) {
      console.log('[Auth] Attempting login for:', credentials.email);
    }
    
    const result = await authService.login(credentials);
    
    if (features.enableDebugMode) {
      console.log('[Auth] Login result:', result.success ? 'success' : 'failed');
    }
    
    return result;
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    const features = getFeatureFlags();
    
    if (features.enableDebugMode) {
      console.log('[Auth] Logging out user');
    }
    
    await authService.logout();
  }, []);

  // In session-based auth, sessions are automatically managed by cookies
  // No manual refresh needed
  const refreshSession = useCallback(async () => {
    const features = getFeatureFlags();
    
    if (features.enableDebugMode) {
      console.log('[Auth] Session refresh not needed in cookie-based auth');
    }
    
    return true; // Sessions are handled automatically
  }, []);

  // Change password function
  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<AuthResponse<void>> => {
    const features = getFeatureFlags();
    
    if (features.enableDebugMode) {
      console.log('[Auth] Changing password');
    }
    
    const result = await authService.updatePassword({
      currentPassword,
      newPassword
    });

    return {
      success: result.success,
      error: result.error ? { code: 'PASSWORD_CHANGE_ERROR', message: result.error } : undefined
    };
  }, []);

  // Validate password function
  const validatePassword = useCallback(async (password: string) => {
    return await authService.validatePassword(password);
  }, []);

  // Session expiry check - sessions are managed automatically by server cookies
  const isSessionExpiringSoon = useCallback((): boolean => {
    return false; // Sessions are managed automatically
  }, []);



  // PERFORMANCE OPTIMIZATION: Memoize context value to prevent cascade re-renders
  // This is critical for app-wide performance as AuthContext is consumed by many components
  const contextValue: AuthContextType = useMemo(() => ({
    ...authState,
    login,
    logout,
    refreshSession,
    changePassword,
    validatePassword,
    isSessionExpiringSoon,
    isInitialized
  }), [
    // AuthState dependencies - these are the core state values that should trigger re-renders
    authState,
    isInitialized,
    // All handler functions are already memoized with useCallback, so they're stable references
    login,
    logout,
    refreshSession,
    changePassword,
    validatePassword,
    isSessionExpiringSoon
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;