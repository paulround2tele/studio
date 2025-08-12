'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useCachedAuth } from '@/lib/hooks/useCachedAuth';
import type { User } from '@/lib/api-client/professional-types';

// Type definitions

type LoginResult =
  | { success: true }
  | { success: false; error: string };

// Auth context interface
interface AuthContextType {
  // Auth state
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  user: User | null;
  
  // Auth operations
  login: (credentials: { email: string; password: string }) => Promise<LoginResult>;
  logout: () => Promise<void>;
  
  // Loading states
  isLoginLoading: boolean;
  isLogoutLoading: boolean;
}

// Create the context
const AuthContext = createContext<AuthContextType | null>(null);

// AuthProvider component
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Use the cached auth hook internally - this becomes the single source of truth
  const authState = useCachedAuth();
  
  console.log('[AuthProvider] 🔄 STATE UPDATE:', {
    timestamp: new Date().toISOString(),
    isAuthenticated: authState.isAuthenticated,
    isInitialized: authState.isInitialized,
    isLoading: authState.isLoading,
    userEmail: authState.user?.email,
    providingToContext: true
  });
  
  // Provide the auth state and operations to all children
  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  console.log('[useAuth] 🔗 CONTEXT ACCESS:', {
    timestamp: new Date().toISOString(),
    isAuthenticated: context.isAuthenticated,
    isInitialized: context.isInitialized,
    isLoading: context.isLoading,
    userEmail: context.user?.email,
    fromContext: true
  });
  
  return context;
}

// Export for backward compatibility if needed
export { AuthContext };