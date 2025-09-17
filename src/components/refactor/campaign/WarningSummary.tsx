/**
 * Warning Summary Component
 * Displays campaign warnings and issues
 */

import React from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Warning {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  count?: number;
}

interface WarningSummaryProps {
  warnings: Warning[];
  className?: string;
}

function getWarningIcon(type: Warning['type']) {
  switch (type) {
    case 'error':
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    case 'info':
      return <Info className="w-4 h-4 text-blue-500" />;
    case 'success':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    default:
      return <Info className="w-4 h-4 text-gray-500" />;
  }
}

function getWarningVariant(type: Warning['type']): 'default' | 'destructive' {
  return type === 'error' ? 'destructive' : 'default';
}

function getBadgeVariant(type: Warning['type']): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (type) {
    case 'error':
      return 'destructive';
    case 'warning':
      return 'outline';
    case 'success':
      return 'default';
    case 'info':
    default:
      return 'secondary';
  }
}

export function WarningSummary({ warnings, className }: WarningSummaryProps) {
  if (warnings.length === 0) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">All systems operational</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group warnings by type for summary
  const summary = warnings.reduce((acc, warning) => {
    acc[warning.type] = (acc[warning.type] || 0) + (warning.count || 1);
    return acc;
  }, {} as Record<Warning['type'], number>);

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">System Status</CardTitle>
          <div className="flex gap-2">
            {Object.entries(summary).map(([type, count]) => (
              <Badge 
                key={type}
                variant={getBadgeVariant(type as Warning['type'])}
                className="text-xs"
              >
                {count} {type}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {warnings.map((warning) => (
            <Alert 
              key={warning.id}
              variant={getWarningVariant(warning.type)}
              className="py-3"
            >
              <div className="flex items-start gap-3">
                {getWarningIcon(warning.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium">
                      {warning.title}
                    </h4>
                    {warning.count && warning.count > 1 && (
                      <Badge variant="outline" className="text-xs">
                        {warning.count}
                      </Badge>
                    )}
                  </div>
                  <AlertDescription className="mt-1 text-sm">
                    {warning.message}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default WarningSummary;