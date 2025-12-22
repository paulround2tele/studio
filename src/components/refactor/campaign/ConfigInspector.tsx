/**
 * ConfigInspector Component (Phase 5)
 * 
 * Drawer-based configuration inspector for campaign settings.
 * Moves config out of main viewport into on-demand inspection.
 * 
 * Per CAMPAIGN_UI_REFACTOR_PLAN.md Phase 5 and CAMPAIGN_UI_CONTRACT.md §2.1 Tier 5
 * 
 * Key behaviors:
 * - Lazy-loads phase config data only when drawer opens
 * - Shows campaign summary + detailed phase configurations
 * - Purely inspection - no edit capabilities (yet)
 * - Clean separation from operations UI
 */

'use client';

import React from 'react';
import { Settings, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useGetCampaignPhaseConfigsQuery, useGetCampaignEnrichedQuery } from '@/store/api/campaignApi';
import { ConfigSummary } from './ConfigSummary';
import { PhaseConfigDisplay } from './PhaseConfigDisplay';

interface ConfigItem {
  label: string;
  value: string | number;
  type?: 'text' | 'number' | 'date' | 'badge' | 'list';
}

interface ConfigInspectorProps {
  /** Campaign ID to load configuration for */
  campaignId: string;
  /** Funnel data for derived metrics (optional) */
  funnelData?: { generated?: number } | null;
  /** Custom trigger element. If not provided, uses default Settings button */
  trigger?: React.ReactNode;
  /** Additional class name for the trigger button */
  className?: string;
}

/**
 * Default trigger button for the config inspector
 */
function DefaultTrigger({ className }: { className?: string }) {
  return (
    <Button 
      variant="outline" 
      size="sm"
      className={cn("gap-2", className)}
    >
      <Settings className="w-4 h-4" />
      Configuration
    </Button>
  );
}

/**
 * Loading skeleton for drawer content
 */
function ConfigSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Summary skeleton */}
      <div className="p-4 border rounded-lg">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
      
      {/* Phase configs skeleton */}
      <div className="p-4 border rounded-lg">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Error state for failed config load
 */
function ConfigError({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
        Failed to Load Configuration
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
        {message || 'Unable to retrieve campaign configuration. Please try again.'}
      </p>
    </div>
  );
}

export function ConfigInspector({
  campaignId,
  funnelData,
  trigger,
  className,
}: ConfigInspectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Lazy-load phase configs only when drawer is open
  const {
    data: phaseConfigsData,
    isLoading: phaseConfigsLoading,
    error: phaseConfigsError,
  } = useGetCampaignPhaseConfigsQuery(campaignId, {
    skip: !isOpen || !campaignId,
  });

  // Lazy-load enriched campaign data only when drawer is open
  const {
    data: enrichedData,
    isLoading: enrichedLoading,
    error: enrichedError,
  } = useGetCampaignEnrichedQuery(campaignId, {
    skip: !isOpen || !campaignId,
  });

  const isLoading = phaseConfigsLoading || enrichedLoading;
  const hasError = phaseConfigsError || enrichedError;

  // Build config summary items from enriched data
  const configItems: ConfigItem[] = React.useMemo(() => {
    if (!enrichedData?.campaign) return [];
    
    const campaign = enrichedData.campaign;
    
    // Extract target domains from funnel data or campaign progress
    const targetDomains = funnelData?.generated || campaign.progress?.totalDomains || 0;
    
    // Map backend status to display format
    const statusDisplay = campaign.status === 'draft' ? 'Draft' :
                          campaign.status === 'running' ? 'Running' :
                          campaign.status === 'paused' ? 'Paused' :
                          campaign.status === 'completed' ? 'Completed' :
                          campaign.status === 'failed' ? 'Failed' :
                          campaign.status === 'cancelled' ? 'Cancelled' : 'Unknown';
    
    return [
      { label: 'Campaign Name', value: campaign.name || 'Unnamed Campaign', type: 'text' as const },
      { label: 'Campaign Type', value: 'Lead Generation', type: 'badge' as const },
      { label: 'Status', value: statusDisplay, type: 'badge' as const },
      { label: 'Target Domains', value: targetDomains, type: 'number' as const },
      { label: 'Created', value: campaign.createdAt ? new Date(campaign.createdAt).toLocaleDateString() : 'Unknown', type: 'date' as const },
    ];
  }, [enrichedData, funnelData]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {trigger || <DefaultTrigger className={className} />}
      </SheetTrigger>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-lg overflow-y-auto"
      >
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Campaign Configuration
          </SheetTitle>
          <SheetDescription>
            View the configuration settings for this campaign.
          </SheetDescription>
        </SheetHeader>

        {/* Content area */}
        <div className="space-y-6">
          {isLoading ? (
            <ConfigSkeleton />
          ) : hasError ? (
            <ConfigError />
          ) : (
            <>
              {/* Campaign Summary */}
              <section>
                <ConfigSummary 
                  config={configItems}
                  title="Campaign Details"
                />
              </section>

              {/* Phase Configurations */}
              <section>
                <PhaseConfigDisplay
                  configs={phaseConfigsData?.configs as Record<string, unknown>}
                  configsPresent={phaseConfigsData?.configsPresent as Record<string, boolean>}
                  defaultExpanded={false}
                />
              </section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default ConfigInspector;
