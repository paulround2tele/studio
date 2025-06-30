// src/lib/services/authService.ts
// Pure authentication service - NO UI LOGIC
import { apiClient } from '@/lib/api/client';
import type { User } from '@/lib/types';

interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Pure authentication service focused ONLY on auth operations.
 * NO UI logic, NO loading states, NO notifications - just auth.
 */
class AuthService {
  private static instance: AuthService;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Check current session status
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await apiClient.get('/me');
      return response.status === 'success' ? (response.data as User) : null;
    } catch {
      return null;
    }
  }

  /**
   * Login with credentials
   */
  async login(credentials: LoginCredentials): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await apiClient.post('/auth/login', credentials as unknown as Record<string, unknown>);
      
      if (response.status === 'success' && response.data) {
        return { 
          success: true, 
          user: response.data as User 
        };
      }
      
      return { 
        success: false, 
        error: response.message || 'Login failed' 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      };
    }
  }

  /**
   * Logout current session
   */
  async logout(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await apiClient.post('/auth/logout');
      return { 
        success: response.status === 'success',
        error: response.status === 'error' ? response.message : undefined
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      };
    }
  }

  /**
   * Refresh current session
   */
  async refreshSession(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await apiClient.post('/auth/refresh');
      return { 
        success: response.status === 'success',
        error: response.status === 'error' ? response.message : undefined
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      };
    }
  }

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await apiClient.post('/change-password', {
        currentPassword,
        newPassword
      });
      
      return { 
        success: response.status === 'success',
        error: response.status === 'error' ? response.message : undefined
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      };
    }
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();
export default authService;
