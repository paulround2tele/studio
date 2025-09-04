'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Clock, Info } from 'lucide-react';
import { useAppDispatch } from '@/store/hooks';
import { setFullSequenceMode } from '@/store/ui/campaignUiSlice';
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
  const _dispatch = useAppDispatch();
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);

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
    try {
      setPending(true);
      // Optimistic update
      _dispatch(setFullSequenceMode({ campaignId, value: newModeBool }));

      const resp = await fetch(`/api/v2/campaigns/${campaignId}/mode`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode }),
        credentials: 'include',
      });

      if (!resp.ok) {
        throw new Error(`Server responded ${resp.status}`);
      }
      const json = await resp.json().catch(() => null);
      const authoritativeMode = json?.data?.mode as string | undefined;
      if (authoritativeMode && (authoritativeMode === 'full_sequence' || authoritativeMode === 'step_by_step')) {
        const authoritativeBool = authoritativeMode === 'full_sequence';
        _dispatch(setFullSequenceMode({ campaignId, value: authoritativeBool }));
      }
      toast({
        title: 'Campaign Mode Updated',
        description: `Switched to ${newModeBool ? 'Full Sequence' : 'Step by Step'} mode`,
      });
    } catch (error) {
      // Revert optimistic change
      _dispatch(setFullSequenceMode({ campaignId, value: currentMode }));
      const errorMessage = error instanceof Error ? error.message : 'Failed to update campaign mode';
      toast({
        title: 'Mode Update Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setPending(false);
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
      </CardContent>
    </Card>
  );
}
