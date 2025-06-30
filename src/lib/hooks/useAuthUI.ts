// src/lib/hooks/useAuthUI.ts
// UI logic for authentication - loading states, logging, notifications
import { useLoadingStore, LOADING_OPERATIONS } from '@/lib/stores/loadingStore';
import { logAuth } from '@/lib/utils/logger';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/lib/services/authService';

/**
 * Hook that wraps auth operations with UI logic
 * Handles loading states, logging, and user feedback
 */
export function useAuthUI() {
  const auth = useAuth();
  const loadingStore = useLoadingStore();

  const loginWithUI = async (credentials: { email: string; password: string; rememberMe?: boolean }) => {
    logAuth.success('Login attempt started', { email: credentials.email });
    loadingStore.startLoading(LOADING_OPERATIONS.LOGIN, 'Signing in...');

    try {
      const result = await authService.login(credentials);
      
      if (result.success) {
        auth.setAuthState({
          user: result.user || null,
          isAuthenticated: true,
          isLoading: false,
        });
        logAuth.success('Login successful');
        loadingStore.stopLoading(LOADING_OPERATIONS.LOGIN, 'succeeded');
      } else {
        logAuth.warn('Login failed', { error: result.error });
        loadingStore.stopLoading(LOADING_OPERATIONS.LOGIN, 'failed', result.error || 'Login failed');
      }
      
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Network error';
      logAuth.error('Login error', { error: errorMsg });
      loadingStore.stopLoading(LOADING_OPERATIONS.LOGIN, 'failed', errorMsg);
      throw error;
    }
  };

  const logoutWithUI = async () => {
    logAuth.success('Logout started');
    loadingStore.startLoading(LOADING_OPERATIONS.LOGOUT, 'Signing out...');

    try {
      await authService.logout();
      auth.setAuthState({ user: null, isAuthenticated: false, isLoading: false });
      logAuth.success('Logout successful');
      loadingStore.stopLoading(LOADING_OPERATIONS.LOGOUT, 'succeeded');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Logout error';
      logAuth.error('Logout error', { error: errorMsg });
      loadingStore.stopLoading(LOADING_OPERATIONS.LOGOUT, 'failed', errorMsg);
      throw error;
    }
  };

  return {
    // Auth state (pass-through)
    ...auth,
    // UI-wrapped operations
    login: loginWithUI,
    logout: logoutWithUI,
  };
}
