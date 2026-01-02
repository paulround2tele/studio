'use client';

import React, { useState } from 'react';
import Button from '@/components/ta/ui/button/Button';
import { LoaderIcon, PlayIcon, PauseIcon, SquareIcon, ArrowRightIcon } from '@/icons';
import { useStartPhaseStandaloneMutation } from '@/store/api/campaignApi';
import { useToast } from '@/hooks/use-toast';
import { normalizeToApiPhase } from '@/lib/utils/phaseNames';
import { getApiErrorMessage } from '@/lib/utils/getApiErrorMessage';

// Use enums from OpenAPI schema  

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
    icon: PlayIcon,
    label: 'Start',
    buttonVariant: 'primary' as const,
  },
  pause: {
    icon: PauseIcon,
    label: 'Pause',
    buttonVariant: 'outline' as const,
  },
  stop: {
    icon: SquareIcon,
    label: 'Stop',
    buttonVariant: 'outline' as const,
  },
  transition: {
    icon: ArrowRightIcon,
    label: 'Next Phase',
    buttonVariant: 'primary' as const,
  },
};

export function PhaseTransitionButton({
  campaignId,
  currentPhase: _currentPhase,
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
  const apiPhase = normalizeToApiPhase(targetPhase);
  if (!apiPhase) throw new Error(`Unknown phase: ${targetPhase}`);
  await startPhase({ campaignId, phase: apiPhase }).unwrap();
      
      toast({
        title: 'Phase Started',
  description: `Started ${apiPhase} phase`,
      });
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, 'Failed to start phase');
      
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
      variant={config.buttonVariant}
      onClick={handleTransition}
      disabled={disabled || isLoading}
      className={className}
    >
      {isLoading ? (
        <LoaderIcon className="h-4 w-4 mr-2" />
      ) : (
        <Icon className="h-4 w-4 mr-2" />
      )}
      {isLoading ? 'Processing...' : config.label}
    </Button>
  );
}
