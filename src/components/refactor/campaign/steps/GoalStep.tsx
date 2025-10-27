/**
 * Goal Step - Campaign name and description
 */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem as _RadioGroupItem } from '@/components/ui/radio-group';
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

  const executionMode = data.executionMode ?? 'manual';

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
          Add context about what you&apos;re trying to achieve with this campaign
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
          value={executionMode}
          onValueChange={handleExecutionModeChange}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="relative">
            <input
              type="radio"
              id="manual"
              name="executionMode"
              value="manual"
              checked={executionMode === 'manual'}
              onChange={() => handleExecutionModeChange('manual')}
              className="sr-only"
            />
            <label
              htmlFor="manual"
              className={`block cursor-pointer transition-all duration-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 ${
                executionMode === 'manual'
                  ? 'ring-2 ring-blue-600 bg-blue-50 dark:bg-blue-900/30 shadow-md'
                  : 'ring-1 ring-gray-200 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 hover:ring-gray-300'
              }`}
            >
              <Card className="border-0 shadow-none bg-transparent">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        executionMode === 'manual'
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {executionMode === 'manual' && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Settings
                        className={`w-4 h-4 ${
                          executionMode === 'manual'
                            ? 'text-blue-600'
                            : 'text-gray-500'
                        }`}
                      />
                      <CardTitle
                        className={`text-base ${
                          executionMode === 'manual'
                            ? 'text-blue-900 dark:text-blue-100'
                            : 'text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        Manual (Step-by-Step)
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription
                    className={
                      executionMode === 'manual'
                        ? 'text-blue-700 dark:text-blue-200'
                        : 'text-gray-600 dark:text-gray-400'
                    }
                  >
                    Control each phase manually. You&apos;ll configure and start each phase
                    (domain generation, validation, extraction) individually when ready.
                  </CardDescription>
                </CardContent>
              </Card>
            </label>
          </div>

          <div className="relative">
            <input
              type="radio"
              id="auto"
              name="executionMode"
              value="auto"
              checked={executionMode === 'auto'}
              onChange={() => handleExecutionModeChange('auto')}
              className="sr-only"
            />
            <label
              htmlFor="auto"
              className={`block cursor-pointer transition-all duration-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 ${
                executionMode === 'auto'
                  ? 'ring-2 ring-blue-600 bg-blue-50 dark:bg-blue-900/30 shadow-md'
                  : 'ring-1 ring-gray-200 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 hover:ring-gray-300'
              }`}
            >
              <Card className="border-0 shadow-none bg-transparent">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        executionMode === 'auto'
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {executionMode === 'auto' && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Play
                        className={`w-4 h-4 ${
                          executionMode === 'auto'
                            ? 'text-blue-600'
                            : 'text-gray-500'
                        }`}
                      />
                      <CardTitle
                        className={`text-base ${
                          executionMode === 'auto'
                            ? 'text-blue-900 dark:text-blue-100'
                            : 'text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        Full Auto
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription
                    className={
                      executionMode === 'auto'
                        ? 'text-blue-700 dark:text-blue-200'
                        : 'text-gray-600 dark:text-gray-400'
                    }
                  >
                    Run all phases automatically. The campaign will progress through
                    domain generation, validation, and extraction without manual intervention.
                  </CardDescription>
                </CardContent>
              </Card>
            </label>
          </div>
        </RadioGroup>
      </fieldset>
    </div>
  );
}

export default GoalStep;