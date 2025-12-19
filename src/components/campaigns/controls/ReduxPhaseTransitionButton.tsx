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
import { normalizeToApiPhase } from '@/lib/utils/phaseNames';
import { getApiErrorMessage } from '@/lib/utils/getApiErrorMessage';

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
  const apiPhase = normalizeToApiPhase(phaseType);
  if (!apiPhase) throw new Error(`Unknown phase: ${phaseType}`);
  await startPhase({ campaignId, phase: apiPhase }).unwrap();
      
      // Update Redux state on success
      dispatch(completePhaseTransition());
      
      toast({
        title: "Phase Started",
        description: `${label} has been started successfully.`,
        variant: "default"
      });
      
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to start phase');

      // Update Redux state on failure
      dispatch(failPhaseTransition(message));
      
      toast({
        title: "Phase Start Failed", 
        description: message,
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
