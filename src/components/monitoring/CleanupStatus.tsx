import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Trash2, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  Play
} from 'lucide-react';
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
  const getCleanupStatusColor = (data: CleanupStatus) => {
    if (data.cleanup_errors.length > 0) return 'destructive';
    if (data.campaigns_awaiting_cleanup > 10) return 'secondary';
    return 'default';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Resource Cleanup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Resource Cleanup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Failed to load cleanup status</p>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!cleanupData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Resource Cleanup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No cleanup data available
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'compact') {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Cleanup
            </span>
            <Badge variant={getCleanupStatusColor(cleanupData)}>
              {cleanupData.campaigns_awaiting_cleanup} pending
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="text-xs text-muted-foreground">
            {cleanupData.total_campaigns_tracked} total tracked
          </div>
          {cleanupData.cleanup_errors.length > 0 && (
            <div className="text-xs text-red-600 mt-1">
              {cleanupData.cleanup_errors.length} error(s)
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Resource Cleanup Status
          </span>
          <div className="flex items-center gap-2">
            <Badge variant={getCleanupStatusColor(cleanupData)}>
              {cleanupData.campaigns_awaiting_cleanup} awaiting cleanup
            </Badge>
            <Button onClick={() => refetch()} variant="ghost" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Cleanup Statistics */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">
              {cleanupData.total_campaigns_tracked}
            </div>
            <div className="text-sm text-muted-foreground">Total Tracked</div>
          </div>
          
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className={`text-2xl font-bold ${cleanupData.campaigns_awaiting_cleanup > 10 ? 'text-yellow-600' : 'text-green-600'}`}>
              {cleanupData.campaigns_awaiting_cleanup}
            </div>
            <div className="text-sm text-muted-foreground">Awaiting Cleanup</div>
          </div>
          
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className={`text-2xl font-bold ${cleanupData.cleanup_errors.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {cleanupData.cleanup_errors.length}
            </div>
            <div className="text-sm text-muted-foreground">Cleanup Errors</div>
          </div>
        </div>

        {/* Last Cleanup */}
        <div className="flex items-center justify-between mb-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Last cleanup run:</span>
          </div>
          <span className="font-medium">
            {formatTimeSince(cleanupData.last_cleanup_run)}
          </span>
        </div>

        {/* Force Cleanup for Specific Campaign */}
        {campaignId && (
          <div className="border-t pt-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Force Cleanup Campaign</div>
                <div className="text-sm text-muted-foreground">
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
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
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
              <AlertTriangle className="h-4 w-4" />
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
            <CheckCircle className="h-8 w-8 mx-auto mb-2" />
            <div className="text-sm font-medium">All campaigns cleaned up successfully</div>
          </div>
        )}

        {/* Performance Status */}
        {cleanupData.campaigns_awaiting_cleanup > 0 && cleanupData.cleanup_errors.length === 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">
                {cleanupData.campaigns_awaiting_cleanup} campaign(s) scheduled for cleanup
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CleanupStatusComponent;
