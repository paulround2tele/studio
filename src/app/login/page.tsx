// src/app/login/page.tsx
// Login page with authentication flow
'use client';

import { LoginForm } from '@/components/auth/LoginForm';
import { Suspense, useEffect, useState } from 'react';
import { NoSSR } from '@/components/providers/NoSSR';

function LoginPageContent() {
  return (
    <div className="min-h-screen bg-background">
      <LoginForm
        title="Welcome back to DomainFlow"
        description="Sign in to your account to continue"
        showSignUpLink={true}
      />
    </div>
  );
}

function LoginPageFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-300">Loading login page...</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Prevent hydration mismatch by ensuring client-side rendering
  if (!isClient) {
    return <LoginPageFallback />;
  }

  return (
    <NoSSR fallback={<LoginPageFallback />}>
      <Suspense fallback={<LoginPageFallback />}>
        <LoginPageContent />
      </Suspense>
    </NoSSR>
  );
}