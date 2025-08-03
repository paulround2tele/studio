'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Control } from 'react-hook-form';

interface CampaignDetailsSectionProps {
  control: Control<any>;
  disabled?: boolean;
}

export function CampaignDetailsSection({ control, disabled }: CampaignDetailsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Campaign Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField 
          control={control} 
          name="name" 
          render={({ field }) => (
            <FormItem>
              <FormLabel>Campaign Name *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter campaign name" 
                  disabled={disabled}
                  {...field} 
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
                  placeholder="Optional description for this campaign" 
                  disabled={disabled}
                  {...field} 
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
