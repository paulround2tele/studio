/**
 * Config Summary Panel Component (Phase D)
 * Campaign configuration summary and actions - Panel wrapper around ConfigSummary
 */

import React from 'react';
import { Settings, Edit, Copy, Share, Download, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ConfigSummary } from './ConfigSummary';
import { cn } from '@/lib/utils';

interface ConfigItem {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  type?: 'text' | 'number' | 'date' | 'badge' | 'list';
}

interface ConfigSummaryPanelProps {
  config: ConfigItem[];
  campaignId?: string;
  title?: string;
  className?: string;
  showActions?: boolean;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onShare?: () => void;
  onExport?: () => void;
  onRefresh?: () => void;
  lastUpdated?: Date;
  status?: 'draft' | 'active' | 'paused' | 'completed' | 'error';
}

const statusConfig = {
  draft: {
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    label: 'Draft'
  },
  active: {
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    label: 'Active'
  },
  paused: {
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    label: 'Paused'
  },
  completed: {
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    label: 'Completed'
  },
  error: {
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    label: 'Error'
  }
};

export function ConfigSummaryPanel({ 
  config,
  campaignId,
  title = "Campaign Configuration",
  className,
  showActions = true,
  onEdit,
  onDuplicate,
  onShare,
  onExport,
  onRefresh,
  lastUpdated,
  status
}: ConfigSummaryPanelProps) {
  
  const handleEdit = () => {
    onEdit?.();
  };

  const handleDuplicate = () => {
    onDuplicate?.();
  };

  const handleShare = () => {
    onShare?.();
  };

  const handleExport = () => {
    onExport?.();
  };

  const handleRefresh = () => {
    onRefresh?.();
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <CardTitle className="text-lg">{title}</CardTitle>
            {status && (
              <Badge 
                variant="outline" 
                className={cn("text-xs", statusConfig[status].color)}
              >
                {statusConfig[status].label}
              </Badge>
            )}
          </div>
          
          {showActions && (
            <div className="flex items-center gap-2">
              {onRefresh && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  className="h-8 w-8 p-0"
                  title="Refresh configuration"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              )}
              
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEdit}
                  className="gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </Button>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onDuplicate && (
                    <DropdownMenuItem onClick={handleDuplicate}>
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicate Campaign
                    </DropdownMenuItem>
                  )}
                  {onShare && (
                    <DropdownMenuItem onClick={handleShare}>
                      <Share className="w-4 h-4 mr-2" />
                      Share Configuration
                    </DropdownMenuItem>
                  )}
                  {onExport && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleExport}>
                        <Download className="w-4 h-4 mr-2" />
                        Export Settings
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
        
        {lastUpdated && (
          <p className="text-xs text-gray-500 mt-1">
            Last updated: {lastUpdated.toLocaleString()}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        {config.length === 0 ? (
          <div className="text-center py-8">
            <Settings className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-500">
              No configuration data available
            </p>
            {onEdit && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleEdit}
                className="mt-3"
              >
                Configure Campaign
              </Button>
            )}
          </div>
        ) : (
          <ConfigSummary 
            config={config} 
            title="" // Hide title since it's in the panel header
          />
        )}
      </CardContent>
    </Card>
  );
}

export default ConfigSummaryPanel;