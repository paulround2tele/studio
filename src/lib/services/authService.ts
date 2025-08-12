// src/lib/services/authService.ts
// Clean authentication service using auto-generated API clients with unified response handling

import { authApi } from '@/lib/api-client/client';
import type { User, LoginRequest, ChangePasswordRequest } from '@/lib/api-client/professional-types';
import { extractResponseData } from '@/lib/utils/apiResponseHelpers';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();

/**
 * Maps technical API errors to user-friendly messages
 */
function getUserFriendlyErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'An unexpected error occurred. Please try again.';
  }

  const errorMessage = error.message.toLowerCase();

  // HTTP Status Code Mapping
  if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  
  if (errorMessage.includes('403') || errorMessage.includes('forbidden')) {
    return 'Account access denied. Please contact support if this continues.';
  }
  
  if (errorMessage.includes('429') || errorMessage.includes('too many requests')) {
    return 'Too many login attempts. Please wait a few minutes and try again.';
  }
  
  if (errorMessage.includes('500') || errorMessage.includes('internal server error')) {
    return 'Server error occurred. Please try again in a few moments.';
  }
  
  if (errorMessage.includes('502') || errorMessage.includes('503') || errorMessage.includes('504')) {
    return 'Service temporarily unavailable. Please try again later.';
  }

  // Network and Connection Errors
  if (errorMessage.includes('network error') ||
      errorMessage.includes('failed to fetch') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('timeout')) {
    return 'Connection problem detected. Please check your internet connection and try again.';
  }

  // Validation Errors
  if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
    return 'Please check your input and try again.';
  }

  // Generic fallback for any unhandled errors
  return 'Login failed. Please try again or contact support if the issue persists.';
}

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
      // ✅ PROFESSIONAL REALITY - Using actual generated method name
      const response = await authApi.loginUser({
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
      // ✅ PROFESSIONAL REALITY - Using actual generated method name
      const response = await authApi.logoutUser();
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
      // Log technical error for debugging
      const technicalError = error instanceof Error ? error.message : 'Unknown error';
      logger.warn('AUTH_SERVICE', 'Session refresh failed', { error: technicalError });
      
      // Return user-friendly error message
      const userFriendlyMessage = getUserFriendlyErrorMessage(error);
      return {
        success: false,
        error: userFriendlyMessage
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
      // Log technical error for debugging
      const technicalError = error instanceof Error ? error.message : 'Unknown error';
      logger.error('AUTH_SERVICE', 'Password change failed', { error: technicalError });
      
      // Return user-friendly error message for password changes
      let userFriendlyMessage = getUserFriendlyErrorMessage(error);
      
      // Special handling for password change errors
      if (technicalError.includes('401') || technicalError.includes('unauthorized')) {
        userFriendlyMessage = 'Current password is incorrect. Please try again.';
      } else if (technicalError.includes('validation') || technicalError.includes('invalid')) {
        userFriendlyMessage = 'New password does not meet requirements. Please choose a stronger password.';
      }
      
      return {
        success: false,
        error: userFriendlyMessage
      };
    }
  }

}

// Export singleton instance
export const authService = AuthService.getInstance();
export default authService;
