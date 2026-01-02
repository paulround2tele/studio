'use client';

import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import Input from '@/components/ta/form/input/InputField';
import Textarea from '@/components/ta/form/input/TextArea';
import { Control } from 'react-hook-form';

// Use the same type as the parent form for consistency
type CampaignFormData = {
  name: string;
  description?: string;
  targetKeywords?: string;
  assignedHttpPersonaId?: string;
  assignedDnsPersonaId?: string;
  proxyAssignmentMode?: string;
  assignedProxyId?: string;
  processingSpeed?: string;
  batchSize?: number;
  rotationInterval?: number;
  retryAttempts?: number;
};

interface CampaignDetailsSectionProps {
  control: Control<CampaignFormData>;
  disabled?: boolean;
}

export function CampaignDetailsSection({ control, disabled }: CampaignDetailsSectionProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Campaign Details</h3>
      </div>
      <div className="p-5 space-y-4">
        <FormField 
          control={control} 
          name="name" 
    render={({ field: _field }) => (
            <FormItem>
              <FormLabel>Campaign Name *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter campaign name" 
                  disabled={disabled}
      {..._field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} 
        />
        
        <FormField 
          control={control} 
          name="description" 
    render={({ field: _field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Optional description for this campaign" 
                  disabled={disabled}
      {..._field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} 
        />
      </div>
    </div>
  );
}
