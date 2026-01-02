'use client';

import LoginForm from '@/components/auth/LoginForm';

function LoginPageContent() {
  return (
    <div className="flex flex-col justify-center flex-1 min-h-screen p-6 overflow-hidden bg-white lg:flex-row dark:bg-gray-900">
      <LoginForm />
    </div>
  );
}

function _LoginPageFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-500 dark:text-gray-300">Loading login page...</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <LoginPageContent />;
}