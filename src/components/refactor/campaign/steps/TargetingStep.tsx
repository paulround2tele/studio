/**
 * Targeting Step - Keywords and filters
 */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { WizardTargetingStep } from '../../types';

interface TargetingStepProps {
  data: Partial<WizardTargetingStep>;
  onChange: (data: Partial<WizardTargetingStep>) => void;
}

export function TargetingStep({ data, onChange }: TargetingStepProps) {
  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Optional Configuration:</strong> These targeting options help filter and score domains.
          You can skip this step and configure targeting later on the campaign dashboard.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="include-keywords">
          Include Keywords
        </Label>
        <Input
          id="include-keywords"
          placeholder="keyword1, keyword2, keyword3"
          value={data.includeKeywords?.join(', ') || ''}
          onChange={(e) => onChange({ 
            includeKeywords: e.target.value.split(',').map(v => v.trim()).filter(Boolean)
          })}
        />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Prioritize domains containing these keywords (comma-separated)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="exclude-keywords">
          Exclude Keywords
        </Label>
        <Input
          id="exclude-keywords"
          placeholder="spam, adult, illegal"
          value={data.excludeKeywords?.join(', ') || ''}
          onChange={(e) => onChange({ 
            excludeKeywords: e.target.value.split(',').map(v => v.trim()).filter(Boolean)
          })}
        />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Avoid domains containing these keywords (comma-separated)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="exclude-extensions">
          Exclude Extensions
        </Label>
        <Input
          id="exclude-extensions"
          placeholder="gov, edu, mil"
          value={data.excludeExtensions?.join(', ') || ''}
          onChange={(e) => onChange({ 
            excludeExtensions: e.target.value.split(',').map(v => v.trim()).filter(Boolean)
          })}
        />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Skip certain domain extensions (comma-separated, without dots)
        </p>
      </div>

      {/* TODO: Phase 2 - Add advanced targeting options like geographic filters, content scoring, etc. */}
    </div>
  );
}

export default TargetingStep;