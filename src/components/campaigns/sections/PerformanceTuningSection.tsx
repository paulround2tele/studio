'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Settings, Gauge, RotateCcw, IterationCw } from 'lucide-react';
import { Control } from 'react-hook-form';

interface PerformanceTuningSectionProps {
  control: Control<any>;
  disabled?: boolean;
  // Backend-driven defaults and constraints
  defaultProcessingSpeed?: string;
  defaultBatchSize?: number;
  defaultRotationInterval?: number;
  defaultRetryAttempts?: number;
  maxBatchSize?: number;
  maxRotationInterval?: number;
  maxRetryAttempts?: number;
}

export function PerformanceTuningSection({
  control,
  disabled,
  defaultProcessingSpeed = 'medium',
  defaultBatchSize = 10,
  defaultRotationInterval = 30,
  defaultRetryAttempts = 3,
  maxBatchSize = 100,
  maxRotationInterval = 300,
  maxRetryAttempts = 10,
}: PerformanceTuningSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Performance Tuning
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Processing Speed - Backend-driven options */}
        <FormField 
          control={control} 
          name="processingSpeed" 
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Gauge className="h-4 w-4" />
                Processing Speed
              </FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value || defaultProcessingSpeed} 
                disabled={disabled}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select processing speed" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="slow">Slow (Conservative)</SelectItem>
                  <SelectItem value="medium">Medium (Balanced)</SelectItem>
                  <SelectItem value="fast">Fast (Aggressive)</SelectItem>
                  <SelectItem value="turbo">Turbo (Maximum)</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Controls request frequency and concurrent processing
              </FormDescription>
              <FormMessage />
            </FormItem>
          )} 
        />

        {/* Batch Size - Backend-driven constraints */}
        <FormField 
          control={control} 
          name="batchSize" 
          render={({ field }) => (
            <FormItem>
              <FormLabel>Batch Size</FormLabel>
              <FormControl>
                <Input 
                  type="number"
                  placeholder={defaultBatchSize.toString()}
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                  disabled={disabled}
                  min={1}
                  max={maxBatchSize}
                />
              </FormControl>
              <FormDescription>
                Number of targets processed simultaneously (1-{maxBatchSize})
              </FormDescription>
              <FormMessage />
            </FormItem>
          )} 
        />

        {/* Rotation Interval - Backend-driven constraints */}
        <FormField 
          control={control} 
          name="rotationInterval" 
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                Rotation Interval (seconds)
              </FormLabel>
              <FormControl>
                <Input 
                  type="number"
                  placeholder={defaultRotationInterval.toString()}
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                  disabled={disabled}
                  min={5}
                  max={maxRotationInterval}
                />
              </FormControl>
              <FormDescription>
                How often to rotate proxies and personas (5-{maxRotationInterval} seconds)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )} 
        />

        {/* Retry Attempts - Backend-driven constraints */}
        <FormField 
          control={control} 
          name="retryAttempts" 
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <IterationCw className="h-4 w-4" />
                Retry Attempts
              </FormLabel>
              <FormControl>
                <Input 
                  type="number"
                  placeholder={defaultRetryAttempts.toString()}
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                  disabled={disabled}
                  min={0}
                  max={maxRetryAttempts}
                />
              </FormControl>
              <FormDescription>
                Maximum retry attempts for failed operations (0-{maxRetryAttempts})
              </FormDescription>
              <FormMessage />
            </FormItem>
          )} 
        />
      </CardContent>
    </Card>
  );
}
