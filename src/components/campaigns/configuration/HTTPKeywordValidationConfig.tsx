import React from 'react';
import { Control } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { HTTPKeywordValidationPhaseConfig } from '@/lib/api-client/models/httpkeyword-validation-phase-config';

interface HTTPKeywordValidationConfigProps {
  control: Control<any>;
  disabled?: boolean;
}

export const HTTPKeywordValidationConfig: React.FC<HTTPKeywordValidationConfigProps> = ({
  control,
  disabled = false
}) => {
  return (
    <div className="space-y-6">
      <div className="text-center p-4 bg-green-50 rounded-lg border">
        <h3 className="text-lg font-semibold text-green-900 mb-2">HTTP Keyword Validation Configuration</h3>
        <p className="text-sm text-green-700">
          Configure HTTP keyword validation using the actual backend HTTPKeywordValidationPhaseConfig structure
        </p>
      </div>

      {/* Persona IDs - REQUIRED Array<string> */}
      <FormField
        control={control}
        name="personaIds"
        render={({ field }) => (
          <FormItem>
            <FormLabel>HTTP Persona IDs *</FormLabel>
            <FormControl>
              <div className="space-y-2">
                <Input
                  placeholder="Enter persona ID and press Enter"
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
                  {field.value?.map((personaId: string, index: number) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {personaId}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          const newPersonaIds = field.value.filter((_: string, i: number) => i !== index);
                          field.onChange(newPersonaIds);
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

      {/* Keywords - Optional Array<string> */}
      <FormField
        control={control}
        name="keywords"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Keywords (optional)</FormLabel>
            <FormControl>
              <div className="space-y-2">
                <Input
                  placeholder="Enter keyword and press Enter"
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
                  {field.value?.map((keyword: string, index: number) => (
                    <Badge key={index} variant="outline" className="flex items-center gap-1">
                      {keyword}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          const newKeywords = field.value.filter((_: string, i: number) => i !== index);
                          field.onChange(newKeywords);
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

      {/* Ad Hoc Keywords - Optional Array<string> */}
      <FormField
        control={control}
        name="adHocKeywords"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Ad Hoc Keywords (optional)</FormLabel>
            <FormControl>
              <div className="space-y-2">
                <Input
                  placeholder="Enter ad hoc keyword and press Enter"
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
                  {field.value?.map((keyword: string, index: number) => (
                    <Badge key={index} variant="destructive" className="flex items-center gap-1">
                      {keyword}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          const newKeywords = field.value.filter((_: string, i: number) => i !== index);
                          field.onChange(newKeywords);
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

      {/* Batch Size - Optional number */}
      <FormField
        control={control}
        name="batchSize"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Batch Size (optional)</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="e.g. 50"
                {...field}
                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                disabled={disabled}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Timeout - Optional number */}
      <FormField
        control={control}
        name="timeout"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Timeout (seconds, optional)</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="e.g. 60"
                {...field}
                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                disabled={disabled}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Max Retries - Optional number */}
      <FormField
        control={control}
        name="maxRetries"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Max Retries (optional)</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="e.g. 2"
                {...field}
                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                disabled={disabled}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default HTTPKeywordValidationConfig;
