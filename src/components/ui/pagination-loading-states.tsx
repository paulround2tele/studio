/**
 * Loading states for pagination components
 * Compatible with backend PageInfo structure
 */

import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
      <Card className={cn("border-destructive/50", className)}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center space-y-4">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
            <div>
              <p className="text-sm font-medium text-destructive">Failed to load data</p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
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
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </CardContent>
      </Card>
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
        <p className="text-sm text-destructive mb-2">Failed to load more data</p>
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
        <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Loading more...</p>
      </div>
    );
  }

  if (!hasMore) {
    return (
      <div className={cn("text-center py-4", className)}>
        <p className="text-sm text-muted-foreground">No more data to load</p>
      </div>
    );
  }

  return null;
}