import React from 'react';
import { Control } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface DomainGenerationConfigProps {
  control: Control<any>;
  disabled?: boolean;
}

export const DomainGenerationConfig: React.FC<DomainGenerationConfigProps> = ({
  control,
  disabled = false
}) => {
  return (
    <div className="space-y-6">
      <div className="text-center p-4 bg-purple-50 rounded-lg border">
        <h3 className="text-lg font-semibold text-purple-900 mb-2">Domain Generation Configuration</h3>
        <p className="text-sm text-purple-700">
          Configure domain generation using the actual backend DomainGenerationPhaseConfig structure
        </p>
      </div>

      {/* Pattern Type - REQUIRED enum */}
      <FormField
        control={control}
        name="patternType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Pattern Type *</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={disabled}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select pattern type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="prefix">Prefix</SelectItem>
                <SelectItem value="suffix">Suffix</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Character Set - REQUIRED string */}
      <FormField
        control={control}
        name="characterSet"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Character Set *</FormLabel>
            <FormControl>
              <Input
                placeholder="e.g. abcdefghijklmnopqrstuvwxyz0123456789"
                {...field}
                disabled={disabled}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Constant String - REQUIRED string */}
      <FormField
        control={control}
        name="constantString"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Constant String *</FormLabel>
            <FormControl>
              <Input
                placeholder="e.g. mycompany"
                {...field}
                disabled={disabled}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Variable Length - REQUIRED number */}
      <FormField
        control={control}
        name="variableLength"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Variable Length *</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="e.g. 8"
                {...field}
                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                disabled={disabled}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* TLDs - REQUIRED Array<string> */}
      <FormField
        control={control}
        name="tlds"
        render={({ field }) => (
          <FormItem>
            <FormLabel>TLDs *</FormLabel>
            <FormControl>
              <div className="space-y-2">
                <Input
                  placeholder="Enter TLD (e.g. .com) and press Enter"
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
                  {field.value?.map((tld: string, index: number) => (
                    <Badge key={index} variant="default" className="flex items-center gap-1">
                      {tld}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          const newTlds = field.value.filter((_: string, i: number) => i !== index);
                          field.onChange(newTlds);
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

      {/* Number of Domains to Generate - Optional number */}
      <FormField
        control={control}
        name="numDomainsToGenerate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Number of Domains to Generate (optional)</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="e.g. 1000"
                {...field}
                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                disabled={disabled}
              />
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
    </div>
  );
};

export default DomainGenerationConfig;
