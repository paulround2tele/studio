import React from 'react';
import { Control } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';

interface KeywordTargetingSectionProps {
  control: Control<any>;
  disabled?: boolean;
  needsKeywords?: boolean;
}

export const KeywordTargetingSection: React.FC<KeywordTargetingSectionProps> = ({
  control,
  disabled = false,
  needsKeywords = false
}) => {
  if (!needsKeywords) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Keyword Targeting</h3>
      
      <FormField
        control={control}
        name="targetKeywords"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Target Keywords</FormLabel>
            <FormControl>
              <Textarea 
                {...field} 
                disabled={disabled}
                placeholder="Enter keywords separated by commas or new lines"
                rows={4}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
