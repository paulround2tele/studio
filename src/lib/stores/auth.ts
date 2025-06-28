// src/lib/stores/auth.ts
// Simplified Authentication State Management - Cookie-based session validation only
import { authService, type AuthState, type LoginCredentials } from '@/lib/services/authService';
import type { User } from '@/lib/types';

class AuthStore {
  private static instance: AuthStore;
  private authState: AuthState = {
    isAuthenticated: false,
    user: null,
    isLoading: false,
    sessionExpiry: null
  };
  
  private listeners: Set<(state: AuthState) => void> = new Set();
  private unsubscribeFromService: (() => void) | null = null;

  static getInstance(): AuthStore {
    if (!AuthStore.instance) {
      AuthStore.instance = new AuthStore();
    }
    return AuthStore.instance;
  }

  constructor() {
    // Subscribe to auth service state changes
    this.unsubscribeFromService = authService.subscribe((state) => {
      this.authState = state;
      this.notifyListeners();
    });

    // Initialize with current auth service state
    this.authState = authService.getState();
  }

  // Get current authentication state
  getState(): AuthState {
    return { ...this.authState };
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  // Get current user
  getUser(): User | null {
    return this.authState.user;
  }

  // Check if authentication is loading
  isLoading(): boolean {
    return this.authState.isLoading;
  }

  // Get session expiry time
  getSessionExpiry(): number | null {
    return this.authState.sessionExpiry;
  }

  // Check if session is expiring soon (within 5 minutes)
  isSessionExpiringSoon(): boolean {
    if (!this.authState.sessionExpiry) return false;
    return this.authState.sessionExpiry - Date.now() < 5 * 60 * 1000;
  }

  // Login with credentials
  async login(credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> {
    return authService.login(credentials);
  }

  // Logout
  async logout(): Promise<void> {
    return authService.logout();
  }

  // Check session status (for session-based auth, just check if authenticated)
  async validateSession(): Promise<boolean> {
    return authService.isAuthenticated();
  }

  // Initialize auth store
  async initialize(): Promise<void> {
    return authService.initialize();
  }

  // Simplified authentication - no permission/role checking needed
  // All authenticated users have the same access level

  // Session refresh (for session-based auth, just check current status)
  async refreshSession(): Promise<boolean> {
    return authService.isAuthenticated();
  }

  // Check if auth is initialized (always true for session-based auth)
  isInitialized(): boolean {
    return true; // Session-based auth is always initialized
  }

  // Subscribe to auth state changes
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    // Immediately call with current state
    listener(this.authState);
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Notify all listeners of state changes
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.authState));
  }

  // Cleanup
  destroy(): void {
    if (this.unsubscribeFromService) {
      this.unsubscribeFromService();
      this.unsubscribeFromService = null;
    }
    this.listeners.clear();
  }
}

// Export singleton instance
export const authStore = AuthStore.getInstance();

// Helper hooks and utilities
export interface UseAuthResult {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  sessionExpiry: number | null;
  isSessionExpiringSoon: () => boolean;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  validateSession: () => Promise<boolean>;
  refreshSession: () => Promise<boolean>;
}

// Hook for using auth state in React components - simplified
export function useAuth(): UseAuthResult {
  const state = authStore.getState();
  
  return {
    isAuthenticated: state.isAuthenticated,
    user: state.user,
    isLoading: state.isLoading,
    isInitialized: authStore.isInitialized(),
    sessionExpiry: state.sessionExpiry,
    isSessionExpiringSoon: () => authStore.isSessionExpiringSoon(),
    login: (credentials: LoginCredentials) => authStore.login(credentials),
    logout: () => authStore.logout(),
    validateSession: () => authStore.validateSession(),
    refreshSession: () => authStore.refreshSession(),
  };
}

// Simplified auth utilities - no permission/role checking
export function isAuthenticated(): boolean {
  return authStore.isAuthenticated();
}

export function getCurrentUser(): User | null {
  return authStore.getUser();
}

export function isSessionExpiringSoon(): boolean {
  return authStore.isSessionExpiringSoon();
}

// Simplified auth guard utilities for route protection
export function requireAuth(): boolean {
  if (!authStore.isAuthenticated()) {
    // Redirect to login if not authenticated
    if (typeof window !== 'undefined') {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
    }
    return false;
  }
  return true;
}

// Session management utilities
export function getSessionTimeRemaining(): number {
  const expiry = authStore.getSessionExpiry();
  if (!expiry) return 0;
  return Math.max(0, expiry - Date.now());
}

export function formatSessionTimeRemaining(): string {
  const ms = getSessionTimeRemaining();
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

// Initialize auth store on module load
if (typeof window !== 'undefined') {
  authStore.initialize().catch(error => {
    console.error('Failed to initialize auth store:', error);
  });
}

export default authStore;