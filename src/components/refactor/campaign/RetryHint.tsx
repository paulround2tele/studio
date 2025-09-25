/**
 * Retry Hint Component
 * Shows retry suggestions and fallback UI for failed pipelines
 */

import React from 'react';
import { AlertTriangle, RefreshCw, Settings, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface RetryHintProps {
  variant: 'auto-start-failed' | 'phase-failed' | 'connection-failed' | 'manual-required';
  campaignId?: string;
  phaseName?: string;
  errorCode?: string;
  errorMessage?: string;
  onRetry?: () => void;
  onManualStart?: () => void;
  onRefreshStatus?: () => void;
  className?: string;
}

const variantConfig = {
  'auto-start-failed': {
    icon: AlertTriangle,
    title: 'Auto-Start Failed',
    severity: 'warning' as const,
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    iconColor: 'text-yellow-600',
    badge: 'Auto-Start Failed',
    badgeVariant: 'destructive' as const
  },
  'phase-failed': {
    icon: AlertTriangle,
    title: 'Phase Failed',
    severity: 'error' as const,
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    iconColor: 'text-red-600',
    badge: 'Failed',
    badgeVariant: 'destructive' as const
  },
  'connection-failed': {
    icon: RefreshCw,
    title: 'Connection Issues',
    severity: 'info' as const,
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    iconColor: 'text-blue-600',
    badge: 'Connection Issue',
    badgeVariant: 'secondary' as const
  },
  'manual-required': {
    icon: Settings,
    title: 'Manual Action Required',
    severity: 'info' as const,
    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
    borderColor: 'border-gray-200 dark:border-gray-800',
    iconColor: 'text-gray-600',
    badge: 'Manual Action',
    badgeVariant: 'outline' as const
  }
};

export function RetryHint({ 
  variant, 
  campaignId,
  phaseName,
  errorCode,
  errorMessage,
  onRetry,
  onManualStart,
  onRefreshStatus,
  className 
}: RetryHintProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  const getDescription = () => {
    switch (variant) {
      case 'auto-start-failed':
        return `The campaign was created successfully, but the ${phaseName || 'discovery'} phase could not be started automatically. You can start it manually or retry the auto-start.`;
      case 'phase-failed':
        return `The ${phaseName || 'current'} phase encountered an error and failed to complete. You can retry the phase or check the configuration.`;
      case 'connection-failed':
        return 'Real-time updates are currently unavailable. You can manually refresh the status or wait for the connection to be restored.';
      case 'manual-required':
        return `Manual configuration is required before proceeding with the ${phaseName || 'next'} phase. Please review the settings and start when ready.`;
      default:
        return errorMessage || 'An issue occurred. Please try again or contact support.';
    }
  };

  const getTroubleshootingTips = () => {
    switch (variant) {
      case 'auto-start-failed':
        return [
          'Check if discovery phase configuration is complete',
          'Verify that required personas and proxies are available',
          'Ensure the campaign has proper permissions'
        ];
      case 'phase-failed':
        return [
          'Review the phase configuration settings',
          'Check resource availability (personas, proxies)',
          'Look for validation errors in the configuration'
        ];
      case 'connection-failed':
        return [
          'Check your internet connection',
          'Try refreshing the page',
          'Verify the server is responding'
        ];
      case 'manual-required':
        return [
          'Configure required phase settings',
          'Select appropriate personas and proxies',
          'Review targeting and validation options'
        ];
    }
  };

  return (
    <Card className={cn(
      "border transition-all duration-200",
      config.bgColor,
      config.borderColor,
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Icon className={cn("h-5 w-5", config.iconColor)} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{config.title}</CardTitle>
              <Badge variant={config.badgeVariant} className="text-xs">
                {config.badge}
              </Badge>
            </div>
            {errorCode && (
              <p className="text-xs text-gray-500 mt-1">
                Error Code: {errorCode}
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <CardDescription className="text-sm">
          {getDescription()}
        </CardDescription>

        {errorMessage && errorMessage !== getDescription() && (
          <Alert className="border-gray-200 dark:border-gray-700">
            <AlertDescription className="text-xs">
              <strong>Details:</strong> {errorMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {onRetry && (variant === 'auto-start-failed' || variant === 'phase-failed') && (
            <Button onClick={onRetry} size="sm" variant="default">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry {variant === 'auto-start-failed' ? 'Auto-Start' : 'Phase'}
            </Button>
          )}
          
          {onManualStart && (
            <Button onClick={onManualStart} size="sm" variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Start Manually
            </Button>
          )}
          
          {onRefreshStatus && variant === 'connection-failed' && (
            <Button onClick={onRefreshStatus} size="sm" variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Status
            </Button>
          )}
          
          <Button size="sm" variant="ghost" onClick={() => window.open('/docs/troubleshooting', '_blank')}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Troubleshooting Guide
          </Button>
        </div>

        {/* Troubleshooting tips */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Quick Tips:
          </h4>
          <ul className="space-y-1">
            {getTroubleshootingTips().map((tip, index) => (
              <li key={index} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
                <span className="text-gray-400 mt-1">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Hook to manage retry hint state
 */
export function useRetryHint() {
  const [retryHintProps, setRetryHintProps] = React.useState<RetryHintProps | null>(null);

  const showAutoStartFailed = React.useCallback((campaignId: string, errorMessage?: string, errorCode?: string) => {
    setRetryHintProps({
      variant: 'auto-start-failed',
      campaignId,
      phaseName: 'discovery',
      errorMessage,
      errorCode
    });
  }, []);

  const showPhaseFailed = React.useCallback((campaignId: string, phaseName: string, errorMessage?: string, errorCode?: string) => {
    setRetryHintProps({
      variant: 'phase-failed',
      campaignId,
      phaseName,
      errorMessage,
      errorCode
    });
  }, []);

  const showConnectionFailed = React.useCallback(() => {
    setRetryHintProps({
      variant: 'connection-failed'
    });
  }, []);

  const showManualRequired = React.useCallback((campaignId: string, phaseName: string) => {
    setRetryHintProps({
      variant: 'manual-required',
      campaignId,
      phaseName
    });
  }, []);

  const hide = React.useCallback(() => {
    setRetryHintProps(null);
  }, []);

  return {
    retryHintProps,
    showAutoStartFailed,
    showPhaseFailed,
    showConnectionFailed,
    showManualRequired,
    hide
  };
}