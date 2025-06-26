import React, { memo } from 'react';
import { Control, Controller } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { CampaignFormValues } from "@/lib/schemas/campaignFormSchema";

interface CampaignTuningConfigProps {
  control: Control<CampaignFormValues>;
  showHttpPorts: boolean;
}

const CampaignTuningConfig = memo<CampaignTuningConfigProps>(({ control, showHttpPorts }) => {
  return (
    <Card className="p-4 pt-2 border-dashed">
      <CardHeader className="p-2">
        <CardTitle className="text-base">Campaign Tuning</CardTitle>
        <CardDescription className="text-xs">Adjust processing parameters.</CardDescription>
      </CardHeader>
      <CardContent className="p-2 space-y-4">
        <Controller name="rotationIntervalSeconds" control={control} render={({ field }) => (
          <FormItem>
            <FormLabel>Rotation Interval (seconds)</FormLabel>
            <FormControl>
              <Input type="number" min="0" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <Controller name="processingSpeedPerMinute" control={control} render={({ field }) => (
          <FormItem>
            <FormLabel>Processing Speed Per Minute</FormLabel>
            <FormControl>
              <Input type="number" min="0" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <Controller name="batchSize" control={control} render={({ field }) => (
          <FormItem>
            <FormLabel>Batch Size</FormLabel>
            <FormControl>
              <Input type="number" min="1" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <Controller name="retryAttempts" control={control} render={({ field }) => (
          <FormItem>
            <FormLabel>Retry Attempts</FormLabel>
            <FormControl>
              <Input type="number" min="0" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {showHttpPorts && (
          <Controller name="targetHttpPorts" control={control} render={({ field }) => (
            <FormItem>
              <FormLabel>Target HTTP Ports (comma-separated)</FormLabel>
              <FormControl>
                <Input
                  value={field.value?.join(', ') || ''}
                  onChange={(e) => {
                    const ports = e.target.value
                      .split(',')
                      .map(p => parseInt(p.trim(), 10))
                      .filter(p => !Number.isNaN(p));
                    field.onChange(ports);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        )}
      </CardContent>
    </Card>
  );
});

CampaignTuningConfig.displayName = 'CampaignTuningConfig';

export default CampaignTuningConfig;
