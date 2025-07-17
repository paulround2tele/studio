'use client';

import { useCallback, useState } from 'react';

// Type definitions for consistent API responses
type LoginResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Simplified authentication hook for thin client architecture
 * Backend handles all auth logic via middleware and API endpoints
 */
export function useAuthUI() {
  // THIN CLIENT: Simple loading states for UI feedback only
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isLogoutLoading, setIsLogoutLoading] = useState(false);

  // Enhanced login with UI loading state
  const login = useCallback(async (credentials: { email: string; password: string }): Promise<LoginResult> => {
    setIsLoginLoading(true);
    try {
      // THIN CLIENT: Call backend login API directly
      const response = await fetch('/api/v2/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      
      if (response.ok) {
        // Backend sets session cookie - redirect to dashboard
        window.location.href = '/dashboard';
        return { success: true };
      } else {
        const error = await response.text();
        return { success: false, error: error || 'Login failed' };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Network error' };
    } finally {
      setIsLoginLoading(false);
    }
  }, []);

  // Enhanced logout with UI loading state
  const logout = useCallback(async () => {
    setIsLogoutLoading(true);
    try {
      // THIN CLIENT: Call backend logout API directly
      await fetch('/api/v2/auth/logout', { method: 'POST' });
      // Backend clears session cookie - redirect to login
      window.location.href = '/login';
    } finally {
      setIsLogoutLoading(false);
    }
  }, []);

  return {
    // THIN CLIENT: Simplified auth state
    // If this code runs, user is authenticated (middleware verified)
    isAuthenticated: true,
    isLoading: false,
    isInitialized: true,
    user: null, // Backend provides user data via API calls when needed
    
    // Auth actions
    login,
    logout,
    
    // UI loading states
    isLoginLoading,
    isLogoutLoading,
    
    // Convenience properties for UI
    isReady: true, // Always ready in thin client
  };
}

export default useAuthUI;