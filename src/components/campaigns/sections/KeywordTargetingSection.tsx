'use client';

import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import Textarea from '@/components/ta/form/input/TextArea';
import { GlobeIcon } from '@/icons';
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

interface KeywordTargetingSectionProps {
  control: Control<CampaignFormData>;
  disabled?: boolean;
  needsKeywords?: boolean; // Backend-driven condition
}

export function KeywordTargetingSection({ 
  control, 
  disabled, 
  needsKeywords = false 
}: KeywordTargetingSectionProps) {
  // Don't render if backend says this phase doesn't need keywords
  if (!needsKeywords) {
    return null;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 flex items-center gap-2">
          <GlobeIcon className="h-4 w-4" />
          HTTP Keyword Targeting
        </h3>
      </div>
      <div className="p-5">
        <FormField 
          control={control} 
          name="targetKeywords" 
    render={({ field: _field }) => (
            <FormItem>
              <FormLabel>Target Keywords *</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter keywords separated by commas (e.g., telecom, voip, saas, business)"
                  disabled={disabled}
                  rows={3}
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
