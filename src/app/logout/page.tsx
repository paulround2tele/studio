// src/app/logout/page.tsx
// Simplified logout page for thin client architecture
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ta/ui/button/Button';
import { LoaderIcon, LogOutIcon, HomeIcon } from '@/icons';
import Link from 'next/link';

export default function LogoutPage() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutComplete, setLogoutComplete] = useState(false);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      // THIN CLIENT: Call backend logout API directly
  await fetch('/api/v2/auth/logout', { method: 'POST', credentials: 'include' });
      setLogoutComplete(true);
      
      // PERFORMANCE FIX: Immediate redirect instead of 2-second delay
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      setLogoutComplete(true);
      // PERFORMANCE FIX: Immediate redirect even on error
      router.push('/login');
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
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/10">
              <LoaderIcon className="h-6 w-6 animate-spin text-brand-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Signing out...
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Please wait while we securely sign you out.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show logout complete
  if (logoutComplete) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-50 dark:bg-success-500/10">
              <LogOutIcon className="h-6 w-6 text-success-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Signed out successfully
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              You have been securely signed out. Redirecting to login...
            </p>
          </div>
          <div className="mt-6 space-y-3">
            <Link href="/login" className="block">
              <Button className="w-full">Go to Sign In</Button>
            </Link>
            <Link href="/" className="block">
              <Button variant="outline" className="w-full" startIcon={<HomeIcon className="h-4 w-4" />}>
                Go to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show logout confirmation (fallback)
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/10">
            <LogOutIcon className="h-6 w-6 text-brand-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Sign out of DomainFlow?
          </h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Are you sure you want to sign out of your account?
          </p>
        </div>
        <div className="mt-6 space-y-3">
          <Button onClick={handleManualLogout} className="w-full" disabled={isLoggingOut}>
            {isLoggingOut ? (
              <>
                <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                Signing out...
              </>
            ) : (
              'Yes, sign out'
            )}
          </Button>
          <Link href="/" className="block">
            <Button variant="outline" className="w-full">Cancel</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}