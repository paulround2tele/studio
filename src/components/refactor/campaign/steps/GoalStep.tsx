/**
 * Goal Step - Campaign name and description
 */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { WizardGoalStep } from '../../types';

interface GoalStepProps {
  data: Partial<WizardGoalStep>;
  onChange: (data: Partial<WizardGoalStep>) => void;
}

export function GoalStep({ data, onChange }: GoalStepProps) {
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
    </div>
  );
}

export default GoalStep;