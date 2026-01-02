/**
 * Loading states for pagination components
 * Compatible with backend PageInfo structure
 */

import React from 'react';
import { LoaderIcon, AlertCircleIcon } from '@/icons';
import Button from '@/components/ta/ui/button/Button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface PaginationLoadingStatesProps {
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
  className?: string;
}

export function PaginationLoadingStates({ 
  isLoading = false, 
  error, 
  onRetry, 
  className 
}: PaginationLoadingStatesProps) {
  if (error) {
    return (
      <div className={cn("rounded-2xl border border-error-200 dark:border-error-800 bg-white dark:bg-white/[0.03]", className)}>
        <div className="flex items-center justify-center py-8">
          <div className="text-center space-y-4">
            <AlertCircleIcon className="h-8 w-8 text-error-500 mx-auto" />
            <div>
              <p className="text-sm font-medium text-error-600">Failed to load data</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{error}</p>
            </div>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="mt-4"
              >
                Try Again
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn("rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]", className)}>
        <div className="py-8 px-6">
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <LoaderIcon className="h-4 w-4 animate-spin" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Loading...</span>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export interface InfiniteScrollLoaderProps {
  isLoading?: boolean;
  hasMore?: boolean;
  error?: string;
  onLoadMore?: () => void;
  className?: string;
}

export function InfiniteScrollLoader({
  isLoading = false,
  hasMore = true,
  error,
  onLoadMore,
  className
}: InfiniteScrollLoaderProps) {
  if (error) {
    return (
      <div className={cn("text-center py-4", className)}>
        <p className="text-sm text-error-500 mb-2">Failed to load more data</p>
        {onLoadMore && (
          <Button variant="outline" size="sm" onClick={onLoadMore}>
            Try Again
          </Button>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn("text-center py-4", className)}>
        <LoaderIcon className="h-4 w-4 animate-spin mx-auto mb-2" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading more...</p>
      </div>
    );
  }

  if (!hasMore) {
    return (
      <div className={cn("text-center py-4", className)}>
        <p className="text-sm text-gray-500 dark:text-gray-400">No more data to load</p>
      </div>
    );
  }

  return null;
}