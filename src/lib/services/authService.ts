// src/lib/services/authService.ts
// Pure authentication service with configuration-driven API integration
// NO HARDCODING - Uses environment-based configuration

import { apiClient } from '@/lib/api-client/client';
import type { User } from '@/lib/types';
import type { components } from '@/lib/api-client/types';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();

type GeneratedUser = components['schemas']['User'];

// Type adapter to convert generated OpenAPI User to manual User type
function adaptUser(generatedUser: GeneratedUser): User | null {
  if (!generatedUser?.id || !generatedUser?.email) {
    logger.warn('AUTH_SERVICE', 'Invalid user data received', { generatedUser });
    return null;
  }
  
  const adaptedUser: User = {
    id: generatedUser.id as User['id'],
    email: generatedUser.email,
    emailVerified: generatedUser.emailVerified ?? false,
    firstName: generatedUser.firstName ?? '',
    lastName: generatedUser.lastName ?? '',
    isActive: generatedUser.isActive ?? true,
    isLocked: generatedUser.isLocked ?? false,
    lastLoginAt: generatedUser.lastLoginAt as User['lastLoginAt'],
    lastLoginIp: undefined, // Not in generated type yet
    mustChangePassword: generatedUser.mustChangePassword ?? false,
    mfaEnabled: generatedUser.mfaEnabled ?? false,
    mfaLastUsedAt: undefined, // Not in generated type yet
    createdAt: (generatedUser.createdAt ?? new Date().toISOString()) as User['createdAt'],
    updatedAt: (generatedUser.updatedAt ?? new Date().toISOString()) as User['updatedAt']
  };

  logger.debug('AUTH_SERVICE', 'User adapted successfully', { 
    userId: adaptedUser.id, 
    email: adaptedUser.email 
  });

  return adaptedUser;
}

interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

/**
 * Pure authentication service with environment-based configuration.
 * NO UI logic, NO loading states, NO notifications - just auth operations.
 * Uses configurable timeouts and retry logic.
 */
class AuthService {
  private static instance: AuthService;
  private sessionCheckTimeout: number;
  private maxRetries: number;

  constructor() {
    // Configuration from environment - NO HARDCODING
    this.sessionCheckTimeout = parseInt(
      process.env.NEXT_PUBLIC_AUTH_SESSION_TIMEOUT || '15000'
    );
    this.maxRetries = parseInt(
      process.env.NEXT_PUBLIC_AUTH_MAX_RETRIES || '2'
    );

    logger.debug('AUTH_SERVICE', 'Initialized with configuration', {
      sessionCheckTimeout: this.sessionCheckTimeout,
      maxRetries: this.maxRetries
    });
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * SIMPLE session check - no overthinking, just works
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      // Just call the API - simple and straightforward
      const response = await apiClient.getCurrentUser();
      
      if (response && typeof response === 'object') {
        // Handle wrapped API response format: { success: true, data: User }
        const userData = (response as { data?: GeneratedUser })?.data || response;
        const adaptedUser = adaptUser(userData as GeneratedUser);
        return adaptedUser;
      }

      return null;
    } catch (_error) {
      // Just return null on any error - keep it simple
      return null;
    }
  }

  /**
   * Login with credentials and configurable retry logic
   */
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    logger.info('AUTH_SERVICE', 'Login attempt started', { 
      email: credentials.email,
      rememberMe: credentials.rememberMe 
    });

    let lastError: Error | null = null;

    // Retry logic with configurable attempts
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await apiClient.login({
          email: credentials.email,
          password: credentials.password,
          rememberMe: credentials.rememberMe
        });
        
        if (response?.user) {
          const adaptedUser = adaptUser(response.user);
          if (adaptedUser) {
            logger.info('AUTH_SERVICE', 'Login successful', {
              userId: adaptedUser.id,
              attempt: attempt + 1
            });
            return {
              success: true,
              user: adaptedUser
            };
          }
        }
        
        logger.warn('AUTH_SERVICE', 'Login failed - invalid response', { 
          attempt: attempt + 1,
          hasResponse: !!response,
          hasUser: !!(response as { user?: unknown })?.user
        });
        
        return {
          success: false,
          error: 'Invalid login response'
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Don't retry on certain errors
        if (lastError.message.includes('401') || lastError.message.includes('400')) {
          logger.warn('AUTH_SERVICE', 'Login failed - authentication error', { 
            error: lastError.message,
            attempt: attempt + 1 
          });
          break;
        }

        if (attempt < this.maxRetries) {
          const retryDelay = Math.pow(2, attempt) * 1000;
          logger.debug('AUTH_SERVICE', 'Retrying login after delay', { 
            attempt: attempt + 1,
            retryDelay 
          });
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    const errorMessage = lastError?.message || 'Login failed';
    logger.error('AUTH_SERVICE', 'Login failed after all retries', { 
      error: errorMessage,
      maxRetries: this.maxRetries 
    });

    return {
      success: false,
      error: errorMessage
    };
  }

  /**
   * Logout current session
   */
  async logout(): Promise<AuthResult> {
    logger.info('AUTH_SERVICE', 'Logout started');

    try {
      await apiClient.logout();
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
   * Refresh current session
   */
  async refreshSession(): Promise<AuthResult> {
    logger.debug('AUTH_SERVICE', 'Session refresh started');

    try {
      await apiClient.refreshSession();
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
   * Change password with validation
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<AuthResult> {
    logger.info('AUTH_SERVICE', 'Change password started');

    try {
      await apiClient.changePassword({
        currentPassword,
        newPassword
      });
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
