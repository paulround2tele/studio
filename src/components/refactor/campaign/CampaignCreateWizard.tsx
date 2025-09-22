/**
 * Campaign Creation Wizard
 * Multi-step campaign creation: Goal → Pattern → Targeting → Review & Launch
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useCreateCampaignMutation, useUpdateCampaignModeMutation, useStartPhaseStandaloneMutation } from '@/store/api/campaignApi';
import { formToApiRequest } from '@/components/campaigns/types/SimpleCampaignFormTypes';
import { CampaignModeEnum } from '@/lib/api-client';

import GoalStep from './steps/GoalStep';
import PatternStep from './steps/PatternStep';
import TargetingStep from './steps/TargetingStep';
import ReviewStep from './steps/ReviewStep';

import type { 
  CampaignWizardState, 
  WizardGoalStep, 
  WizardPatternStep, 
  WizardTargetingStep 
} from '../types';

const WIZARD_STEPS = [
  { id: 'goal', title: 'Goal', description: 'Define campaign basics' },
  { id: 'pattern', title: 'Pattern', description: 'Domain generation pattern' },
  { id: 'targeting', title: 'Targeting', description: 'Keywords & filters' },
  { id: 'review', title: 'Review & Launch', description: 'Confirm and create' }
];

interface CampaignCreateWizardProps {
  className?: string;
}

export function CampaignCreateWizard({ className }: CampaignCreateWizardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [createCampaign, { isLoading: isCreating }] = useCreateCampaignMutation();
  const [updateCampaignMode, { isLoading: isUpdatingMode }] = useUpdateCampaignModeMutation();
  const [startPhase, { isLoading: isStartingPhase }] = useStartPhaseStandaloneMutation();

  const [wizardState, setWizardState] = useState<CampaignWizardState>({
    currentStep: 0,
    goal: {},
    pattern: {},
    targeting: {},
    isValid: false
  });

  const currentStep = WIZARD_STEPS[wizardState.currentStep];
  const isValidStep = currentStep !== undefined;
  const progress = ((wizardState.currentStep + 1) / WIZARD_STEPS.length) * 100;
  const isLastStep = wizardState.currentStep === WIZARD_STEPS.length - 1;
  const isFirstStep = wizardState.currentStep === 0;

  // Validation for each step
  const validateStep = (stepIndex: number): boolean => {
    switch (stepIndex) {
      case 0: // Goal
        return !!(wizardState.goal.campaignName?.trim() && wizardState.goal.executionMode);
      case 1: // Pattern
        return !!(wizardState.pattern.basePattern?.trim() && wizardState.pattern.maxDomains && wizardState.pattern.maxDomains > 0);
      case 2: // Targeting
        return true; // Targeting is optional
      case 3: // Review
        return validateStep(0) && validateStep(1) && validateStep(2);
      default:
        return false;
    }
  };

  const canProceed = validateStep(wizardState.currentStep);
  const isLoading = isCreating || isUpdatingMode || isStartingPhase;

  const handleNext = () => {
    if (isLastStep) {
      handleSubmit();
    } else if (canProceed) {
      setWizardState(prev => ({
        ...prev,
        currentStep: prev.currentStep + 1
      }));
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setWizardState(prev => ({
        ...prev,
        currentStep: prev.currentStep - 1
      }));
    }
  };

  const handleStepClick = (stepIndex: number) => {
    // Allow navigating to previous steps or current step
    if (stepIndex <= wizardState.currentStep) {
      setWizardState(prev => ({
        ...prev,
        currentStep: stepIndex
      }));
    }
  };

  const updateGoal = (goal: Partial<WizardGoalStep>) => {
    setWizardState(prev => ({ ...prev, goal: { ...prev.goal, ...goal } }));
  };

  const updatePattern = (pattern: Partial<WizardPatternStep>) => {
    setWizardState(prev => ({ ...prev, pattern: { ...prev.pattern, ...pattern } }));
  };

  const updateTargeting = (targeting: Partial<WizardTargetingStep>) => {
    setWizardState(prev => ({ ...prev, targeting: { ...prev.targeting, ...targeting } }));
  };

  const handleSubmit = async () => {
    try {
      // Map wizard state to API request format
      const apiRequest = formToApiRequest({
        name: wizardState.goal.campaignName || '',
        description: wizardState.goal.description || ''
      });

      // Create the campaign
      const result = await createCampaign(apiRequest).unwrap();
      const campaignId = result.id;

      // Set the execution mode
      const backendMode = wizardState.goal.executionMode === 'auto' 
        ? CampaignModeEnum.full_sequence 
        : CampaignModeEnum.step_by_step;

      await updateCampaignMode({
        campaignId,
        mode: backendMode
      }).unwrap();

      // For auto mode, trigger auto-start of the first phase (discovery)
      if (wizardState.goal.executionMode === 'auto') {
        try {
          console.debug('Auto mode selected - starting discovery phase automatically');
          
          // Start the discovery phase automatically for full auto mode
          await startPhase({
            campaignId,
            phase: 'discovery'
          }).unwrap();
          
          toast({
            title: "Campaign Created & Started",
            description: `Campaign "${wizardState.goal.campaignName}" has been created in auto mode and the discovery phase has started automatically.`,
          });
        } catch (startError: any) {
          console.warn('Auto-start of discovery phase failed:', startError);
          
          // Show a warning but don't block the flow - user can start manually
          toast({
            title: "Campaign Created",
            description: `Campaign "${wizardState.goal.campaignName}" was created successfully, but auto-start failed. You can start the discovery phase manually.`,
            variant: 'default'
          });
        }
      } else {
        toast({
          title: "Campaign Created Successfully",
          description: `Campaign "${wizardState.goal.campaignName}" has been created in ${wizardState.goal.executionMode} mode.`,
        });
      }

      // Redirect to campaign detail page
      router.push(`/campaigns/${result.id}`);
    } catch (error: any) {
      console.error('Campaign creation failed:', error);
      toast({
        title: "Campaign Creation Failed",
        description: error?.data?.message || error?.message || "Please try again.",
        variant: 'destructive'
      });
    }
  };

  const renderStepContent = () => {
    switch (wizardState.currentStep) {
      case 0:
        return (
          <GoalStep 
            data={wizardState.goal}
            onChange={updateGoal}
          />
        );
      case 1:
        return (
          <PatternStep 
            data={wizardState.pattern}
            onChange={updatePattern}
          />
        );
      case 2:
        return (
          <TargetingStep 
            data={wizardState.targeting}
            onChange={updateTargeting}
          />
        );
      case 3:
        return (
          <ReviewStep 
            goal={wizardState.goal as WizardGoalStep}
            pattern={wizardState.pattern as WizardPatternStep}
            targeting={wizardState.targeting as WizardTargetingStep}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header with legacy link */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Create New Campaign</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Set up your lead generation campaign with guided steps
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/campaigns/new/legacy')}
          className="text-sm"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Use Legacy Form
        </Button>
      </div>

      {/* Progress indicator */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Step {wizardState.currentStep + 1} of {WIZARD_STEPS.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-between">
        {WIZARD_STEPS.map((step, index) => (
          <button
            key={step.id}
            onClick={() => handleStepClick(index)}
            className={`flex-1 text-left p-3 rounded-lg transition-colors ${
              index === wizardState.currentStep
                ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700'
                : index < wizardState.currentStep
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30'
                : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 opacity-60'
            }`}
            disabled={index > wizardState.currentStep}
            aria-current={index === wizardState.currentStep ? "step" : undefined}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                index === wizardState.currentStep
                  ? 'bg-blue-500 text-white'
                  : index < wizardState.currentStep
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
              }`}>
                {index < wizardState.currentStep ? (
                  <Check className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>
              <div>
                <h3 className="font-medium">{step.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{step.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Main content */}
      <Card>
        <CardHeader>
          <CardTitle>{isValidStep ? currentStep.title : 'Invalid Step'}</CardTitle>
        </CardHeader>
        <CardContent>
          {isValidStep ? renderStepContent() : <div>Step not found</div>}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={isFirstStep}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={() => router.push('/campaigns')}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed || isLoading}
          >
            {isLoading ? (
              isStartingPhase ? 'Starting Campaign...' : 'Creating...'
            ) : isLastStep ? (
              'Create Campaign'
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CampaignCreateWizard;