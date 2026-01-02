'use client';

import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import SelectAdapter from '@/components/ta/adapters/SelectAdapter';
import InputAdapter from '@/components/ta/adapters/InputAdapter';
import { SettingsIcon, GaugeIcon, RotateCcwIcon, IterationCwIcon } from '@/icons';
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

interface PerformanceTuningSectionProps {
  control: Control<CampaignFormData>;
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
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 flex items-center gap-2">
          <SettingsIcon className="h-4 w-4" />
          Performance Tuning
        </h3>
      </div>
      <div className="p-5 space-y-4">
        {/* Processing Speed - Backend-driven options */}
        <FormField 
          control={control} 
          name="processingSpeed" 
          render={({ field: _field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <GaugeIcon className="h-4 w-4" />
                Processing Speed
              </FormLabel>
              <FormControl>
                <SelectAdapter
                  options={[
                    { value: 'slow', label: 'Slow (Conservative)' },
                    { value: 'medium', label: 'Medium (Balanced)' },
                    { value: 'fast', label: 'Fast (Aggressive)' },
                    { value: 'turbo', label: 'Turbo (Maximum)' },
                  ]}
                  value={_field.value || defaultProcessingSpeed}
                  onChange={_field.onChange}
                  disabled={disabled}
                  placeholder="Select processing speed"
                />
              </FormControl>
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
          render={({ field: _field }) => (
            <FormItem>
              <FormLabel>Batch Size</FormLabel>
              <FormControl>
                <InputAdapter 
                  type="number"
                  placeholder={defaultBatchSize.toString()}
                  value={_field.value || ''}
                  onChange={(e) => _field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
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
          render={({ field: _field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <RotateCcwIcon className="h-4 w-4" />
                Rotation Interval (seconds)
              </FormLabel>
              <FormControl>
                <InputAdapter 
                  type="number"
                  placeholder={defaultRotationInterval.toString()}
                  value={_field.value || ''}
                  onChange={(e) => _field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
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
          render={({ field: _field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <IterationCwIcon className="h-4 w-4" />
                Retry Attempts
              </FormLabel>
              <FormControl>
                <InputAdapter 
                  type="number"
                  placeholder={defaultRetryAttempts.toString()}
                  value={_field.value || ''}
                  onChange={(e) => _field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
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
      </div>
    </div>
  );
}
