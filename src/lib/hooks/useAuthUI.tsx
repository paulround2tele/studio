'use client';

import { useCallback, useState } from 'react';
import { authApi } from '@/lib/api-client/client';
import { extractResponseData } from '@/lib/utils/apiResponseHelpers';
import type { components } from '@/lib/api-client/types';

// Type definitions using proper OpenAPI schema types
type LoginRequest = components['schemas']['LoginRequest'];

type LoginResult =
  | { success: true }
  | { success: false; error: string };

/**
 * ZERO-AUTH-LOGIC Frontend Hook - 100% Backend-Driven
 *
 * Backend middleware handles ALL authentication:
 * ✅ Session validation via cookies
 * ✅ Automatic redirects via 401/403 status codes
 * ✅ CSRF protection via origin validation
 * ✅ Security logging and metrics
 *
 * Frontend provides ONLY login/logout UI interactions
 * NO AUTH CHECKS, NO API CALLS, NO STATE MANAGEMENT
 */
export function useAuthUI() {
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isLogoutLoading, setIsLogoutLoading] = useState(false);

  // Login form interaction only - backend handles everything else
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
  }, []);

  // Logout form interaction only - backend handles everything else
  const logout = useCallback(async () => {
    setIsLogoutLoading(true);
    try {
      await authApi.logout();
      // Backend clears session cookie - redirect to login
      window.location.href = '/login';
    } catch (error) {
      console.error('[useAuthUI] Logout failed:', error);
      // Still redirect even if logout fails
      window.location.href = '/login';
    } finally {
      setIsLogoutLoading(false);
    }
  }, []);

  // ZERO AUTH LOGIC: Static responses since backend handles everything
  return {
    // Static values - if component renders, user is authenticated
    isAuthenticated: true,
    isLoading: false,
    isInitialized: true,
    user: null, // Components fetch user data directly when needed
    
    // Only login/logout interactions
    login,
    logout,
    
    // UI loading states for form interactions only
    isLoginLoading,
    isLogoutLoading,
    
    // Static convenience properties
    isReady: true,
  };
}

export default useAuthUI;