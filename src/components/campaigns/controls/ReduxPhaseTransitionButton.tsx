import React from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useStartPhaseStandaloneMutation } from '@/store/api/campaignApi';
import { 
  startPhaseTransition, 
  completePhaseTransition, 
  failPhaseTransition 
} from '@/store/slices/campaignSlice';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Play, Loader2 } from 'lucide-react';
import type { components } from '@/lib/api-client/types';

// Use enums from OpenAPI schema
import type { CampaignResponseCurrentPhaseEnum as CampaignCurrentPhaseEnum } from '@/lib/api-client/models';

interface ReduxPhaseTransitionButtonProps {
  campaignId: string;
  phaseType: string;
  label: string;
  disabled?: boolean;
}

export const ReduxPhaseTransitionButton: React.FC<ReduxPhaseTransitionButtonProps> = ({
  campaignId,
  phaseType,
  label,
  disabled = false
}) => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  
  // Get transition state from Redux
  const { isTransitioning, transitioningPhase } = useAppSelector((state) => state.campaign);
  
  // Use RTK Query mutation
  const [startPhase, { isLoading }] = useStartPhaseStandaloneMutation();
  
  const isCurrentlyTransitioning = isTransitioning && transitioningPhase === phaseType;

  const handleStartPhase = async () => {
    try {
      // Update Redux state
      dispatch(startPhaseTransition(phaseType));
      
      // Call API
      const result = await startPhase({ campaignId, phase: phaseType as any }).unwrap(); // Type mismatch between enum types
      
      // Update Redux state on success
      dispatch(completePhaseTransition());
      
      toast({
        title: "Phase Started",
        description: `${label} has been started successfully.`,
        variant: "default"
      });
      
    } catch (error) {
      // Update Redux state on failure
      dispatch(failPhaseTransition(error instanceof Error ? error.message : 'Unknown error'));
      
      toast({
        title: "Phase Start Failed", 
        description: error instanceof Error ? error.message : 'Failed to start phase',
        variant: "destructive"
      });
    }
  };

  return (
    <Button
      onClick={handleStartPhase}
      disabled={disabled || isLoading || isCurrentlyTransitioning}
      className="flex items-center gap-2"
    >
      {isLoading || isCurrentlyTransitioning ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Play className="h-4 w-4" />
      )}
      {isLoading || isCurrentlyTransitioning ? 'Starting...' : label}
    </Button>
  );
};
