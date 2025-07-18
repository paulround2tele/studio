// src/lib/services/authService.ts
// Clean authentication service using auto-generated API clients with unified response handling

import { authApi } from '@/lib/api-client/client';
import type { components } from '@/lib/api-client/types';
import { extractResponseData } from '@/lib/utils/apiResponseHelpers';

type User = components['schemas']['User'];
type LoginRequest = components['schemas']['LoginRequest'];
type ChangePasswordRequest = components['schemas']['ChangePasswordRequest'];
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();

// Use OpenAPI types for authentication
export type LoginCredentials = LoginRequest & {
  rememberMe?: boolean;
};

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

/**
 * Clean authentication service using auto-generated API clients
 * No legacy wrappers - just clean, direct API calls
 */
class AuthService {
  private static instance: AuthService;

  constructor() {
    logger.debug('AUTH_SERVICE', 'Initialized with shared API client configuration');
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Get current user using pure auto-generated API
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await authApi.getCurrentUser();
      const userData = extractResponseData<User>(response);
      
      if (!userData?.id || !userData?.email) {
        logger.warn('AUTH_SERVICE', 'Invalid user data received', { userData });
        return null;
      }
      
      logger.debug('AUTH_SERVICE', 'User retrieved successfully', {
        userId: userData.id,
        email: userData.email
      });
      
      return userData;
    } catch (error) {
      const isAuthError = error instanceof Error && (
        error.message.includes('401') ||
        error.message.includes('Unauthorized')
      );
      
      if (!isAuthError) {
        logger.warn('AUTH_SERVICE', 'Session check failed', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      return null;
    }
  }

  /**
   * Login using pure auto-generated API
   */
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    logger.info('AUTH_SERVICE', 'Login attempt started', {
      email: credentials.email,
      rememberMe: credentials.rememberMe
    });

    try {
      const response = await authApi.login({
        email: credentials.email,
        password: credentials.password,
        rememberMe: credentials.rememberMe
      });
      
      // Backend returns unified APIResponse format - extractResponseData unwraps to SessionResponse
      const sessionData = extractResponseData<{
        user: {
          id: string;
          username: string;
          email: string;
          isActive: boolean;
        };
        token: string;
        refreshToken: string;
        expiresAt: string;
      }>(response);
      
      if (!sessionData?.user?.id || !sessionData?.user?.email) {
        logger.warn('AUTH_SERVICE', 'Invalid session data in login response', { sessionData });
        return {
          success: false,
          error: 'Invalid login response'
        };
      }
      
      // Convert backend response to frontend User format
      const user: User = {
        id: sessionData.user.id,
        email: sessionData.user.email,
        // Backend uses 'username' field which contains the computed name
        name: sessionData.user.username || '',
        isActive: sessionData.user.isActive,
        createdAt: new Date().toISOString(), // Will be filled from /auth/me if needed
        updatedAt: new Date().toISOString()
      };
      
      logger.info('AUTH_SERVICE', 'Login successful', {
        userId: user.id,
        email: user.email
      });
      return {
        success: true,
        user: user
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      logger.error('AUTH_SERVICE', 'Login failed', { error: errorMessage });
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Logout using pure auto-generated API
   */
  async logout(): Promise<AuthResult> {
    logger.info('AUTH_SERVICE', 'Logout started');

    try {
      const response = await authApi.logout();
      extractResponseData(response); // Just validate the response structure

      logger.info('AUTH_SERVICE', 'Logout successful');
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Logout failed';
      logger.error('AUTH_SERVICE', 'Logout failed', { error: errorMessage });
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Refresh session using pure auto-generated API
   */
  async refreshSession(): Promise<AuthResult> {
    logger.debug('AUTH_SERVICE', 'Session refresh started');

    try {
      const response = await authApi.refreshSession();
      extractResponseData(response); // Just validate the response structure

      logger.info('AUTH_SERVICE', 'Session refresh successful');
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Session refresh failed';
      logger.warn('AUTH_SERVICE', 'Session refresh failed', { error: errorMessage });
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Change password using pure auto-generated API
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<AuthResult> {
    logger.debug('AUTH_SERVICE', 'Password change started');

    try {
      const request: ChangePasswordRequest = {
        currentPassword,
        newPassword
      };
      
      const response = await authApi.changePassword(request);
      extractResponseData(response); // Just validate the response structure

      logger.info('AUTH_SERVICE', 'Password change successful');
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password change failed';
      logger.error('AUTH_SERVICE', 'Password change failed', { error: errorMessage });
      return {
        success: false,
        error: errorMessage
      };
    }
  }

}

// Export singleton instance
export const authService = AuthService.getInstance();
export default authService;
