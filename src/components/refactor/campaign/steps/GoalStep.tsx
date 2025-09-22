/**
 * Goal Step - Campaign name and description
 */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Settings } from 'lucide-react';
import type { WizardGoalStep, ExecutionMode } from '../../types';

interface GoalStepProps {
  data: Partial<WizardGoalStep>;
  onChange: (data: Partial<WizardGoalStep>) => void;
}

export function GoalStep({ data, onChange }: GoalStepProps) {
  const handleExecutionModeChange = (value: ExecutionMode) => {
    onChange({ executionMode: value });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="campaign-name">
          Campaign Name *
        </Label>
        <Input
          id="campaign-name"
          placeholder="Enter a descriptive name for your campaign"
          value={data.campaignName || ''}
          onChange={(e) => onChange({ campaignName: e.target.value })}
          required
        />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Choose a clear name that describes your campaign purpose
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="campaign-description">
          Description (Optional)
        </Label>
        <Textarea
          id="campaign-description"
          placeholder="Describe your campaign goals and target audience"
          value={data.description || ''}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={3}
        />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Add context about what you're trying to achieve with this campaign
        </p>
      </div>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Execution Mode *
        </legend>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Choose how you want your campaign to run through its phases
        </p>
        
        <RadioGroup 
          value={data.executionMode} 
          onValueChange={handleExecutionModeChange}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <Card className={`cursor-pointer transition-colors ${
            data.executionMode === 'manual' 
              ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' 
              : 'hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="manual" className="mt-1" />
                <div className="flex items-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <CardTitle className="text-base">Manual (Step-by-Step)</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription>
                Control each phase manually. You'll configure and start each phase 
                (domain generation, validation, extraction) individually when ready.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className={`cursor-pointer transition-colors ${
            data.executionMode === 'auto' 
              ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' 
              : 'hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="auto" id="auto" className="mt-1" />
                <div className="flex items-center space-x-2">
                  <Play className="w-4 h-4" />
                  <CardTitle className="text-base">Full Auto</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription>
                Run all phases automatically. The campaign will progress through 
                domain generation, validation, and extraction without manual intervention.
              </CardDescription>
            </CardContent>
          </Card>
        </RadioGroup>
      </fieldset>
    </div>
  );
}

export default GoalStep;