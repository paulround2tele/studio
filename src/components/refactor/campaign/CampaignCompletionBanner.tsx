/**
 * CampaignCompletionBanner Component (P0)
 * 
 * Displays a prominent outcome banner when a campaign completes.
 * Makes completion feel like a handoff, not a dead end.
 * 
 * Emphasizes:
 * - Total leads found
 * - Call to action to work with results
 * - Option to export or start new campaign
 */

'use client';

import React from 'react';
import { 
  CheckCircle2, 
  Download, 
  Plus, 
  ArrowRight,
  Trophy,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface CampaignCompletionBannerProps {
  /** Number of qualified leads */
  leadsCount: number;
  /** Number of domains analyzed */
  analyzedCount: number;
  /** Campaign name for context */
  campaignName?: string;
  /** Callback to export leads */
  onExportLeads?: () => void;
  /** Callback to start new campaign */
  onStartNew?: () => void;
  /** Whether export is in progress */
  isExporting?: boolean;
  className?: string;
}

export function CampaignCompletionBanner({
  leadsCount,
  analyzedCount,
  campaignName,
  onExportLeads,
  onStartNew,
  isExporting = false,
  className,
}: CampaignCompletionBannerProps) {
  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl border-2 border-emerald-300 dark:border-emerald-700',
      'bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50',
      'dark:from-emerald-900/30 dark:via-teal-900/30 dark:to-cyan-900/30',
      'p-6 shadow-lg',
      className
    )}>
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-200/30 dark:bg-emerald-700/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-200/30 dark:bg-teal-700/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
      
      <div className="relative z-10">
        {/* Header with success icon */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-800/50 ring-4 ring-emerald-200/50 dark:ring-emerald-700/50">
            <Trophy className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Campaign Complete
            </h2>
            {campaignName && (
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                {campaignName}
              </p>
            )}
          </div>
        </div>
        
        {/* Lead count highlight */}
        <div className="bg-white/60 dark:bg-gray-900/40 rounded-xl p-4 mb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
              {leadsCount.toLocaleString()}
            </span>
            <span className="text-lg text-emerald-700 dark:text-emerald-300">
              qualified leads
            </span>
            <Sparkles className="h-5 w-5 text-emerald-500 animate-pulse" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            from {analyzedCount.toLocaleString()} analyzed domains
          </p>
        </div>
        
        {/* What's next */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 mb-2">
            Your results are ready. Here's what to do next:
          </h3>
          <ul className="space-y-2 text-sm text-emerald-700 dark:text-emerald-300">
            <li className="flex items-center gap-2">
              <ArrowRight className="h-3.5 w-3.5" />
              Review the lead table below to inspect high-scoring domains
            </li>
            <li className="flex items-center gap-2">
              <ArrowRight className="h-3.5 w-3.5" />
              Click any lead to see score breakdown and qualification details
            </li>
            <li className="flex items-center gap-2">
              <ArrowRight className="h-3.5 w-3.5" />
              Export leads for outreach or further analysis
            </li>
          </ul>
        </div>
        
        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {onExportLeads && (
            <Button
              variant="default"
              size="lg"
              onClick={onExportLeads}
              disabled={isExporting || leadsCount === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export Leads'}
            </Button>
          )}
          {onStartNew && (
            <Button
              variant="outline"
              size="lg"
              onClick={onStartNew}
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-600 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default CampaignCompletionBanner;
