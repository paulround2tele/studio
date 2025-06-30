// src/lib/services/authService.ts
// Pure authentication service - NO UI LOGIC
import { apiClient, type components } from '@/lib/api-client/client';
import type { User as ManualUser } from '@/lib/types';

type GeneratedUser = components['schemas']['User'];

// Type adapter to convert generated OpenAPI User to manual User type
function adaptUser(generatedUser: GeneratedUser): ManualUser | null {
  if (!generatedUser?.id || !generatedUser?.email) {
    return null;
  }
  
  return {
    id: generatedUser.id as ManualUser['id'],
    email: generatedUser.email,
    emailVerified: generatedUser.emailVerified ?? false,
    firstName: generatedUser.firstName ?? '',
    lastName: generatedUser.lastName ?? '',
    isActive: generatedUser.isActive ?? true,
    isLocked: generatedUser.isLocked ?? false,
    lastLoginAt: generatedUser.lastLoginAt as ManualUser['lastLoginAt'],
    lastLoginIp: undefined, // Not in generated type yet
    mustChangePassword: generatedUser.mustChangePassword ?? false,
    mfaEnabled: generatedUser.mfaEnabled ?? false,
    mfaLastUsedAt: undefined, // Not in generated type yet
    createdAt: (generatedUser.createdAt ?? new Date().toISOString()) as ManualUser['createdAt'],
    updatedAt: (generatedUser.updatedAt ?? new Date().toISOString()) as ManualUser['updatedAt']
  };
}

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

  constructor() {
    // No need for API client initialization - using singleton apiClient
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Check current session status
   */
  async getCurrentUser(): Promise<ManualUser | null> {
    try {
      const response = await apiClient.getCurrentUser();
      return adaptUser(response);
    } catch {
      return null;
    }
  }

  /**
   * Login with credentials
   */
  async login(credentials: LoginCredentials): Promise<{ success: boolean; user?: ManualUser; error?: string }> {
    try {
      const response = await apiClient.login({
        email: credentials.email,
        password: credentials.password,
        rememberMe: credentials.rememberMe
      });
      
      if (response?.user) {
        const adaptedUser = adaptUser(response.user);
        if (adaptedUser) {
          return {
            success: true,
            user: adaptedUser
          };
        }
      }
      
      return {
        success: false,
        error: 'Login failed'
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
      await apiClient.logout();
      return { success: true };
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
      await apiClient.refreshSession();
      return { success: true };
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
      await apiClient.changePassword({
        currentPassword,
        newPassword
      });
      return { success: true };
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
