'use client';

import React from 'react';
import Button from '@/components/ta/ui/button/Button';
import Badge from '@/components/ta/ui/badge/Badge';
import { ZapIcon, ClockIcon, InfoIcon } from '@/icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setFullSequenceMode, setPreflightOpen } from '@/store/ui/campaignUiSlice';
import { useUpdateCampaignModeMutation } from '@/store/api/campaignApi';
import { pipelineSelectors } from '@/store/selectors/pipelineSelectors';
import type { PipelineRelatedRootState as _PipelineRelatedRootState } from '@/store/types/pipelineState';
import { CampaignModeEnum } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';

interface CampaignModeToggleProps {
  campaignId: string;
  currentMode: boolean; // true for full_sequence, false for step_by_step
  disabled?: boolean;
  className?: string;
}

const modeConfig = {
  full_sequence: {
    icon: ZapIcon,
    label: 'Full Sequence',
    description: 'Automatically runs through all phases',
    color: 'text-blue-500',
    bgColor: 'bg-blue-100',
    badgeColor: 'primary' as const,
  },
  step_by_step: {
    icon: ClockIcon,
    label: 'Step by Step',
    description: 'Manual control over each phase',
    color: 'text-green-500',
    bgColor: 'bg-green-100',
    badgeColor: 'success' as const,
  },
};

export function CampaignModeToggle({
  campaignId,
  currentMode,
  disabled,
  className,
}: CampaignModeToggleProps) {
  const _dispatch = useAppDispatch();
  const overviewSel = React.useMemo(()=>pipelineSelectors.overview(campaignId),[campaignId]);
  const ov = useAppSelector(overviewSel);
  const allConfigured = Boolean(ov?.config?.progress && ov.config.progress.configured === ov.config.progress.total);
  const { toast } = useToast();
  const [updateMode, { isLoading: pending }] = useUpdateCampaignModeMutation();

  // Use the properly defined modeConfig with all required properties
  const currentConfig = modeConfig[currentMode ? 'full_sequence' : 'step_by_step'];
  const otherMode = !currentMode;
  const otherConfig = modeConfig[otherMode ? 'full_sequence' : 'step_by_step'];

  const CurrentIcon = currentConfig.icon;
  const OtherIcon = otherConfig.icon;

  const handleModeToggle = async () => {
    if (pending) return;
    const newModeBool = !currentMode;
    const newMode = newModeBool ? 'full_sequence' : 'step_by_step';
    // Optimistic update
    _dispatch(setFullSequenceMode({ campaignId, value: newModeBool }));
    try {
  const result = await updateMode({ campaignId, mode: newMode as CampaignModeEnum }).unwrap();
      const authoritativeMode = result?.mode;
      if (authoritativeMode === 'full_sequence' || authoritativeMode === 'step_by_step') {
        _dispatch(setFullSequenceMode({ campaignId, value: authoritativeMode === 'full_sequence' }));
      }
      toast({
        title: 'Campaign Mode Updated',
        description: `Switched to ${newModeBool ? 'Full Sequence' : 'Step by Step'} mode`,
      });
      if (newModeBool && !allConfigured) {
        _dispatch(setPreflightOpen({ campaignId, open: true }));
      }
    } catch (error) {
      // Revert optimistic change on failure
      _dispatch(setFullSequenceMode({ campaignId, value: currentMode }));
      const errorMessage = error instanceof Error ? error.message : 'Failed to update campaign mode';
      toast({
        title: 'Mode Update Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className={`rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] ${className || ''}`}>
      <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
        <h3 className="text-sm font-medium flex items-center gap-2 text-gray-800 dark:text-white/90">
          <InfoIcon className="h-4 w-4" />
          Campaign Mode
        </h3>
      </div>
      <div className="p-5 space-y-4">
        {/* Current mode display */}
        <div className="flex items-center justify-between p-3 rounded-lg border bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${currentConfig.bgColor}`}>
              <CurrentIcon className={`h-4 w-4 ${currentConfig.color}`} />
            </div>
            <div>
              <div className="font-medium text-gray-800 dark:text-white/90">{currentConfig.label}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">{currentConfig.description}</div>
            </div>
          </div>
          <Badge color={currentConfig.badgeColor}>Active</Badge>
        </div>

        {/* Toggle button */}
        <Button
          variant="outline"
          onClick={handleModeToggle}
          disabled={disabled || pending}
          className="w-full"
        >
          {pending ? 'Updating...' : (
            <>
              <OtherIcon className="h-4 w-4 mr-2" />
              Switch to {otherConfig.label}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
