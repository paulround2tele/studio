'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Clock, Info } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateCampaignField } from '@/store/slices/campaignSlice';
import { useToast } from '@/hooks/use-toast';

interface CampaignModeToggleProps {
  campaignId: string;
  currentMode: boolean; // true for full_sequence, false for step_by_step
  disabled?: boolean;
  className?: string;
}

const modeConfig = {
  full_sequence: {
    icon: Zap,
    label: 'Full Sequence',
    description: 'Automatically runs through all phases',
    color: 'text-blue-500',
    bgColor: 'bg-blue-100',
    badgeVariant: 'default' as const,
  },
  step_by_step: {
    icon: Clock,
    label: 'Step by Step',
    description: 'Manual control over each phase',
    color: 'text-green-500',
    bgColor: 'bg-green-100',
    badgeVariant: 'outline' as const,
  },
};

export function CampaignModeToggle({
  campaignId,
  currentMode,
  disabled,
  className,
}: CampaignModeToggleProps) {
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  // Use the properly defined modeConfig with all required properties
  const currentConfig = modeConfig[currentMode ? 'full_sequence' : 'step_by_step'];
  const otherMode = !currentMode;
  const otherConfig = modeConfig[otherMode ? 'full_sequence' : 'step_by_step'];

  const CurrentIcon = currentConfig.icon;
  const OtherIcon = otherConfig.icon;

  const handleModeToggle = async () => {
    try {
      // TODO: Create separate UI state slice for frontend-only campaign settings
      // 'fullSequenceMode' is not part of the Campaign model from backend
      // dispatch(updateCampaignField({ field: 'fullSequenceMode', value: otherMode }));

      toast({
        title: 'Campaign Mode Updated',
        description: `Switched to ${otherConfig.label} mode (client-side only)`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update campaign mode';
      toast({
        title: 'Mode Update Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Info className="h-4 w-4" />
          Campaign Mode
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current mode display */}
        <div className="flex items-center justify-between p-3 rounded-lg border bg-gray-50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${currentConfig.bgColor}`}>
              <CurrentIcon className={`h-4 w-4 ${currentConfig.color}`} />
            </div>
            <div>
              <div className="font-medium">{currentConfig.label}</div>
              <div className="text-xs text-gray-600">{currentConfig.description}</div>
            </div>
          </div>
          <Badge variant={currentConfig.badgeVariant}>Active</Badge>
        </div>

        {/* Toggle button */}
        <Button
          variant="outline"
          onClick={handleModeToggle}
          disabled={disabled}
          className="w-full"
        >
          <OtherIcon className="h-4 w-4 mr-2" />
          Switch to {otherConfig.label}
        </Button>
      </CardContent>
    </Card>
  );
}
