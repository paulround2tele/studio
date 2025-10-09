'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Globe } from 'lucide-react';
import { Control } from 'react-hook-form';

interface CampaignKeywordFormValues {
  targetKeywordsInput: string;
}

interface KeywordTargetingSectionProps {
  control: Control<CampaignKeywordFormValues>;
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
          name="targetKeywordsInput" 
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
