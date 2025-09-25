/**
 * Config Summary Component
 * Displays campaign configuration summary
 */

import React from 'react';
import { Settings, Calendar, Target, Hash } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ConfigItem {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  type?: 'text' | 'number' | 'date' | 'badge' | 'list';
}

interface ConfigSummaryProps {
  config: ConfigItem[];
  title?: string;
  className?: string;
}

function formatValue(item: ConfigItem): React.ReactNode {
  switch (item.type) {
    case 'date':
      return new Date(item.value as string).toLocaleDateString();
    case 'number':
      return typeof item.value === 'number' ? item.value.toLocaleString() : item.value;
    case 'badge':
      return <Badge variant="outline">{item.value}</Badge>;
    case 'list':
      // Assume comma-separated values
      const items = String(item.value).split(',').map(s => s.trim());
      return (
        <div className="flex flex-wrap gap-1">
          {items.map((listItem, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {listItem}
            </Badge>
          ))}
        </div>
      );
    case 'text':
    default:
      return String(item.value);
  }
}

function getDefaultIcon(item: ConfigItem): React.ReactNode {
  if (item.icon) return item.icon;
  
  // Provide default icons based on label patterns
  const label = item.label.toLowerCase();
  if (label.includes('date') || label.includes('time')) {
    return <Calendar className="w-4 h-4 text-gray-500" />;
  }
  if (label.includes('target') || label.includes('goal')) {
    return <Target className="w-4 h-4 text-gray-500" />;
  }
  if (label.includes('count') || label.includes('number') || label.includes('max')) {
    return <Hash className="w-4 h-4 text-gray-500" />;
  }
  return <Settings className="w-4 h-4 text-gray-500" />;
}

export function ConfigSummary({ 
  config,
  title = "Configuration",
  className 
}: ConfigSummaryProps) {
  if (config.length === 0) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500 dark:text-gray-400 text-center py-4">
            No configuration data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {config.map((item, index) => (
            <div 
              key={`${item.label}-${index}`}
              className="flex items-start justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {getDefaultIcon(item)}
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                  {item.label}
                </span>
              </div>
              <div className="text-sm text-gray-900 dark:text-gray-100 text-right">
                {formatValue(item)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default ConfigSummary;