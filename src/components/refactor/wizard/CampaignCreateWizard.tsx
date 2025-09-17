/**
 * Campaign Create Wizard Component
 * Multi-step wizard for campaign creation: Goal → Pattern → Targeting → Review
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Target, Settings, MapPin, Eye, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreateCampaignMutation } from '@/store/api/campaignApi';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/shared/PageHeader';

type WizardStep = 'goal' | 'pattern' | 'targeting' | 'review';

interface CampaignFormData {
  name: string;
  description: string;
  pattern?: string;
  targeting?: string;
}

const STEPS: Array<{ key: WizardStep; title: string; description: string; icon: React.ReactNode }> = [
  {
    key: 'goal',
    title: 'Goal',
    description: 'Define your campaign objectives',
    icon: <Target className="w-5 h-5" />,
  },
  {
    key: 'pattern',
    title: 'Pattern',
    description: 'Configure generation patterns',
    icon: <Settings className="w-5 h-5" />,
  },
  {
    key: 'targeting',
    title: 'Targeting',
    description: 'Set targeting parameters',
    icon: <MapPin className="w-5 h-5" />,
  },
  {
    key: 'review',
    title: 'Review',
    description: 'Review and launch campaign',
    icon: <Eye className="w-5 h-5" />,
  },
];

interface WizardStepProps {
  data: CampaignFormData;
  onUpdate: (data: Partial<CampaignFormData>) => void;
  onNext: () => void;
  onPrev: () => void;
  canNext: boolean;
  isFirst: boolean;
  isLast: boolean;
}

function GoalStep({ data, onUpdate, onNext, canNext, isFirst }: WizardStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="campaign-name">Campaign Name *</Label>
          <Input
            id="campaign-name"
            data-testid="campaign-name-input"
            value={data.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Enter campaign name"
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="campaign-description">Campaign Description</Label>
          <Textarea
            id="campaign-description"
            data-testid="campaign-description-input"
            value={data.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Enter campaign description (optional)"
            className="w-full"
            rows={3}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!canNext}>
          Continue <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function PatternStep({ data, onUpdate, onNext, onPrev, canNext, isFirst }: WizardStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Pattern configuration will be available in Phase 2. For now, we'll use default settings.
        </div>
        <div className="space-y-2">
          <Label htmlFor="pattern-config">Pattern Configuration</Label>
          <Textarea
            id="pattern-config"
            value={data.pattern || ''}
            onChange={(e) => onUpdate({ pattern: e.target.value })}
            placeholder="Advanced pattern configuration (optional)"
            className="w-full"
            rows={3}
          />
        </div>
      </div>
      <div className="flex justify-between">
        <Button onClick={onPrev} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Button onClick={onNext} disabled={!canNext}>
          Continue <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function TargetingStep({ data, onUpdate, onNext, onPrev, canNext, isFirst }: WizardStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Targeting configuration will be enhanced in Phase 2. Basic settings available.
        </div>
        <div className="space-y-2">
          <Label htmlFor="targeting-config">Targeting Parameters</Label>
          <Textarea
            id="targeting-config"
            value={data.targeting || ''}
            onChange={(e) => onUpdate({ targeting: e.target.value })}
            placeholder="Targeting parameters (optional)"
            className="w-full"
            rows={3}
          />
        </div>
      </div>
      <div className="flex justify-between">
        <Button onClick={onPrev} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Button onClick={onNext} disabled={!canNext}>
          Continue <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function ReviewStep({ 
  data, 
  onPrev, 
  onLaunch, 
  isLaunching 
}: WizardStepProps & { onLaunch: () => void; isLaunching: boolean }) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Review Your Campaign</h3>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">Name</div>
            <div className="text-gray-600 dark:text-gray-400">{data.name}</div>
          </div>
          {data.description && (
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">Description</div>
              <div className="text-gray-600 dark:text-gray-400">{data.description}</div>
            </div>
          )}
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">Configuration</div>
            <div className="text-gray-600 dark:text-gray-400">
              Default settings will be applied. Configure phases after creation.
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-between">
        <Button onClick={onPrev} variant="outline" disabled={isLaunching}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Button 
          onClick={onLaunch} 
          disabled={isLaunching}
          data-testid="wizard-launch"
        >
          {isLaunching ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Launching...
            </>
          ) : (
            'Launch Campaign'
          )}
        </Button>
      </div>
    </div>
  );
}

export default function CampaignCreateWizard() {
  const router = useRouter();
  const { toast } = useToast();
  const [createCampaign, { isLoading: isCreating }] = useCreateCampaignMutation();

  const [currentStep, setCurrentStep] = useState<WizardStep>('goal');
  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    description: '',
    pattern: '',
    targeting: '',
  });

  const currentStepIndex = STEPS.findIndex(step => step.key === currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const canNext = () => {
    switch (currentStep) {
      case 'goal':
        return formData.name.trim().length > 0;
      case 'pattern':
      case 'targeting':
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length && STEPS[nextIndex]) {
      setCurrentStep(STEPS[nextIndex].key);
    }
  };

  const handlePrev = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0 && STEPS[prevIndex]) {
      setCurrentStep(STEPS[prevIndex].key);
    }
  };

  const handleUpdate = (updates: Partial<CampaignFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleLaunch = async () => {
    try {
      const result = await createCampaign({
        name: formData.name,
        description: formData.description || undefined,
      }).unwrap();

      toast({
        title: 'Campaign Created',
        description: `Campaign "${formData.name}" has been created successfully.`,
      });

      router.push(`/campaigns/${result.id}`);
    } catch (error) {
      console.error('Failed to create campaign:', error);
      toast({
        title: 'Creation Failed',
        description: 'Failed to create campaign. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const renderStep = () => {
    const stepProps = {
      data: formData,
      onUpdate: handleUpdate,
      onNext: handleNext,
      onPrev: handlePrev,
      canNext: canNext(),
      isFirst: currentStepIndex === 0,
      isLast: currentStepIndex === STEPS.length - 1,
    };

    switch (currentStep) {
      case 'goal':
        return <GoalStep {...stepProps} />;
      case 'pattern':
        return <PatternStep {...stepProps} />;
      case 'targeting':
        return <TargetingStep {...stepProps} />;
      case 'review':
        return <ReviewStep {...stepProps} onLaunch={handleLaunch} isLaunching={isCreating} />;
      default:
        return null;
    }
  };

  return (
    <div data-testid="campaign-wizard">
      <PageHeader
        title="Create New Campaign"
        description="Use our step-by-step wizard to create and configure your campaign"
        showBackButton
        onBack={() => router.push('/campaigns')}
      />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <div>
                <CardTitle className="text-xl">
                  {STEPS[currentStepIndex]?.title || 'Unknown Step'}
                </CardTitle>
                <CardDescription>
                  {STEPS[currentStepIndex]?.description || 'Step description not available'}
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                Step {currentStepIndex + 1} of {STEPS.length}
              </div>
            </div>

            {/* Progress indicator */}
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <div className="flex justify-between">
                {STEPS.map((step, index) => (
                  <div
                    key={step.key}
                    className={cn(
                      'flex flex-col items-center space-y-1 text-xs',
                      index <= currentStepIndex
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-400 dark:text-gray-600'
                    )}
                    data-testid={`wizard-step-${step.key}`}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center border-2',
                        index <= currentStepIndex
                          ? 'bg-blue-100 border-blue-500 dark:bg-blue-900 dark:border-blue-400'
                          : 'bg-gray-100 border-gray-300 dark:bg-gray-800 dark:border-gray-600'
                      )}
                    >
                      {step.icon}
                    </div>
                    <span className="hidden md:block">{step.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {renderStep()}
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Button
            variant="outline"
            onClick={() => router.push('/campaigns/new/legacy')}
          >
            Use legacy form
          </Button>
        </div>
      </div>
    </div>
  );
}