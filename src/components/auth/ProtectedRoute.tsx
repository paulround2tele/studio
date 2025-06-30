// src/components/auth/ProtectedRoute.tsx
// Simple protected route component with session-based authentication
'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Lock, Home } from 'lucide-react';

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
    isInitialized
  } = useAuth();
  
  const router = useRouter();
  const pathname = usePathname();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  // Handle redirect after authentication check
  useEffect(() => {
    if (!isLoading && isInitialized && shouldRedirect && redirectTo) {
      const currentPath = encodeURIComponent(pathname);
      router.push(`${redirectTo}?redirect=${currentPath}`);
    }
  }, [isLoading, isInitialized, shouldRedirect, redirectTo, router, pathname]);

  // Show loading while auth is initializing
  if (!isInitialized || isLoading) {
    return <LoadingScreen />;
  }

  // Allow unauthenticated access if specified
  if (allowUnauthenticated) {
    return <>{children}</>;
  }

  // Check authentication
  if (!isAuthenticated) {
    if (redirectTo && showLoginPrompt) {
      setShouldRedirect(true);
      return <LoadingScreen />;
    }
    
    if (fallbackComponent) {
      return <>{fallbackComponent}</>;
    }
    
    return (
      <AccessDenied
        redirectTo={redirectTo}
      />
    );
  }

  // All checks passed, render children
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