'use client';

import { usePathname } from 'next/navigation';
import { useLayoutEffect, useRef } from 'react';
import AppLayout from './AppLayout';
import { useAuth } from '@/components/providers/AuthProvider';

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
  const { isAuthenticated, isLoading, isInitialized } = useAuth();
  
  // Track last auth state to avoid unnecessary reflows
  const lastAuthStateRef = useRef<boolean | null>(null);

  // Minimal monitor for debugging without triggering navigations
  useLayoutEffect(() => {
    if (lastAuthStateRef.current !== isAuthenticated) {
      lastAuthStateRef.current = isAuthenticated;
      console.log('[AdvancedConditionalLayout] auth state changed', {
        isAuthenticated,
        isInitialized,
        isLoading,
        pathname,
      });
    }
  }, [isAuthenticated, isInitialized, isLoading, pathname]);

  // PERFORMANCE OPTIMIZATION: Show loading only if both uninitialized AND loading
  // This prevents unnecessary "Checking authentication..." after successful login
  if (!isInitialized && isLoading) {
    return <AuthLoadingFallback />;
  }
  
  // If initialized but loading, allow rendering with current auth state
  // This prevents flashing loading screen during cache reads
  
  // Render logic with optimistic updates
  const publicPaths = ['/login', '/signup'];
  const _isPublicPath = publicPaths.includes(pathname);

  // Do not gate here; middleware/server components handle redirects.
  // Only wrap authenticated areas in AppLayout based on path heuristics.
  const appPaths = ['/dashboard', '/campaigns', '/personas', '/keyword-sets', '/proxies'];
  const isAppPath = appPaths.some((p) => pathname?.startsWith(p));
  if (isAppPath) return <AppLayout>{children}</AppLayout>;
  return <div className="min-h-screen bg-background">{children}</div>;
}