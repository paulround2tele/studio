'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from '@/lib/types';
import { AuthenticationApi } from '@/lib/api-client/api/authentication-api';
import { Configuration } from '@/lib/api-client/configuration';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (credentials: { email: string; password: string; rememberMe?: boolean }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  // Compatibility properties for existing code
  isInitialized: boolean;
  changePassword?: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  validatePassword?: (password: string) => Promise<{ isValid: boolean; errors?: string[] }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true
  });

  // Initialize API client
  const authApi = new AuthenticationApi(new Configuration());

  // Check for existing session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const response = await authApi.apiV2MeGet();
      
      if (response.status === 200 && response.data) {
        setAuthState({
          user: response.data as unknown as User,
          isAuthenticated: true,
          isLoading: false
        });
      } else {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false
        });
      }
    } catch (error) {
      console.error('Session check failed:', error);
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false
      });
    }
  };

  const login = useCallback(async (credentials: { email: string; password: string; rememberMe?: boolean }) => {
    try {
      const response = await authApi.apiV2AuthLoginPost({
        email: credentials.email,
        password: credentials.password
      });

      if (response.status === 200 && response.data?.user) {
        setAuthState({
          user: response.data.user as unknown as User,
          isAuthenticated: true,
          isLoading: false
        });
        return { success: true };
      } else {
        return { 
          success: false, 
          error: 'Login failed' 
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: 'Network error. Please try again.' 
      };
    }
  }, [authApi]);

  const logout = useCallback(async () => {
    try {
      await authApi.apiV2AuthLogoutPost();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false
      });
    }
  }, [authApi]);

  const value: AuthContextType = {
    ...authState,
    login,
    logout,
    isInitialized: !authState.isLoading,
    // Simple implementations for compatibility
    changePassword: async () => ({ success: false, error: 'Password change not implemented in simple auth' }),
    validatePassword: async () => ({ isValid: true })
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
