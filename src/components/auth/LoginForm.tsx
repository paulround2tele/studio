"use client";
import Input from "@/components/ta/form/input/InputField";
import Label from "@/components/ta/form/Label";
import Button from "@/components/ta/ui/button/Button";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import React, { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";

export default function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoginLoading } = useAuth();
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Get values from FormData (works with uncontrolled TailAdmin inputs)
    const formData = new globalThis.FormData(e.currentTarget);
    const email = (formData.get("email") as string)?.trim() || "";
    const password = (formData.get("password") as string) || "";
    
    // Submit-time validation
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }
    
    if (isSubmitting || isLoginLoading) {
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const result = await login({ email, password });
      
      if (!result.success) {
        setError(result.error || "Login failed. Please try again.");
      } else {
        // Redirect to the originally requested page or dashboard
        const redirectPath = searchParams?.get('redirect') || '/dashboard';
        router.replace(redirectPath);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isSubmitting || isLoginLoading;

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Sign In
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter your email and password to sign in
            </p>
          </div>
          <div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Email Field */}
                <div>
                  <Label htmlFor="signin-email">
                    Email <span className="text-error-500">*</span>
                  </Label>
                  <Input
                    id="signin-email"
                    type="email"
                    name="email"
                    placeholder="you@company.com"
                    disabled={isLoading}
                  />
                </div>
                
                {/* Password Field */}
                <div>
                  <Label htmlFor="signin-password">
                    Password <span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Enter your password"
                      disabled={isLoading}
                    />
                    <span
                      onClick={() => !isLoading && setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                      )}
                    </span>
                  </div>
                </div>
                
                {/* Error Display */}
                {error && (
                  <div className="rounded-lg border border-error-500 bg-error-50 dark:bg-error-500/15 p-3">
                    <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
                  </div>
                )}
                
                {/* Submit Button */}
                <div>
                  <Button className="w-full" size="sm" type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Signing in...
                      </span>
                    ) : (
                      "Sign in"
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export for backward compatibility with existing imports
export { SignInForm as LoginForm };
