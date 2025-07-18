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
    // Only proceed if authentication state is fully initialized
    if (!isInitialized || isLoading) {
      return;
    }

    if (!isAuthenticated && !isPublicPath) {
      // Redirect unauthenticated user to login for protected pages
      console.log('[ConditionalLayout] Redirecting unauthenticated user to login from:', pathname);
      router.push('/login');
    } else if (isAuthenticated && isPublicPath) {
      // Redirect authenticated user away from login page to dashboard
      console.log('[ConditionalLayout] Redirecting authenticated user to dashboard from:', pathname);
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, isInitialized, isPublicPath, pathname, router]);
  
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