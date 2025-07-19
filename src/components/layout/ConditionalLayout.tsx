'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AppLayout from './AppLayout';
import { useAuthUI } from '@/lib/hooks/useAuthUI';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

// Loading component while checking authentication
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

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, isInitialized } = useAuthUI();
  
  // Pages that should NOT use AppLayout (public pages)
  const publicPaths = ['/login', '/signup'];
  const isPublicPath = publicPaths.includes(pathname);
  
  // Handle navigation side effects in useEffect to avoid render-time navigation
  useEffect(() => {
    console.log('[ConditionalLayout] AUTH STATE DEBUG:', {
      isAuthenticated,
      isLoading,
      isInitialized,
      isPublicPath,
      pathname,
      shouldRedirect: !isInitialized || isLoading
    });

    // Only proceed if authentication state is fully initialized
    if (!isInitialized || isLoading) {
      console.log('[ConditionalLayout] SKIPPING: Auth not ready - isInitialized:', isInitialized, 'isLoading:', isLoading);
      return;
    }

    if (!isAuthenticated && !isPublicPath) {
      // Redirect unauthenticated user to login for protected pages
      console.log('[ConditionalLayout] REDIRECTING: Unauthenticated user to login from:', pathname);
      router.push('/login');
    } else if (isAuthenticated && isPublicPath) {
      // Redirect authenticated user away from login page to dashboard
      console.log('[ConditionalLayout] REDIRECTING: Authenticated user to dashboard from:', pathname);
      router.push('/dashboard');
    } else {
      console.log('[ConditionalLayout] NO REDIRECT NEEDED - staying on:', pathname);
    }
  }, [isAuthenticated, isLoading, isInitialized, isPublicPath, pathname, router]);

  // ADDITIONAL: Force redirect check when authentication state changes
  useEffect(() => {
    if (isInitialized && !isLoading && isAuthenticated && isPublicPath) {
      console.log('[ConditionalLayout] FORCE REDIRECT: Authentication detected on public path:', pathname);
      router.push('/dashboard');
    }
  }, [isAuthenticated, isInitialized, isLoading]); // Simplified dependency array
  
  // Show loading while authentication is being checked
  if (!isInitialized || isLoading) {
    return <AuthLoadingFallback />;
  }
  
  // Authentication logic for rendering
  if (!isAuthenticated) {
    // User is not authenticated
    if (isPublicPath) {
      // Allow access to public pages (login, signup)
      return <>{children}</>;
    } else {
      // Show loading while redirecting to login
      return <AuthLoadingFallback />;
    }
  }
  
  // User is authenticated
  if (isPublicPath) {
    // Show loading while redirecting to dashboard
    return <AuthLoadingFallback />;
  }
  
  // Authenticated user accessing protected pages - show with AppLayout
  return (
    <AppLayout>
      {children}
    </AppLayout>
  );
}