/**
 * Simplified authentication-based component wrapper
 * In simple session-based auth, we only check if user is authenticated
 */

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface WithPermissionProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showFallback?: boolean;
  onPermissionDenied?: () => void;
}

/**
 * Authentication-based component wrapper that conditionally renders children based on authentication status
 * Note: In simplified auth, all authenticated users have the same access
 */
export function WithPermission({ 
  children, 
  fallback = null,
  showFallback = true,
  onPermissionDenied
}: WithPermissionProps) {
  const { isAuthenticated, isLoading } = useAuth();

  // Wait for auth to be ready
  if (isLoading) {
    return showFallback ? <div>Loading...</div> : null;
  }

  // Check authentication
  if (!isAuthenticated) {
    // Call callback if provided
    if (onPermissionDenied) {
      onPermissionDenied();
    }
    
    return showFallback ? fallback : null;
  }

  return <>{children}</>;
}

interface ConditionalAuthProps {
  children: React.ReactNode;
  condition?: () => boolean;
  fallback?: React.ReactNode;
  showFallback?: boolean;
}

/**
 * Conditional component wrapper based on custom auth conditions
 */
export function ConditionalAuth({
  children,
  condition,
  fallback = null,
  showFallback = true
}: ConditionalAuthProps) {
  const { isAuthenticated, isLoading } = useAuth();

  // Wait for auth to be ready
  if (isLoading || !isAuthenticated) {
    return showFallback ? fallback : null;
  }

  // Check custom condition if provided
  if (condition && !condition()) {
    return showFallback ? fallback : null;
  }

  return <>{children}</>;
}

export default WithPermission;
