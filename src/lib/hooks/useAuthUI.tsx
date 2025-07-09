'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useLoadingStore, LOADING_OPERATIONS } from '@/lib/stores/loadingStore';
import { useCallback } from 'react';

/**
 * UI-focused authentication hook that wraps the core auth context
 * with additional loading states and UI-specific functionality
 */
export function useAuthUI() {
  const auth = useAuth();
  const { isOperationLoading } = useLoadingStore();

  // UI-specific loading states
  const isLoginLoading = isOperationLoading(LOADING_OPERATIONS.LOGIN);
  const isLogoutLoading = isOperationLoading(LOADING_OPERATIONS.LOGOUT);

  // Enhanced login with UI loading state
  const login = useCallback(async (credentials: { email: string; password: string }) => {
    const { startLoading, stopLoading } = useLoadingStore.getState();
    
    try {
      startLoading(LOADING_OPERATIONS.LOGIN, 'Signing in...');
      const result = await auth.login(credentials);
      return result;
    } finally {
      stopLoading(LOADING_OPERATIONS.LOGIN);
    }
  }, [auth]);

  // Enhanced logout with UI loading state
  const logout = useCallback(async () => {
    const { startLoading, stopLoading } = useLoadingStore.getState();
    
    try {
      startLoading(LOADING_OPERATIONS.LOGOUT, 'Signing out...');
      await auth.logout();
    } finally {
      stopLoading(LOADING_OPERATIONS.LOGOUT);
    }
  }, [auth]);

  return {
    ...auth,
    login,
    logout,
    isLoginLoading,
    isLogoutLoading,
    // Convenience properties for UI
    isReady: !auth.isLoading && auth.isInitialized,
  };
}

export default useAuthUI;