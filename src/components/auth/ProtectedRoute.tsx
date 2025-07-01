// src/components/auth/ProtectedRoute.tsx
// Configuration-driven protected route component with proper loading state management
'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLoadingStore, LOADING_OPERATIONS } from '@/lib/stores/loadingStore';
import { getLogger } from '@/lib/utils/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Lock, Home } from 'lucide-react';

const logger = getLogger();

interface ProtectedRouteProps {
  children: ReactNode;
  fallbackComponent?: ReactNode;
  redirectTo?: string;
  showLoginPrompt?: boolean;
  allowUnauthenticated?: boolean;
}

interface AccessDeniedProps {
  onLogin?: () => void;
  redirectTo?: string;
}

function AccessDenied({ onLogin, redirectTo }: AccessDeniedProps) {
  const router = useRouter();

  const handleLogin = () => {
    if (onLogin) {
      onLogin();
    } else if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.push('/login');
    }
  };

  const handleGoHome = () => {
    router.push('/');
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <Lock className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">Authentication Required</CardTitle>
          <CardDescription className="text-center">
            You need to sign in to access this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleLogin} className="w-full">
            Sign In
          </Button>
          <Button variant="outline" onClick={handleGoHome} className="w-full">
            <Home className="mr-2 h-4 w-4" />
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export function ProtectedRoute({
  children,
  fallbackComponent,
  redirectTo,
  showLoginPrompt = true,
  allowUnauthenticated = false
}: ProtectedRouteProps) {
  const {
    isAuthenticated,
    isLoading,
    isInitialized,
    user
  } = useAuth();
  
  const loadingStore = useLoadingStore();
  const router = useRouter();
  const pathname = usePathname();
  const [hasTriedRedirect, setHasTriedRedirect] = useState(false);

  // Get session loading state
  const isSessionLoading = loadingStore.isOperationLoading(LOADING_OPERATIONS.SESSION_CHECK);

  // Determine overall loading state
  const isOverallLoading = isLoading || isSessionLoading || !isInitialized;

  // Handle redirect after authentication check
  useEffect(() => {
    if (!isOverallLoading && !isAuthenticated && redirectTo && showLoginPrompt && !hasTriedRedirect) {
      logger.debug('PROTECTED_ROUTE', 'Redirecting to login', {
        pathname,
        redirectTo,
        isAuthenticated,
        isOverallLoading
      });
      
      setHasTriedRedirect(true);
      const currentPath = encodeURIComponent(pathname);
      router.push(`${redirectTo}?redirect=${currentPath}`);
    }
  }, [isOverallLoading, isAuthenticated, redirectTo, showLoginPrompt, hasTriedRedirect, router, pathname]);

  // Reset redirect flag when auth state changes
  useEffect(() => {
    if (isAuthenticated) {
      setHasTriedRedirect(false);
    }
  }, [isAuthenticated]);

  // Show loading while auth is loading or session is being checked
  if (isOverallLoading) {
    logger.debug('PROTECTED_ROUTE', 'Showing loading screen', {
      isLoading,
      isSessionLoading,
      isInitialized,
      pathname
    });
    return <LoadingScreen />;
  }

  // Allow unauthenticated access if specified
  if (allowUnauthenticated) {
    logger.debug('PROTECTED_ROUTE', 'Allowing unauthenticated access', { pathname });
    return <>{children}</>;
  }

  // Check authentication
  if (!isAuthenticated) {
    logger.debug('PROTECTED_ROUTE', 'User not authenticated', {
      pathname,
      redirectTo,
      showLoginPrompt,
      hasTriedRedirect
    });

    // If we're redirecting and haven't tried yet, show loading
    if (redirectTo && showLoginPrompt && !hasTriedRedirect) {
      return <LoadingScreen />;
    }
    
    // Show custom fallback if provided
    if (fallbackComponent) {
      return <>{fallbackComponent}</>;
    }
    
    // Show access denied screen
    return (
      <AccessDenied
        redirectTo={redirectTo}
      />
    );
  }

  // All checks passed, render children
  logger.debug('PROTECTED_ROUTE', 'Access granted', {
    pathname,
    isAuthenticated,
    userId: user?.id || 'unknown'
  });
  
  return <>{children}</>;
}

// Higher-order component for protecting pages
export function withProtectedRoute<T extends object>(
  Component: React.ComponentType<T>,
  options: Omit<ProtectedRouteProps, 'children'>
) {
  return function ProtectedComponent(props: T) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

// Hook for checking access within components (simplified for session-based auth)
export function useRouteAccess() {
  const { isAuthenticated } = useAuth();

  const hasAccess = () => {
    return isAuthenticated;
  };

  const getAccessReason = () => {
    if (!isAuthenticated) return 'unauthenticated';
    return null;
  };

  return {
    hasAccess: hasAccess(),
    accessReason: getAccessReason(),
    isAuthenticated
  };
}

export default ProtectedRoute;