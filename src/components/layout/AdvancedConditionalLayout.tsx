'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useLayoutEffect, useRef, useCallback } from 'react';
import AppLayout from './AppLayout';
import { useCachedAuth } from '@/lib/hooks/useCachedAuth';

interface AdvancedConditionalLayoutProps {
  children: React.ReactNode;
}

// High-performance loading component
function AuthLoadingFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Checking authentication...</p>
      </div>
    </div>
  );
}

export default function AdvancedConditionalLayout({ children }: AdvancedConditionalLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, isInitialized, user } = useCachedAuth();
  
  // Navigation state management with refs for instant updates
  const navigationLockRef = useRef(false);
  const lastAuthStateRef = useRef<boolean | null>(null);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Public paths configuration
  const publicPaths = ['/login', '/signup'];
  const isPublicPath = publicPaths.includes(pathname);
  
  // Optimistic navigation handler with race condition prevention
  const handleNavigation = useCallback(() => {
    // Prevent navigation during transitions
    if (navigationLockRef.current) {
      console.log('[AdvancedConditionalLayout] NAVIGATION LOCKED - skipping redirect');
      return;
    }

    // Only proceed if auth state is stable and initialized
    if (!isInitialized || isLoading) {
      console.log('[AdvancedConditionalLayout] AUTH NOT READY - waiting for initialization', {
        isInitialized,
        isLoading,
        isAuthenticated,
        user: user?.email
      });
      return;
    }

    // Check if auth state actually changed to prevent unnecessary redirects
    if (lastAuthStateRef.current === isAuthenticated) {
      console.log('[AdvancedConditionalLayout] NO AUTH STATE CHANGE - skipping redirect', {
        current: lastAuthStateRef.current,
        new: isAuthenticated,
        pathname,
        user: user?.email
      });
      return;
    }

    // Update tracked auth state
    lastAuthStateRef.current = isAuthenticated;

    console.log('[AdvancedConditionalLayout] 🚨 NAVIGATION DECISION:', {
      isAuthenticated,
      isPublicPath,
      pathname,
      navigationLocked: navigationLockRef.current,
      userEmail: user?.email,
      timestamp: new Date().toISOString()
    });

    // Lock navigation during redirect
    navigationLockRef.current = true;

    // Clear any existing navigation timeout
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }

    // Optimistic redirect logic with debouncing
    if (!isAuthenticated && !isPublicPath) {
      console.log('[AdvancedConditionalLayout] REDIRECTING: Unauthenticated user to login');
      
      // Use immediate router push for fast redirects
      router.push('/login');
      
      // Unlock navigation after short delay
      navigationTimeoutRef.current = setTimeout(() => {
        navigationLockRef.current = false;
      }, 100);
      
    } else if (isAuthenticated && isPublicPath) {
      console.log('[AdvancedConditionalLayout] REDIRECTING: Authenticated user to dashboard');
      
      // Use immediate router push for fast redirects
      router.push('/dashboard');
      
      // Unlock navigation after short delay
      navigationTimeoutRef.current = setTimeout(() => {
        navigationLockRef.current = false;
      }, 100);
    } else {
      console.log('[AdvancedConditionalLayout] NO REDIRECT NEEDED - staying on:', pathname);
      // Unlock immediately if no redirect needed
      navigationLockRef.current = false;
    }
  }, [isAuthenticated, isLoading, isInitialized, isPublicPath, pathname, router]);

  // Use useLayoutEffect for synchronous execution (prevents visual flashing)
  useLayoutEffect(() => {
    handleNavigation();
  }, [handleNavigation]);

  // Cleanup navigation timeout on unmount
  useLayoutEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  // PERFORMANCE OPTIMIZATION: Show loading only if both uninitialized AND loading
  // This prevents unnecessary "Checking authentication..." after successful login
  if (!isInitialized && isLoading) {
    return <AuthLoadingFallback />;
  }
  
  // If initialized but loading, allow rendering with current auth state
  // This prevents flashing loading screen during cache reads
  
  // Render logic with optimistic updates
  if (!isAuthenticated) {
    // User is not authenticated
    if (isPublicPath) {
      // Allow access to public pages (login, signup) - render immediately
      return (
        <div className="min-h-screen bg-background">
          {children}
        </div>
      );
    } else {
      // Protected page accessed by unauthenticated user - show loading during redirect
      return <AuthLoadingFallback />;
    }
  } else {
    // User is authenticated
    if (isPublicPath) {
      // Authenticated user on public page - show loading during redirect
      return <AuthLoadingFallback />;
    } else {
      // Authenticated user on protected page - render with AppLayout immediately
      return <AppLayout>{children}</AppLayout>;
    }
  }
}