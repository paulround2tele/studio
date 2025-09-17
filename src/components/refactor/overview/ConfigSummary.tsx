/**
 * Config Summary Component
 * Displays basic campaign configuration information
 */

import React from 'react';
import { Settings, Calendar, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CampaignResponse } from '@/lib/api-client/models';

interface ConfigSummaryProps {
  campaign: CampaignResponse;
  className?: string;
}

export function ConfigSummary({ campaign, className }: ConfigSummaryProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'running':
        return 'text-green-600 dark:text-green-400';
      case 'paused':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'failed':
        return 'text-red-600 dark:text-red-400';
      case 'completed':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Configuration
      </h3>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <div className="flex items-center space-x-3">
          <Settings className="w-4 h-4 text-gray-500" />
          <div className="flex-1">
            <div className="text-sm text-gray-600 dark:text-gray-400">Status</div>
            <div className={cn('font-medium capitalize', getStatusVariant(campaign.status))}>
              {campaign.status}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Calendar className="w-4 h-4 text-gray-500" />
          <div className="flex-1">
            <div className="text-sm text-gray-600 dark:text-gray-400">Created</div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {formatDate(campaign.createdAt)}
            </div>
          </div>
        </div>

        {campaign.currentPhase && (
          <div className="flex items-center space-x-3">
            <User className="w-4 h-4 text-gray-500" />
            <div className="flex-1">
              <div className="text-sm text-gray-600 dark:text-gray-400">Current Phase</div>
              <div className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                {campaign.currentPhase}
              </div>
            </div>
          </div>
        )}

        {campaign.description && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">Description</div>
            <div className="text-sm text-gray-900 dark:text-gray-100 mt-1">
              {campaign.description}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}