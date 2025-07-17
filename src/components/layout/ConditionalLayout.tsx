'use client';

import { usePathname, useRouter } from 'next/navigation';
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
  
  // Show loading while authentication is being checked
  if (!isInitialized || isLoading) {
    return <AuthLoadingFallback />;
  }
  
  // Authentication logic
  if (!isAuthenticated) {
    // User is not authenticated
    if (isPublicPath) {
      // Allow access to public pages (login, signup)
      return <>{children}</>;
    } else {
      // Redirect to login for protected pages
      if (typeof window !== 'undefined') {
        console.log('[ConditionalLayout] Redirecting unauthenticated user to login from:', pathname);
        router.push('/login');
      }
      return <AuthLoadingFallback />;
    }
  }
  
  // User is authenticated
  if (isPublicPath) {
    // Authenticated user trying to access login page - redirect to dashboard
    if (typeof window !== 'undefined') {
      console.log('[ConditionalLayout] Redirecting authenticated user to dashboard from:', pathname);
      router.push('/dashboard');
    }
    return <AuthLoadingFallback />;
  }
  
  // Authenticated user accessing protected pages - show with AppLayout
  return (
    <AppLayout>
      {children}
    </AppLayout>
  );
}