'use client';

import { useCallback, useState, useEffect } from 'react';
import { authApi } from '@/lib/api-client/client';
import { extractResponseData } from '@/lib/utils/apiResponseHelpers';
import type { components } from '@/lib/api-client/types';

// Type definitions using proper OpenAPI schema types
type LoginRequest = components['schemas']['LoginRequest'];
type User = components['schemas']['User'];

type LoginResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Backend-Driven Authentication Hook with Real Session Validation
 *
 * SECURITY FIX: Actually validates session with backend instead of always returning true
 *
 * ✅ Validates session cookies with backend /auth/me endpoint
 * ✅ Handles session expiration properly
 * ✅ Uses unified ApiResponse<T> from backend
 * ✅ Maintains backend-driven philosophy with real validation
 */
export function useAuthUI() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isLogoutLoading, setIsLogoutLoading] = useState(false);

  // SECURITY FIX: Actually validate session with backend
  const validateSession = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await authApi.getCurrentUser();
      const userData = extractResponseData<User>(response);
      
      if (userData?.id && userData?.email) {
        setIsAuthenticated(true);
        setUser(userData);
        console.log('[useAuthUI] Session validated successfully');
      } else {
        setIsAuthenticated(false);
        setUser(null);
        console.log('[useAuthUI] Invalid user data - session invalid');
      }
    } catch (error) {
      // Session invalid or expired
      setIsAuthenticated(false);
      setUser(null);
      console.log('[useAuthUI] Session validation failed:', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, []);

  // Validate session on mount
  useEffect(() => {
    validateSession();
  }, [validateSession]);

  // Login with backend validation
  const login = useCallback(async (credentials: { email: string; password: string }): Promise<LoginResult> => {
    setIsLoginLoading(true);
    try {
      const loginRequest: LoginRequest = {
        email: credentials.email,
        password: credentials.password
      };
      
      const response = await authApi.login(loginRequest);
      const loginData = extractResponseData(response);
      
      if (loginData) {
        // Re-validate session to get user data
        await validateSession();
        return { success: true };
      } else {
        return { success: false, error: 'Login failed' };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Network error' };
    } finally {
      setIsLoginLoading(false);
    }
  }, [validateSession]);

  // Logout with proper session cleanup
  const logout = useCallback(async () => {
    setIsLogoutLoading(true);
    try {
      await authApi.logout();
      // Clear local state
      setIsAuthenticated(false);
      setUser(null);
      // Backend clears session cookie - redirect to login
      window.location.href = '/login';
    } catch (error) {
      console.error('[useAuthUI] Logout failed:', error);
      // Clear local state anyway and redirect
      setIsAuthenticated(false);
      setUser(null);
      window.location.href = '/login';
    } finally {
      setIsLogoutLoading(false);
    }
  }, []);

  return {
    // Real authentication state validated with backend
    isAuthenticated,
    isLoading,
    isInitialized,
    user,
    
    // Login/logout interactions
    login,
    logout,
    
    // UI loading states
    isLoginLoading,
    isLogoutLoading,
    
    // Convenience properties
    isReady: isInitialized && !isLoading,
  };
}

export default useAuthUI;