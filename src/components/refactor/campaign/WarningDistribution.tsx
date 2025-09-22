/**
 * Warning Distribution Component (Phase C)
 * Warning analysis and distribution display
 */

import React from 'react';
import { AlertTriangle, AlertCircle, Info, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface WarningData {
  type: 'stuffing' | 'repetition' | 'anchor' | 'general';
  count: number;
  rate: number; // percentage
  severity: 'low' | 'medium' | 'high' | 'critical';
  domains?: string[]; // sample domains for this warning type
}

interface WarningDistributionProps {
  warnings: WarningData[];
  totalDomains: number;
  className?: string;
}

const warningConfig = {
  stuffing: {
    label: 'Keyword Stuffing',
    icon: AlertTriangle,
    description: 'Excessive keyword density detected',
    color: 'text-orange-600 dark:text-orange-400'
  },
  repetition: {
    label: 'Content Repetition',
    icon: AlertCircle,
    description: 'Repetitive content patterns found',
    color: 'text-red-600 dark:text-red-400'
  },
  anchor: {
    label: 'Anchor Share Issues',
    icon: Activity,
    description: 'High anchor text concentration',
    color: 'text-yellow-600 dark:text-yellow-400'
  },
  general: {
    label: 'General Warnings',
    icon: Info,
    description: 'Other quality concerns detected',
    color: 'text-blue-600 dark:text-blue-400'
  }
};

const severityConfig = {
  low: {
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    variant: 'secondary' as const
  },
  medium: {
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    variant: 'outline' as const
  },
  high: {
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    variant: 'destructive' as const
  },
  critical: {
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    variant: 'destructive' as const
  }
};

export function WarningDistribution({ 
  warnings, 
  totalDomains, 
  className 
}: WarningDistributionProps) {
  const totalWarnings = warnings.reduce((sum, w) => sum + w.count, 0);
  const overallRate = totalDomains > 0 ? (totalWarnings / totalDomains) * 100 : 0;

  if (warnings.length === 0) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-600" />
            Warning Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 mb-2">
              <Activity className="w-6 h-6" />
              <span className="text-lg font-medium">No warnings detected</span>
            </div>
            <p className="text-sm text-gray-500">
              All domains are passing quality checks
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-orange-600" />
            Warning Distribution
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {totalWarnings} warnings
            </Badge>
            <Badge 
              variant={overallRate > 20 ? 'destructive' : overallRate > 10 ? 'outline' : 'secondary'}
              className="text-xs"
            >
              {overallRate.toFixed(1)}% rate
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {warnings.map((warning) => {
            const config = warningConfig[warning.type];
            const severityConf = severityConfig[warning.severity];
            const Icon = config.icon;
            
            return (
              <div 
                key={warning.type}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Icon className={cn("w-5 h-5 shrink-0", config.color)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">
                        {config.label}
                      </h4>
                      <Badge 
                        variant={severityConf.variant}
                        className="text-xs"
                      >
                        {warning.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mb-1">
                      {config.description}
                    </p>
                    {warning.domains && warning.domains.length > 0 && (
                      <div className="text-xs text-gray-400 truncate">
                        Examples: {warning.domains.slice(0, 3).join(', ')}
                        {warning.domains.length > 3 && ` +${warning.domains.length - 3} more`}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-right shrink-0 ml-3">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {warning.count}
                  </div>
                  <div className="text-xs text-gray-500">
                    {warning.rate.toFixed(1)}%
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Summary narrative */}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Analysis:</strong> {generateWarningNarrative(warnings, totalDomains)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function generateWarningNarrative(warnings: WarningData[], totalDomains: number): string {
  const totalWarnings = warnings.reduce((sum, w) => sum + w.count, 0);
  const overallRate = totalDomains > 0 ? (totalWarnings / totalDomains) * 100 : 0;
  
  const criticalWarnings = warnings.filter(w => w.severity === 'critical');
  const highWarnings = warnings.filter(w => w.severity === 'high');
  
  if (criticalWarnings.length > 0) {
    const criticalCount = criticalWarnings.reduce((sum, w) => sum + w.count, 0);
    const criticalPercent = totalDomains > 0 ? (criticalCount / totalDomains) * 100 : 0;
    return `Critical quality issues detected across ${criticalCount} domains (${criticalPercent.toFixed(1)}%). Immediate attention recommended for ${criticalWarnings.map(w => warningConfig[w.type].label.toLowerCase()).join(', ')} patterns.`;
  }
  
  if (highWarnings.length > 0) {
    const highCount = highWarnings.reduce((sum, w) => sum + w.count, 0);
    const highPercent = totalDomains > 0 ? (highCount / totalDomains) * 100 : 0;
    return `High-priority warnings found in ${highCount} domains (${highPercent.toFixed(1)}%). Consider reviewing ${highWarnings.map(w => warningConfig[w.type].label.toLowerCase()).join(', ')} issues.`;
  }
  
  if (overallRate > 10) {
    return `Moderate warning rate of ${overallRate.toFixed(1)}% detected. Most issues are minor but monitoring recommended.`;
  }
  
  return `Low warning rate of ${overallRate.toFixed(1)}% indicates good overall domain quality. Continue monitoring for trends.`;
}

export default WarningDistribution;