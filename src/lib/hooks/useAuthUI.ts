// src/lib/hooks/useAuthUI.ts
// UI logic for authentication - integrates with loading states and logging
// NO HARDCODING - Uses configurable loading states and logging

import { useLoadingStore, LOADING_OPERATIONS } from '@/lib/stores/loadingStore';
import { getLogger } from '@/lib/utils/logger';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback } from 'react';

const logger = getLogger();

/**
 * Hook that wraps auth operations with UI logic and loading state management
 * Integrates with the new loading store and provides consistent UI feedback
 */
export function useAuthUI() {
  const auth = useAuth();
  const loadingStore = useLoadingStore();

  const loginWithUI = useCallback(async (credentials: { email: string; password: string; rememberMe?: boolean }) => {
    logger.info('AUTH_UI', 'Login with UI started', { email: credentials.email });
    
    // Start UI loading state
    loadingStore.startLoading(LOADING_OPERATIONS.LOGIN, 'Signing in...');

    try {
      // Use the AuthContext login method which already handles authService integration
      const result = await auth.login(credentials);
      
      if (result.success) {
        logger.info('AUTH_UI', 'Login with UI successful');
        loadingStore.stopLoading(LOADING_OPERATIONS.LOGIN, 'succeeded');
      } else {
        logger.warn('AUTH_UI', 'Login with UI failed', { error: result.error });
        loadingStore.stopLoading(LOADING_OPERATIONS.LOGIN, 'failed', result.error || 'Login failed');
      }
      
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Network error';
      logger.error('AUTH_UI', 'Login with UI error', { error: errorMsg });
      loadingStore.stopLoading(LOADING_OPERATIONS.LOGIN, 'failed', errorMsg);
      
      // Return error result instead of throwing to match expected interface
      return {
        success: false,
        error: errorMsg
      };
    }
  }, [auth, loadingStore]);

  const logoutWithUI = useCallback(async () => {
    logger.info('AUTH_UI', 'Logout with UI started');
    
    // Start UI loading state
    loadingStore.startLoading(LOADING_OPERATIONS.LOGOUT, 'Signing out...');

    try {
      // Use the AuthContext logout method
      await auth.logout();
      logger.info('AUTH_UI', 'Logout with UI successful');
      loadingStore.stopLoading(LOADING_OPERATIONS.LOGOUT, 'succeeded');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Logout error';
      logger.error('AUTH_UI', 'Logout with UI error', { error: errorMsg });
      loadingStore.stopLoading(LOADING_OPERATIONS.LOGOUT, 'failed', errorMsg);
      throw error;
    }
  }, [auth, loadingStore]);

  // Check if any auth-related loading is in progress
  const isLoginLoading = loadingStore.isOperationLoading(LOADING_OPERATIONS.LOGIN);
  const isLogoutLoading = loadingStore.isOperationLoading(LOADING_OPERATIONS.LOGOUT);
  const isSessionLoading = loadingStore.isOperationLoading(LOADING_OPERATIONS.SESSION_CHECK);
  const isAuthLoading = isLoginLoading || isLogoutLoading || isSessionLoading || auth.isLoading;

  return {
    // Auth state (pass-through from context)
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    isInitialized: auth.isInitialized,
    
    // Enhanced loading states
    isLoading: isAuthLoading,
    isLoginLoading,
    isLogoutLoading,
    isSessionLoading,
    
    // UI-wrapped operations
    login: loginWithUI,
    logout: logoutWithUI,
    
    // Pass-through other auth methods
    setAuthState: auth.setAuthState,
    changePassword: auth.changePassword,
    validatePassword: auth.validatePassword,
  };
}
