import React from 'react';
import Badge from '@/components/ta/ui/badge/Badge';
import Button from '@/components/ta/ui/button/Button';
import { 
  CheckCircleIcon, 
  WarningTriangleIcon, 
  XCircleIcon, 
  ShieldIcon, 
  ClockIcon,
  RefreshIcon
} from '@/icons';
import { useGetSystemHealthQuery } from '@/store/api/monitoringApi';
import type { SystemHealth } from '@/store/api/monitoringApi';

interface SystemHealthCardProps {
  variant?: 'full' | 'compact';
  onRefresh?: () => void;
}

/**
 * System health status card showing overall system health
 * Displays health status from our monitoring service
 */
export const SystemHealthCard: React.FC<SystemHealthCardProps> = ({ 
  variant = 'full',
  onRefresh 
}) => {
  const { 
    data: healthData, 
    isLoading, 
    error,
    refetch 
  } = useGetSystemHealthQuery(undefined, {
    pollingInterval: 30000, // Refresh every 30 seconds
  });

  const handleRefresh = () => {
    refetch();
    onRefresh?.();
  };

  // Get health status details
  const getHealthDetails = (health: SystemHealth) => {
    switch (health.status) {
      case 'healthy':
        return {
          icon: <CheckCircleIcon className="h-5 w-5 text-green-600" />,
          color: 'text-green-600',
          bgColor: 'bg-green-50 border-green-200',
          badgeColor: 'success' as const,
          message: 'All systems operational'
        };
      case 'degraded':
        return {
          icon: <WarningTriangleIcon className="h-5 w-5 text-yellow-600" />,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50 border-yellow-200',
          badgeColor: 'warning' as const,
          message: 'Some issues detected'
        };
      case 'unhealthy':
        return {
          icon: <XCircleIcon className="h-5 w-5 text-red-600" />,
          color: 'text-red-600',
          bgColor: 'bg-red-50 border-red-200',
          badgeColor: 'error' as const,
          message: 'Critical issues detected'
        };
      default:
        return {
          icon: <ShieldIcon className="h-5 w-5 text-gray-600" />,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50 border-gray-200',
          badgeColor: 'light' as const,
          message: 'Status unknown'
        };
    }
  };

  // Format uptime
  const formatUptime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  // Get resource status icon
  const getResourceStatusIcon = (status: string) => {
    switch (status) {
      case 'normal': return <CheckCircleIcon className="h-4 w-4 text-green-600" />;
      case 'high': return <WarningTriangleIcon className="h-4 w-4 text-yellow-600" />;
      case 'critical': return <XCircleIcon className="h-4 w-4 text-red-600" />;
      default: return <ShieldIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90 flex items-center gap-2">
            <ShieldIcon className="h-5 w-5" />
            System Health
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
            <ShieldIcon className="h-5 w-5" />
            System Health
          </h3>
        </div>
        <div className="p-4 sm:p-6">
          <div className="text-center py-8">
            <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">Failed to load system health</p>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshIcon className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!healthData) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90 flex items-center gap-2">
            <ShieldIcon className="h-5 w-5" />
            System Health
          </h3>
        </div>
        <div className="p-4 sm:p-6">
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No health data available
          </div>
        </div>
      </div>
    );
  }

  const healthDetails = getHealthDetails(healthData);

  if (variant === 'compact') {
    return (
      <div className="w-full rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-medium text-gray-800 dark:text-white/90 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShieldIcon className="h-4 w-4" />
              Health
            </span>
            <Badge color={healthDetails.badgeColor}>
              {healthData.status}
            </Badge>
          </h3>
        </div>
        <div className="p-4 pt-2">
          <div className="flex items-center gap-2">
            {healthDetails.icon}
            <span className="text-sm">{healthDetails.message}</span>
          </div>
          {healthData.issues.length > 0 && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {healthData.issues.length} issue(s) detected
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
            <ShieldIcon className="h-5 w-5" />
            System Health Status
          </span>
          <div className="flex items-center gap-2">
            <Badge color={healthDetails.badgeColor}>
              {healthData.status.toUpperCase()}
            </Badge>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshIcon className="h-4 w-4" />
            </Button>
          </div>
        </h3>
      </div>
      <div className="p-4 sm:p-6">
        {/* Main Health Status */}
        <div className={`p-4 rounded-lg border-2 ${healthDetails.bgColor} mb-4`}>
          <div className="flex items-center gap-3">
            {healthDetails.icon}
            <div>
              <div className={`font-semibold ${healthDetails.color}`}>
                {healthDetails.message}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Last checked: {new Date(healthData.last_check).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>

        {/* System Uptime */}
        <div className="flex items-center gap-2 mb-4">
          <ClockIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-500 dark:text-gray-400">Uptime:</span>
          <span className="font-medium">{formatUptime(healthData.uptime_seconds)}</span>
        </div>

        {/* Resource Status */}
        <div className="grid gap-3 md:grid-cols-3 mb-4">
          <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            {getResourceStatusIcon(healthData.cpu_status)}
            <div>
              <div className="text-sm font-medium">CPU</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{healthData.cpu_status}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            {getResourceStatusIcon(healthData.memory_status)}
            <div>
              <div className="text-sm font-medium">Memory</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{healthData.memory_status}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            {getResourceStatusIcon(healthData.disk_status)}
            <div>
              <div className="text-sm font-medium">Disk</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{healthData.disk_status}</div>
            </div>
          </div>
        </div>

        {/* Issues */}
        {healthData.issues.length > 0 && (
          <div className="space-y-2">
            <div className="font-medium text-sm flex items-center gap-2">
              <WarningTriangleIcon className="h-4 w-4" />
              Active Issues ({healthData.issues.length})
            </div>
            <div className="space-y-1">
              {healthData.issues.map((issue, index) => (
                <div key={index} className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-2 rounded">
                  • {issue}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Issues */}
        {healthData.issues.length === 0 && healthData.status === 'healthy' && (
          <div className="text-center py-4 text-green-600">
            <CheckCircleIcon className="h-8 w-8 mx-auto mb-2" />
            <div className="text-sm font-medium">All systems running smoothly</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemHealthCard;
