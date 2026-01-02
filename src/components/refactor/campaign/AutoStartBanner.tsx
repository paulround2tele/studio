/**
 * Auto-Start Banner Component
 * Shows initialization status during campaign auto-start
 */

import React from 'react';
import { AlertCircleIcon, LoaderIcon, CheckCircleIcon, XCircleIcon } from '@/icons';
import Badge from '@/components/ta/ui/badge/Badge';
import { cn } from '@/lib/utils';

export interface AutoStartBannerProps {
  status: 'initializing' | 'starting' | 'success' | 'error' | 'hidden';
  message?: string;
  campaignName?: string;
  error?: string;
  className?: string;
}

const statusConfig = {
  initializing: {
    icon: LoaderIcon,
    variant: 'default' as const,
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    iconColor: 'text-blue-500',
    animate: true,
    badge: 'Initializing',
    badgeVariant: 'secondary' as const
  },
  starting: {
    icon: LoaderIcon,
    variant: 'default' as const,
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    iconColor: 'text-yellow-500',
    animate: true,
    badge: 'Starting',
    badgeVariant: 'secondary' as const
  },
  success: {
    icon: CheckCircleIcon,
    variant: 'default' as const,
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    iconColor: 'text-green-500',
    animate: false,
    badge: 'Started Automatically',
    badgeVariant: 'secondary' as const
  },
  error: {
    icon: XCircleIcon,
    variant: 'destructive' as const,
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    iconColor: 'text-red-500',
    animate: false,
    badge: 'Auto-start Failed',
    badgeVariant: 'destructive' as const
  },
  hidden: {
    icon: AlertCircleIcon,
    variant: 'default' as const,
    bgColor: '',
    borderColor: '',
    iconColor: '',
    animate: false,
    badge: '',
    badgeVariant: 'secondary' as const
  }
};

export function AutoStartBanner({ 
  status, 
  message, 
  campaignName,
  error,
  className 
}: AutoStartBannerProps) {
  if (status === 'hidden') {
    return null;
  }

  const config = statusConfig[status];
  const Icon = config.icon;

  const getDefaultMessage = () => {
    switch (status) {
      case 'initializing':
        return `Initializing campaign "${campaignName}" in auto mode...`;
      case 'starting':
        return `Starting discovery phase for "${campaignName}" automatically...`;
      case 'success':
        return `Campaign "${campaignName}" has been started automatically and is now running.`;
      case 'error':
        return error || 'Auto-start failed. You can start the campaign manually.';
      default:
        return '';
    }
  };

  // Map badge variants to TailAdmin colors
  const getBadgeColor = () => {
    switch (status) {
      case 'error': return 'error';
      case 'success': return 'success';
      case 'starting': return 'warning';
      default: return 'info';
    }
  };

  return (
    <div 
      className={cn(
        "flex items-center gap-3 transition-all duration-300 rounded-lg border p-4",
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      <Icon 
        className={cn(
          "h-4 w-4",
          config.iconColor,
          config.animate && "animate-spin"
        )}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge color={getBadgeColor()} size="sm">
            {config.badge}
          </Badge>
          {status === 'success' && (
            <span className="text-xs text-gray-500">
              Auto-start completed successfully
            </span>
          )}
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {message || getDefaultMessage()}
        </p>
      </div>
    </div>
  );
}

/**
 * Hook to manage auto-start banner state
 */
export function useAutoStartBanner(campaignName?: string) {
  const [bannerStatus, setBannerStatus] = React.useState<AutoStartBannerProps['status']>('hidden');
  const [bannerMessage, setBannerMessage] = React.useState<string>('');
  const [bannerError, setBannerError] = React.useState<string>('');

  const showInitializing = React.useCallback((message?: string) => {
    setBannerStatus('initializing');
    setBannerMessage(message || '');
    setBannerError('');
  }, []);

  const showStarting = React.useCallback((message?: string) => {
    setBannerStatus('starting');
    setBannerMessage(message || '');
    setBannerError('');
  }, []);

  const showSuccess = React.useCallback((message?: string) => {
    setBannerStatus('success');
    setBannerMessage(message || '');
    setBannerError('');
    // Auto-hide success banner after 5 seconds
    setTimeout(() => setBannerStatus('hidden'), 5000);
  }, []);

  const showError = React.useCallback((error: string, message?: string) => {
    setBannerStatus('error');
    setBannerMessage(message || '');
    setBannerError(error);
    // Auto-hide error banner after 8 seconds
    setTimeout(() => setBannerStatus('hidden'), 8000);
  }, []);

  const hide = React.useCallback(() => {
    setBannerStatus('hidden');
    setBannerMessage('');
    setBannerError('');
  }, []);

  return {
    bannerProps: {
      status: bannerStatus,
      message: bannerMessage,
      error: bannerError,
      campaignName
    },
    showInitializing,
    showStarting,
    showSuccess,
    showError,
    hide
  };
}