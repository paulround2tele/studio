import React from 'react';
import { Control } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface DNSValidationConfigProps {
  control: Control<any>;
  disabled?: boolean;
}

export const DNSValidationConfig: React.FC<DNSValidationConfigProps> = ({
  control,
  disabled = false
}) => {
  return (
    <div className="space-y-6">
      <div className="text-center p-4 bg-blue-50 rounded-lg border">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">DNS Validation Configuration</h3>
        <p className="text-sm text-blue-700">
          Configure DNS validation settings using the actual backend DNSValidationPhaseConfig structure
        </p>
      </div>

      {/* Persona IDs - REQUIRED Array<string> */}
      <FormField
        control={control}
        name="personaIds"
        render={({ field }) => (
          <FormItem>
            <FormLabel>DNS Persona IDs *</FormLabel>
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
                placeholder="e.g. 100"
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
                placeholder="e.g. 30"
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
                placeholder="e.g. 3"
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

export default DNSValidationConfig;
