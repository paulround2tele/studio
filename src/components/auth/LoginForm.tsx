'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
// import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Eye, EyeOff, Shield } from 'lucide-react';
import Link from 'next/link';

interface LoginFormData {
  email: string;
  password: string;
}

interface LoginFormProps {
  showSignUpLink?: boolean;
  title?: string;
  description?: string;
}

export function LoginForm({
  showSignUpLink = true,
  title = 'Welcome back to DomainFlow',
  description = 'Sign in to your account to continue'
}: LoginFormProps) {
  const router = useRouter();
  const { login, isLoading: authLoading, isLoginLoading } = useAuth();
  
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ARCHITECTURAL FIX: Restore direct redirect logic like all other components
  // This fixes the broken ConditionalLayout handoff that was causing login redirect failures

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setError('Please enter both email and password');
      return;
    }

    // Prevent double submissions
    if (isSubmitting || isLoginLoading) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    logger.debug('LOGIN_FORM', 'Form submission started', {
      email: formData.email,
      passwordLength: formData.password.length
    });

    try {
      const result = await login({
        email: formData.email,
        password: formData.password
      });

      logger.debug('LOGIN_FORM', 'Login result received', {
        success: result.success,
        hasError: !result.success
      });

      if (!result.success) {
        logger.warn('LOGIN_FORM', 'Login failed', { error: result.error });
        setError(result.error || 'Login failed. Please try again.');
      } else {
        logger.info('LOGIN_FORM', 'Login successful - auth state updated');
        // ✅ ARCHITECTURAL FIX: Let AdvancedConditionalLayout handle navigation
        // The layout will automatically redirect when auth state updates
        // This prevents dual navigation conflicts and ensures consistent routing
        setError(''); // Clear any previous errors
        
        logger.debug('LOGIN_FORM', 'Waiting for AdvancedConditionalLayout to handle redirect');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.';
      logger.error('LOGIN_FORM', 'Login exception', { error: errorMsg });
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading if auth is still loading
  if (authLoading) {
    logger.debug('LOGIN_FORM', 'Showing auth loading screen');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // RACE CONDITION FIX: Let ConditionalLayout handle authenticated user redirects
  // LoginForm will be unmounted by ConditionalLayout when user is authenticated

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                disabled={isSubmitting || isLoginLoading}
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  disabled={isSubmitting || isLoginLoading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting || isLoginLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>


            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || isLoginLoading}
            >
              {(isSubmitting || isLoginLoading) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Sign in Securely
                </>
              )}
            </Button>
          </form>

          {/* Additional Links */}
          <div className="mt-6 space-y-4">
            {showSignUpLink && (
              <div className="text-center">
                <span className="text-sm text-muted-foreground">
                  Don&apos;t have an account?{' '}
                  <Link 
                    href="/signup" 
                    className="text-primary hover:underline"
                  >
                    Sign up
                  </Link>
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginForm;