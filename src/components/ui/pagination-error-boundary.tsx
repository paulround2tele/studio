/**
 * Error boundary for pagination components
 * Handles pagination-specific errors gracefully
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { WarningTriangleIcon, RefreshIcon } from '@/icons';
import Button from '@/components/ta/ui/button/Button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PaginationErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface PaginationErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class PaginationErrorBoundary extends Component<
  PaginationErrorBoundaryProps,
  PaginationErrorBoundaryState
> {
  constructor(props: PaginationErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): PaginationErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Pagination Error Boundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="rounded-2xl border border-error-200 dark:border-error-800 bg-white dark:bg-white/[0.03]">
          <div className="px-6 py-5 border-b border-error-200 dark:border-error-800">
            <h3 className="text-lg font-semibold text-error-600 flex items-center gap-2">
              <WarningTriangleIcon className="h-5 w-5" />
              Pagination Error
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                Something went wrong while loading paginated data. This might be due to:
                <ul className="mt-2 ml-4 list-disc text-sm">
                  <li>Network connectivity issues</li>
                  <li>Backend API changes</li>
                  <li>Data format mismatches</li>
                </ul>
              </AlertDescription>
            </Alert>
            
            {this.state.error && (
              <details className="mt-4">
                <summary className="text-sm font-medium cursor-pointer text-gray-500 dark:text-gray-400">
                  Technical Details
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 dark:bg-white/[0.03] p-2 rounded overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReset}
                startIcon={<RefreshIcon className="h-4 w-4" />}
              >
                Try Again
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export function usePaginationErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    console.error('Pagination error captured:', error);
    setError(error);
  }, []);

  return {
    error,
    resetError,
    captureError,
    hasError: !!error
  };
}