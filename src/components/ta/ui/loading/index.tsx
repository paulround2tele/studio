/**
 * TailAdmin Loading Components
 * 
 * Standardized loading states for the application.
 * Uses TailAdmin styling patterns with brand colors.
 */

"use client";

import React from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// SPINNER COMPONENT
// ============================================================================

export interface SpinnerProps {
  /** Size of the spinner */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Color variant */
  variant?: 'brand' | 'gray' | 'white' | 'current';
  /** Additional class names */
  className?: string;
}

const spinnerSizes = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

const spinnerColors = {
  brand: 'text-brand-500',
  gray: 'text-gray-400 dark:text-gray-500',
  white: 'text-white',
  current: 'text-current',
};

/**
 * TailAdmin Spinner - Simple rotating loader
 */
export function Spinner({ size = 'md', variant = 'brand', className }: SpinnerProps) {
  return (
    <svg
      className={cn('animate-spin', spinnerSizes[size], spinnerColors[variant], className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// ============================================================================
// SKELETON COMPONENT
// ============================================================================

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Width - can be Tailwind class or CSS value */
  width?: string;
  /** Height - can be Tailwind class or CSS value */
  height?: string;
  /** Shape variant */
  shape?: 'default' | 'circle' | 'rounded';
  /** Show shimmer animation */
  shimmer?: boolean;
}

/**
 * TailAdmin Skeleton - Placeholder loading state
 */
export function Skeleton({ 
  width,
  height,
  shape = 'default',
  shimmer = false,
  className,
  style,
  ...props 
}: SkeletonProps) {
  const shapeClasses = {
    default: 'rounded',
    circle: 'rounded-full',
    rounded: 'rounded-lg',
  };

  const baseStyles: React.CSSProperties = {
    ...style,
    ...(width && !width.startsWith('w-') ? { width } : {}),
    ...(height && !height.startsWith('h-') ? { height } : {}),
  };

  return (
    <div
      className={cn(
        'animate-pulse bg-gray-200 dark:bg-gray-700',
        shapeClasses[shape],
        width?.startsWith('w-') && width,
        height?.startsWith('h-') && height,
        shimmer && 'bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] animate-shimmer',
        className
      )}
      style={baseStyles}
      {...props}
    />
  );
}

// ============================================================================
// LOADING CARD COMPONENT
// ============================================================================

export interface LoadingCardProps {
  /** Number of skeleton lines */
  lines?: number;
  /** Show header skeleton */
  showHeader?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * TailAdmin Loading Card - Card with skeleton content
 */
export function LoadingCard({ lines = 3, showHeader = true, className }: LoadingCardProps) {
  return (
    <div className={cn(
      'rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]',
      className
    )}>
      {showHeader && (
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
      )}
      <div className="p-4 sm:p-6 space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton 
            key={i} 
            className={cn(
              'h-4',
              i === lines - 1 ? 'w-2/3' : 'w-full'
            )} 
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// LOADING TABLE COMPONENT
// ============================================================================

export interface LoadingTableProps {
  /** Number of rows */
  rows?: number;
  /** Number of columns */
  cols?: number;
  /** Show header skeleton */
  showHeader?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * TailAdmin Loading Table - Table with skeleton rows
 */
export function LoadingTable({ 
  rows = 5, 
  cols = 4, 
  showHeader = true, 
  className 
}: LoadingTableProps) {
  return (
    <div className={cn(
      'overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]',
      className
    )}>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          {showHeader && (
            <thead className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                {Array.from({ length: cols }).map((_, i) => (
                  <th key={i} className="px-5 py-3 sm:px-6">
                    <Skeleton className="h-4 w-20" />
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                {Array.from({ length: cols }).map((_, colIndex) => (
                  <td key={colIndex} className="px-5 py-4 sm:px-6">
                    <Skeleton 
                      className={cn(
                        'h-4',
                        colIndex === 0 ? 'w-32' : colIndex === cols - 1 ? 'w-16' : 'w-24'
                      )} 
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// PAGE LOADING COMPONENT
// ============================================================================

export interface PageLoadingProps {
  /** Loading message */
  message?: string;
  /** Show message */
  showMessage?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * TailAdmin Page Loading - Full page loader
 */
export function PageLoading({ 
  message = 'Loading...', 
  showMessage = true, 
  className 
}: PageLoadingProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center min-h-[400px]',
      className
    )}>
      <Spinner size="lg" variant="brand" />
      {showMessage && (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{message}</p>
      )}
    </div>
  );
}

// ============================================================================
// LOADING OVERLAY COMPONENT
// ============================================================================

export interface LoadingOverlayProps {
  /** Whether the overlay is active */
  isLoading: boolean;
  /** Loading message */
  message?: string;
  /** Children content */
  children: React.ReactNode;
  /** Blur backdrop */
  blur?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * TailAdmin Loading Overlay - Overlay loader on content
 */
export function LoadingOverlay({ 
  isLoading, 
  message, 
  children, 
  blur = true,
  className 
}: LoadingOverlayProps) {
  return (
    <div className={cn('relative', className)}>
      {children}
      {isLoading && (
        <div className={cn(
          'absolute inset-0 flex items-center justify-center z-40',
          'bg-white/50 dark:bg-gray-900/50',
          blur && 'backdrop-blur-sm'
        )}>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-theme-md flex items-center space-x-3">
            <Spinner size="sm" variant="brand" />
            {message && (
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{message}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// INLINE LOADING COMPONENT
// ============================================================================

export interface InlineLoadingProps {
  /** Loading text */
  text?: string;
  /** Size */
  size?: 'sm' | 'md';
  /** Additional class names */
  className?: string;
}

/**
 * TailAdmin Inline Loading - Inline text with spinner
 */
export function InlineLoading({ 
  text = 'Loading...', 
  size = 'sm', 
  className 
}: InlineLoadingProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Spinner size={size === 'sm' ? 'xs' : 'sm'} variant="current" />
      <span className={cn(
        'text-gray-500 dark:text-gray-400',
        size === 'sm' ? 'text-xs' : 'text-sm'
      )}>
        {text}
      </span>
    </span>
  );
}

// ============================================================================
// BUTTON LOADING STATE
// ============================================================================

export interface ButtonLoadingProps {
  /** Whether loading */
  isLoading: boolean;
  /** Loading text */
  loadingText?: string;
  /** Normal content */
  children: React.ReactNode;
}

/**
 * TailAdmin Button Loading Content - Use inside buttons
 */
export function ButtonLoadingContent({ 
  isLoading, 
  loadingText, 
  children 
}: ButtonLoadingProps) {
  if (!isLoading) {
    return <>{children}</>;
  }

  return (
    <>
      <Spinner size="xs" variant="current" className="mr-2" />
      {loadingText || children}
    </>
  );
}

// ============================================================================
// SKELETON PRESETS
// ============================================================================

/**
 * TailAdmin Avatar Skeleton
 */
export function AvatarSkeleton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };
  return <Skeleton className={sizes[size]} shape="circle" />;
}

/**
 * TailAdmin Text Skeleton Block
 */
export function TextSkeleton({ 
  lines = 3, 
  className 
}: { 
  lines?: number; 
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            i === lines - 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  );
}

/**
 * TailAdmin Badge Skeleton
 */
export function BadgeSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn('h-5 w-16 rounded-full', className)} />;
}

/**
 * TailAdmin Button Skeleton
 */
export function ButtonSkeleton({ 
  size = 'md' 
}: { 
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizes = {
    sm: 'h-8 w-20',
    md: 'h-10 w-24',
    lg: 'h-12 w-32',
  };
  return <Skeleton className={cn(sizes[size], 'rounded-lg')} />;
}
