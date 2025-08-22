'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Play, Pause, Square, ArrowRight } from 'lucide-react';
import { useStartPhaseStandaloneMutation } from '@/store/api/campaignApi';
import { useToast } from '@/hooks/use-toast';
import type { components } from '@/lib/api-client/types';

// Use enums from OpenAPI schema  
type CampaignCurrentPhaseEnum = components['schemas']['api.CampaignSummary']['currentPhase'];

interface PhaseTransitionButtonProps {
  campaignId: string;
  currentPhase: string;
  targetPhase: string;
  variant?: 'start' | 'pause' | 'stop' | 'transition';
  disabled?: boolean;
  className?: string;
}

const buttonConfig = {
  start: {
    icon: Play,
    label: 'Start',
    variant: 'default' as const,
  },
  pause: {
    icon: Pause,
    label: 'Pause',
    variant: 'outline' as const,
  },
  stop: {
    icon: Square,
    label: 'Stop',
    variant: 'destructive' as const,
  },
  transition: {
    icon: ArrowRight,
    label: 'Next Phase',
    variant: 'default' as const,
  },
};

export function PhaseTransitionButton({
  campaignId,
  currentPhase,
  targetPhase,
  variant = 'transition',
  disabled,
  className,
}: PhaseTransitionButtonProps) {
  const [startPhase] = useStartPhaseStandaloneMutation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const config = buttonConfig[variant];
  const Icon = config.icon;

  const handleTransition = async () => {
    try {
      setIsLoading(true);

      // Start the target phase - the backend handles phase progression
      await startPhase({
        campaignId,
        phase: targetPhase as any, // Type mismatch between CampaignCurrentPhaseEnum and StartPhaseStandalonePhaseEnum
      }).unwrap();
      
      toast({
        title: 'Phase Started',
        description: `Started ${targetPhase} phase`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start phase';
      
      toast({
        title: 'Phase Start Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={config.variant}
      onClick={handleTransition}
      disabled={disabled || isLoading}
      className={className}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Icon className="h-4 w-4 mr-2" />
      )}
      {isLoading ? 'Processing...' : config.label}
    </Button>
  );
}
