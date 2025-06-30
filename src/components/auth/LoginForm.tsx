'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthUI } from '@/lib/hooks/useAuthUI';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Eye, EyeOff, Shield } from 'lucide-react';
import Link from 'next/link';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface LoginFormProps {
  redirectTo?: string;
  showSignUpLink?: boolean;
  title?: string;
  description?: string;
}

export function LoginForm({
  redirectTo,
  showSignUpLink = true,
  title = 'Welcome back to DomainFlow',
  description = 'Sign in to your account to continue'
}: LoginFormProps) {
  const { login, isAuthenticated, isLoading: authLoading } = useAuthUI();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      const redirectParam = searchParams.get('redirect');
      const redirectUrl = redirectParam || redirectTo || '/dashboard';
      router.push(redirectUrl);
    }
  }, [isAuthenticated, authLoading, router, searchParams, redirectTo]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    setError(null);

    // DIAGNOSTIC LOGGING
    console.log('LOGIN DIAGNOSTIC - Form submission started');
    console.log('LOGIN DIAGNOSTIC - Email:', formData.email);
    console.log('LOGIN DIAGNOSTIC - Password length:', formData.password.length);
    console.log('LOGIN DIAGNOSTIC - Remember me:', formData.rememberMe);

    try {
      const result = await login({
        email: formData.email,
        password: formData.password,
        rememberMe: formData.rememberMe
      });

      console.log('LOGIN DIAGNOSTIC - Login result:', {
        success: result.success,
        error: result.error,
        hasUser: !!result.user
      });

      if (!result.success) {
        console.log('LOGIN DIAGNOSTIC - Login failed with error:', result.error);
        setError(result.error || 'Login failed. Please try again.');
      } else {
        console.log('LOGIN DIAGNOSTIC - Login succeeded, user:', result.user);
      }
    } catch (error) {
      console.error('LOGIN DIAGNOSTIC - Exception during login:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading if auth is still loading
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if already authenticated
  if (isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

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
                disabled={isLoading}
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
                  disabled={isLoading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="rememberMe"
                checked={formData.rememberMe}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, rememberMe: !!checked }))}
                disabled={isLoading}
              />
              <Label htmlFor="rememberMe" className="text-sm">
                Remember me
              </Label>
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
              disabled={isLoading}
            >
              {isLoading ? (
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