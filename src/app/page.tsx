'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Simple immediate redirect to dashboard
    // Middleware ensures only authenticated users reach this page
    console.log('[HomePage] Redirecting authenticated user to dashboard');
    router.replace('/dashboard');
  }, [router]);

  // Show loading while redirect happens
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}
