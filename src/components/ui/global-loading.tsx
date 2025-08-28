/**
 * THIN CLIENT: Global Loading Indicator
 * 
 * Placeholder for global loading state if needed.
 */

"use client";

import * as React from 'react';
import { cn } from '@/lib/utils';

export const GlobalLoadingIndicator: React.FC = () => {
  // THIN CLIENT: No loading store needed
  // Backend sends progress via WebSocket, UI stays minimal
  
  return null; // Backend handles all loading indication via WebSocket messages
};

/**
 * Simple Loading Overlay for specific components
 */
interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message = "Loading...",
  children,
  className
}) => {
  return (
    <div className={cn("relative", className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="bg-card border rounded-lg p-4 shadow-lg flex items-center space-x-3">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm font-medium">{message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Loading Button - simple local state only
 */
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  isLoading,
  loadingText = "Loading...",
  children,
  disabled,
  className,
  ...props
}) => {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex items-center justify-center space-x-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    >
      {isLoading && (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
      )}
      <span>{isLoading ? loadingText : children}</span>
    </button>
  );
};
