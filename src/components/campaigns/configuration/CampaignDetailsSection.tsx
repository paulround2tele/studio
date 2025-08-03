import React from 'react';
import { Control } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface CampaignDetailsSectionProps {
  control: Control<any>;
  disabled?: boolean;
}

export const CampaignDetailsSection: React.FC<CampaignDetailsSectionProps> = ({
  control,
  disabled = false
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Campaign Details</h3>
      
      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Campaign Name</FormLabel>
            <FormControl>
              <Input 
                {...field} 
                disabled={disabled}
                placeholder="Enter campaign name"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea 
                {...field} 
                disabled={disabled}
                placeholder="Describe this phase configuration"
                rows={3}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
