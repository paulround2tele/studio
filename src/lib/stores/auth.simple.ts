// src/lib/stores/auth.ts
// Simple auth store that just re-exports the context hook for compatibility
import { useAuth as useAuthContext } from '@/contexts/AuthContext';
import type { User } from '@/lib/types';

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  sessionExpiry: number | null;
}

// Re-export the useAuth hook for compatibility with existing code
export const useAuth = useAuthContext;

// Simplified auth utilities - these are just compatibility functions
export function isAuthenticated(): boolean {
  // This will be called during server-side rendering, so we default to false
  if (typeof window === 'undefined') return false;
  
  // On client-side, we'd need to check the current state
  // For now, just return false as these utilities are mostly used server-side
  return false;
}

export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  return null;
}

export function isSessionExpiringSoon(): boolean {
  return false;
}

export function requireAuth(): boolean {
  return isAuthenticated();
}

export function getSessionTimeRemaining(): number {
  return 0;
}

export function formatSessionTimeRemaining(): string {
  return '0 minutes';
}
