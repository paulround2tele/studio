/**
 * Goal Step - Campaign name and description
 * Migrated to TailAdmin + Tailwind patterns (Dec 31, 2025)
 */

import React from 'react';
import Input from '@/components/ta/form/input/InputField';
import Label from '@/components/ta/form/Label';
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
      {/* Campaign Name */}
      <div className="space-y-2">
        <Label>
          Campaign Name <span className="text-error-500">*</span>
        </Label>
        <Input
          type="text"
          placeholder="Enter a descriptive name for your campaign"
          defaultValue={data.campaignName || ''}
          onChange={(e) => onChange({ campaignName: e.target.value })}
        />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Choose a clear name that describes your campaign purpose
        </p>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label>
          Description (Optional)
        </Label>
        <textarea
          className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-gray-500"
          placeholder="Describe your campaign goals and target audience"
          value={data.description || ''}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={3}
        />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Add context about what you&apos;re trying to achieve with this campaign
        </p>
      </div>

      {/* Execution Mode */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Execution Mode <span className="text-error-500">*</span>
        </legend>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Choose how you want your campaign to run through its phases
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Manual Option */}
          <label
            htmlFor="manual"
            className={`relative block cursor-pointer rounded-xl border-2 p-5 transition-all duration-200 ${
              executionMode === 'manual'
                ? 'border-brand-500 bg-brand-50 shadow-md dark:bg-brand-500/10'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-800/50'
            }`}
          >
            <input
              type="radio"
              id="manual"
              name="executionMode"
              value="manual"
              checked={executionMode === 'manual'}
              onChange={() => handleExecutionModeChange('manual')}
              className="sr-only"
            />
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  executionMode === 'manual'
                    ? 'border-brand-500 bg-brand-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                {executionMode === 'manual' && (
                  <div className="h-2 w-2 rounded-full bg-white" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Settings
                    className={`h-4 w-4 ${
                      executionMode === 'manual' ? 'text-brand-600' : 'text-gray-500'
                    }`}
                  />
                  <span
                    className={`font-semibold ${
                      executionMode === 'manual'
                        ? 'text-brand-900 dark:text-brand-100'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    Manual (Step-by-Step)
                  </span>
                </div>
                <p
                  className={`mt-1 text-sm ${
                    executionMode === 'manual'
                      ? 'text-brand-700 dark:text-brand-200'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Control each phase manually. You&apos;ll configure and start each phase
                  (domain generation, validation, extraction) individually when ready.
                </p>
              </div>
            </div>
          </label>

          {/* Auto Option */}
          <label
            htmlFor="auto"
            className={`relative block cursor-pointer rounded-xl border-2 p-5 transition-all duration-200 ${
              executionMode === 'auto'
                ? 'border-brand-500 bg-brand-50 shadow-md dark:bg-brand-500/10'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-800/50'
            }`}
          >
            <input
              type="radio"
              id="auto"
              name="executionMode"
              value="auto"
              checked={executionMode === 'auto'}
              onChange={() => handleExecutionModeChange('auto')}
              className="sr-only"
            />
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  executionMode === 'auto'
                    ? 'border-brand-500 bg-brand-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                {executionMode === 'auto' && (
                  <div className="h-2 w-2 rounded-full bg-white" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Play
                    className={`h-4 w-4 ${
                      executionMode === 'auto' ? 'text-brand-600' : 'text-gray-500'
                    }`}
                  />
                  <span
                    className={`font-semibold ${
                      executionMode === 'auto'
                        ? 'text-brand-900 dark:text-brand-100'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    Full Auto
                  </span>
                </div>
                <p
                  className={`mt-1 text-sm ${
                    executionMode === 'auto'
                      ? 'text-brand-700 dark:text-brand-200'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Run all phases automatically. The campaign will progress through
                  domain generation, validation, and extraction without manual intervention.
                </p>
              </div>
            </div>
          </label>
        </div>
      </fieldset>
    </div>
  );
}

export default GoalStep;