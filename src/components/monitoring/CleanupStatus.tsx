import React from 'react';
import Badge from '@/components/ta/ui/badge/Badge';
import Button from '@/components/ta/ui/button/Button';
import { 
  Trash2Icon, 
  ClockIcon, 
  WarningTriangleIcon, 
  CheckCircleIcon,
  RefreshIcon,
  PlayIcon
} from '@/icons';
import { useGetCleanupStatusQuery, useForceCleanupCampaignMutation } from '@/store/api/monitoringApi';
import type { CleanupStatus } from '@/store/api/monitoringApi';

interface CleanupStatusProps {
  variant?: 'full' | 'compact';
  campaignId?: string; // If provided, show force cleanup option for specific campaign
}

/**
 * Campaign cleanup status component
 * Displays cleanup status from our resource cleanup service
 */
export const CleanupStatusComponent: React.FC<CleanupStatusProps> = ({ 
  variant = 'full',
  campaignId 
}) => {
  const { 
    data: cleanupData, 
    isLoading, 
    error,
    refetch 
  } = useGetCleanupStatusQuery(undefined, {
    pollingInterval: 60000, // Refresh every minute
  });

  const [forceCleanup, { isLoading: isCleanupLoading }] = useForceCleanupCampaignMutation();

  const handleForceCleanup = async () => {
    if (!campaignId) return;
    
    try {
      await forceCleanup(campaignId).unwrap();
      // Refresh the status after cleanup
      refetch();
    } catch (error) {
      console.error('Failed to force cleanup:', error);
    }
  };

  // Format time since last cleanup
  const formatTimeSince = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Get cleanup status color
  const getCleanupStatusColor = (data: CleanupStatus): 'error' | 'warning' | 'success' => {
    if (data.cleanup_errors.length > 0) return 'error';
    if (data.campaigns_awaiting_cleanup > 10) return 'warning';
    return 'success';
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90 flex items-center gap-2">
            <Trash2Icon className="h-5 w-5" />
            Resource Cleanup
          </h3>
        </div>
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-8 w-8 border-b-2 border-brand-500 rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90 flex items-center gap-2">
            <Trash2Icon className="h-5 w-5" />
            Resource Cleanup
          </h3>
        </div>
        <div className="p-4 sm:p-6">
          <div className="text-center py-8">
            <WarningTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">Failed to load cleanup status</p>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshIcon className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!cleanupData) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90 flex items-center gap-2">
            <Trash2Icon className="h-5 w-5" />
            Resource Cleanup
          </h3>
        </div>
        <div className="p-4 sm:p-6">
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No cleanup data available
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="w-full rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-medium text-gray-800 dark:text-white/90 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Trash2Icon className="h-4 w-4" />
              Cleanup
            </span>
            <Badge color={getCleanupStatusColor(cleanupData)}>
              {cleanupData.campaigns_awaiting_cleanup} pending
            </Badge>
          </h3>
        </div>
        <div className="p-4 pt-2">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {cleanupData.total_campaigns_tracked} total tracked
          </div>
          {cleanupData.cleanup_errors.length > 0 && (
            <div className="text-xs text-red-600 mt-1">
              {cleanupData.cleanup_errors.length} error(s)
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-base font-medium text-gray-800 dark:text-white/90 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Trash2Icon className="h-5 w-5" />
            Resource Cleanup Status
          </span>
          <div className="flex items-center gap-2">
            <Badge color={getCleanupStatusColor(cleanupData)}>
              {cleanupData.campaigns_awaiting_cleanup} awaiting cleanup
            </Badge>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshIcon className="h-4 w-4" />
            </Button>
          </div>
        </h3>
      </div>
      <div className="p-4 sm:p-6">
        {/* Cleanup Statistics */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="text-2xl font-bold text-brand-500">
              {cleanupData.total_campaigns_tracked}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Tracked</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className={`text-2xl font-bold ${cleanupData.campaigns_awaiting_cleanup > 10 ? 'text-yellow-600' : 'text-green-600'}`}>
              {cleanupData.campaigns_awaiting_cleanup}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Awaiting Cleanup</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className={`text-2xl font-bold ${cleanupData.cleanup_errors.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {cleanupData.cleanup_errors.length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Cleanup Errors</div>
          </div>
        </div>

        {/* Last Cleanup */}
        <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Last cleanup run:</span>
          </div>
          <span className="font-medium">
            {formatTimeSince(cleanupData.last_cleanup_run)}
          </span>
        </div>

        {/* Force Cleanup for Specific Campaign */}
        {campaignId && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Force Cleanup Campaign</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Immediately clean up resources for campaign {campaignId}
                </div>
              </div>
              <Button 
                onClick={handleForceCleanup} 
                disabled={isCleanupLoading}
                variant="outline" 
                size="sm"
              >
                {isCleanupLoading ? (
                  <RefreshIcon className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <PlayIcon className="h-4 w-4 mr-2" />
                )}
                Force Cleanup
              </Button>
            </div>
          </div>
        )}

        {/* Cleanup Errors */}
        {cleanupData.cleanup_errors.length > 0 && (
          <div className="space-y-2">
            <div className="font-medium text-sm flex items-center gap-2 text-red-600">
              <WarningTriangleIcon className="h-4 w-4" />
              Cleanup Errors ({cleanupData.cleanup_errors.length})
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {cleanupData.cleanup_errors.map((error, index) => (
                <div key={index} className="text-sm text-red-700 bg-red-50 p-2 rounded border border-red-200">
                  {error}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Success Message */}
        {cleanupData.cleanup_errors.length === 0 && cleanupData.campaigns_awaiting_cleanup === 0 && (
          <div className="text-center py-4 text-green-600">
            <CheckCircleIcon className="h-8 w-8 mx-auto mb-2" />
            <div className="text-sm font-medium">All campaigns cleaned up successfully</div>
          </div>
        )}

        {/* Performance Status */}
        {cleanupData.campaigns_awaiting_cleanup > 0 && cleanupData.cleanup_errors.length === 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800">
              <ClockIcon className="h-4 w-4" />
              <span className="text-sm font-medium">
                {cleanupData.campaigns_awaiting_cleanup} campaign(s) scheduled for cleanup
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CleanupStatusComponent;
