import React from 'react';
import { Control } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { AnalysisPhaseConfig } from '@/lib/api-client/models/analysis-phase-config';

interface AnalysisConfigProps {
  control: Control<any>;
  disabled?: boolean;
}

export const AnalysisConfig: React.FC<AnalysisConfigProps> = ({
  control,
  disabled = false
}) => {
  return (
    <div className="space-y-6">
      <div className="text-center p-4 bg-orange-50 rounded-lg border">
        <h3 className="text-lg font-semibold text-orange-900 mb-2">Analysis Configuration</h3>
        <p className="text-sm text-orange-700">
          Configure analysis settings using the actual backend AnalysisPhaseConfig structure
        </p>
      </div>

      {/* Min Lead Score - Optional number */}
      <FormField
        control={control}
        name="minLeadScore"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Minimum Lead Score (optional)</FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="1"
                placeholder="e.g. 0.7"
                {...field}
                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                disabled={disabled}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Required Fields - Optional Array<string> */}
      <FormField
        control={control}
        name="requiredFields"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Required Fields (optional)</FormLabel>
            <FormControl>
              <div className="space-y-2">
                <Input
                  placeholder="Enter required field and press Enter"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const input = e.target as HTMLInputElement;
                      const value = input.value.trim();
                      if (value && !field.value?.includes(value)) {
                        field.onChange([...(field.value || []), value]);
                        input.value = '';
                      }
                    }
                  }}
                  disabled={disabled}
                />
                <div className="flex flex-wrap gap-2">
                  {field.value?.map((requiredField: string, index: number) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {requiredField}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          const newFields = field.value.filter((_: string, i: number) => i !== index);
                          field.onChange(newFields);
                        }}
                        disabled={disabled}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Analysis Rules - Optional Array<string> */}
      <FormField
        control={control}
        name="analysisRules"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Analysis Rules (optional)</FormLabel>
            <FormControl>
              <div className="space-y-2">
                <Input
                  placeholder="Enter analysis rule and press Enter"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const input = e.target as HTMLInputElement;
                      const value = input.value.trim();
                      if (value && !field.value?.includes(value)) {
                        field.onChange([...(field.value || []), value]);
                        input.value = '';
                      }
                    }
                  }}
                  disabled={disabled}
                />
                <div className="flex flex-wrap gap-2">
                  {field.value?.map((rule: string, index: number) => (
                    <Badge key={index} variant="outline" className="flex items-center gap-1">
                      {rule}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          const newRules = field.value.filter((_: string, i: number) => i !== index);
                          field.onChange(newRules);
                        }}
                        disabled={disabled}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default AnalysisConfig;
