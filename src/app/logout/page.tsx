// src/app/logout/page.tsx
// Simplified logout page for thin client architecture
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LogOut, Home } from 'lucide-react';
import Link from 'next/link';

export default function LogoutPage() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutComplete, setLogoutComplete] = useState(false);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      // THIN CLIENT: Call backend logout API directly
      await fetch('/api/v2/auth/logout', { method: 'POST' });
      setLogoutComplete(true);
      
      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error) {
      console.error('Logout error:', error);
      setLogoutComplete(true);
      // Still redirect even on error
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    }
  }, [router]);

  // Auto-logout when page loads (user clicked logout)
  useEffect(() => {
    if (!isLoggingOut && !logoutComplete) {
      handleLogout();
    }
  }, [handleLogout, isLoggingOut, logoutComplete]);

  const handleManualLogout = async () => {
    await handleLogout();
  };

  // Show logout in progress
  if (isLoggingOut && !logoutComplete) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <CardTitle>Signing out...</CardTitle>
            <CardDescription>
              Please wait while we securely sign you out.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Show logout complete
  if (logoutComplete) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <LogOut className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Signed out successfully</CardTitle>
            <CardDescription>
              You have been securely signed out. Redirecting to login...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full">
              <Link href="/login">Go to Sign In</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Go to Home
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show logout confirmation (fallback)
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <LogOut className="h-6 w-6" />
          </div>
          <CardTitle>Sign out of DomainFlow?</CardTitle>
          <CardDescription>
            Are you sure you want to sign out of your account?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleManualLogout} className="w-full" disabled={isLoggingOut}>
            {isLoggingOut ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing out...
              </>
            ) : (
              'Yes, sign out'
            )}
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/">Cancel</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}