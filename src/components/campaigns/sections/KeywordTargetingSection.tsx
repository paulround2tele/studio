'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Globe } from 'lucide-react';
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="h-4 w-4" />
          HTTP Keyword Targeting
        </CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
