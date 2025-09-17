/**
 * Pattern Step - Domain generation pattern
 */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { WizardPatternStep } from '../../types';

interface PatternStepProps {
  data: Partial<WizardPatternStep>;
  onChange: (data: Partial<WizardPatternStep>) => void;
}

export function PatternStep({ data, onChange }: PatternStepProps) {
  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Note:</strong> This is a simplified wizard interface. 
          Advanced domain generation configuration will be available on the campaign dashboard after creation.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="base-pattern">
          Base Pattern *
        </Label>
        <Input
          id="base-pattern"
          placeholder="e.g., example-{variation}.com"
          value={data.basePattern || ''}
          onChange={(e) => onChange({ basePattern: e.target.value })}
          required
        />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Use {`{variation}`} as a placeholder for generated variations
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="max-domains">
          Maximum Domains *
        </Label>
        <Input
          id="max-domains"
          type="number"
          placeholder="1000"
          min="1"
          max="10000"
          value={data.maxDomains || ''}
          onChange={(e) => onChange({ maxDomains: parseInt(e.target.value) || 0 })}
          required
        />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Set a limit for the number of domains to generate (1-10,000)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="variations">
          Pattern Variations (Optional)
        </Label>
        <Input
          id="variations"
          placeholder="variation1, variation2, variation3"
          value={data.variations?.join(', ') || ''}
          onChange={(e) => onChange({ 
            variations: e.target.value.split(',').map(v => v.trim()).filter(Boolean)
          })}
        />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Comma-separated list of specific variations to use. Leave empty for auto-generation.
        </p>
      </div>

      {/* TODO: Phase 2 - Add advanced pattern configuration */}
    </div>
  );
}

export default PatternStep;