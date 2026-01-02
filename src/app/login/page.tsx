import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';
import { Suspense } from 'react';

// Loading fallback for the login form
function LoginFormFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-500 dark:text-gray-300">Loading login page...</p>
      </div>
    </div>
  );
}

export default async function LoginPage() {
  // Server-side check: if user has a session cookie, redirect to dashboard
  // Note: The middleware already handles this, but this is a fallback for direct access
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('domainflow_session');
  
  if (sessionCookie?.value) {
    // Cookie exists - middleware already verified signature, redirect to dashboard
    redirect('/dashboard');
  }

  return (
    <div className="flex flex-col justify-center flex-1 min-h-screen p-6 overflow-hidden bg-white lg:flex-row dark:bg-gray-900">
      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}