import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Shield, 
  Clock,
  RefreshCw
} from 'lucide-react';
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
          icon: <CheckCircle className="h-5 w-5 text-green-600" />,
          color: 'text-green-600',
          bgColor: 'bg-green-50 border-green-200',
          badgeVariant: 'default' as const,
          message: 'All systems operational'
        };
      case 'degraded':
        return {
          icon: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50 border-yellow-200',
          badgeVariant: 'secondary' as const,
          message: 'Some issues detected'
        };
      case 'unhealthy':
        return {
          icon: <XCircle className="h-5 w-5 text-red-600" />,
          color: 'text-red-600',
          bgColor: 'bg-red-50 border-red-200',
          badgeVariant: 'destructive' as const,
          message: 'Critical issues detected'
        };
      default:
        return {
          icon: <Shield className="h-5 w-5 text-gray-600" />,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50 border-gray-200',
          badgeVariant: 'secondary' as const,
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
      case 'normal': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'critical': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Shield className="h-4 w-4 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            System Health
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
            <Shield className="h-5 w-5" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Failed to load system health</p>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!healthData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No health data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const healthDetails = getHealthDetails(healthData);

  if (variant === 'compact') {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Health
            </span>
            <Badge variant={healthDetails.badgeVariant}>
              {healthData.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex items-center gap-2">
            {healthDetails.icon}
            <span className="text-sm">{healthDetails.message}</span>
          </div>
          {healthData.issues.length > 0 && (
            <div className="mt-2 text-xs text-muted-foreground">
              {healthData.issues.length} issue(s) detected
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
            <Shield className="h-5 w-5" />
            System Health Status
          </span>
          <div className="flex items-center gap-2">
            <Badge variant={healthDetails.badgeVariant}>
              {healthData.status.toUpperCase()}
            </Badge>
            <Button onClick={handleRefresh} variant="ghost" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Main Health Status */}
        <div className={`p-4 rounded-lg border-2 ${healthDetails.bgColor} mb-4`}>
          <div className="flex items-center gap-3">
            {healthDetails.icon}
            <div>
              <div className={`font-semibold ${healthDetails.color}`}>
                {healthDetails.message}
              </div>
              <div className="text-sm text-muted-foreground">
                Last checked: {new Date(healthData.last_check).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>

        {/* System Uptime */}
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Uptime:</span>
          <span className="font-medium">{formatUptime(healthData.uptime_seconds)}</span>
        </div>

        {/* Resource Status */}
        <div className="grid gap-3 md:grid-cols-3 mb-4">
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
            {getResourceStatusIcon(healthData.cpu_status)}
            <div>
              <div className="text-sm font-medium">CPU</div>
              <div className="text-xs text-muted-foreground capitalize">{healthData.cpu_status}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
            {getResourceStatusIcon(healthData.memory_status)}
            <div>
              <div className="text-sm font-medium">Memory</div>
              <div className="text-xs text-muted-foreground capitalize">{healthData.memory_status}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
            {getResourceStatusIcon(healthData.disk_status)}
            <div>
              <div className="text-sm font-medium">Disk</div>
              <div className="text-xs text-muted-foreground capitalize">{healthData.disk_status}</div>
            </div>
          </div>
        </div>

        {/* Issues */}
        {healthData.issues.length > 0 && (
          <div className="space-y-2">
            <div className="font-medium text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Active Issues ({healthData.issues.length})
            </div>
            <div className="space-y-1">
              {healthData.issues.map((issue, index) => (
                <div key={index} className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                  • {issue}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Issues */}
        {healthData.issues.length === 0 && healthData.status === 'healthy' && (
          <div className="text-center py-4 text-green-600">
            <CheckCircle className="h-8 w-8 mx-auto mb-2" />
            <div className="text-sm font-medium">All systems running smoothly</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SystemHealthCard;
