// src/components/auth/StrictProtectedRoute.tsx
// Simple strict route protection component with session-based authentication
'use client';

import React, { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Lock } from 'lucide-react';

interface StrictProtectedRouteProps {
  children: ReactNode;
  allowUnauthenticated?: boolean;
  redirectTo?: string;
}

function AccessDenied() {
  const handleLogin = () => {
    // Force redirect to login
    window.location.href = '/login';
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <Lock className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">Authentication Required</CardTitle>
          <CardDescription className="text-center">
            You must be signed in to access this page. Please log in to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleLogin} className="w-full">
            Sign In
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export default function StrictProtectedRoute({
  children,
  allowUnauthenticated = false
}: StrictProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  // REMOVED: Client-side authentication checks and redirects
  // Middleware handles all authentication - this prevents race conditions
  
  // Show loading only while auth context is initializing
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Allow unauthenticated access if specified
  if (allowUnauthenticated) {
    return <>{children}</>;
  }

  // If we reach here, middleware has already validated the session
  // Just render children - no client-side auth checks needed
  return <>{children}</>;
}