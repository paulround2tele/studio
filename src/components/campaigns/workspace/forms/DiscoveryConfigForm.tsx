"use client";
import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import DomainGenerationConfig from '@/components/campaigns/configuration/DomainGenerationConfig';
import { useConfigurePhaseStandaloneMutation } from '@/store/api/campaignApi';
import { useAppDispatch } from '@/store/hooks';
import { pushGuidanceMessage } from '@/store/ui/campaignUiSlice';
import type { ServicesDomainGenerationPhaseConfig } from '@/lib/api-client/models/services-domain-generation-phase-config';
import type { PhaseConfigurationRequest } from '@/lib/api-client/models/phase-configuration-request';
import { useToast } from '@/hooks/use-toast';

interface Props { campaignId: string; onConfigured?: () => void; readOnly?: boolean; }

export const DiscoveryConfigForm: React.FC<Props> = ({ campaignId, onConfigured, readOnly }) => {
  const { toast } = useToast();
  const [configurePhase, { isLoading }] = useConfigurePhaseStandaloneMutation();
  const dispatch = useAppDispatch();
  const form = useForm<ServicesDomainGenerationPhaseConfig>({
    defaultValues: {
      patternType: 'prefix' as any,
      characterSet: 'abcdefghijklmnopqrstuvwxyz0123456789',
      constantString: 'brand',
      variableLength: 6,
      tlds: ['.com', '.net'],
      numDomainsToGenerate: 1000,
      batchSize: 50,
    },
  });

  const onSubmit = async (values: ServicesDomainGenerationPhaseConfig) => {
    try {
      const firstTld = Array.isArray(values.tlds) && values.tlds.length > 0 ? values.tlds[0] : '';
      const tld = firstTld && !firstTld.startsWith('.') ? `.${firstTld}` : firstTld;
      const configuration = { ...values, tld } as any;
      const config: PhaseConfigurationRequest = { configuration };
      await configurePhase({ campaignId, phase: 'discovery', config }).unwrap();
  toast({ title: 'Discovery configuration saved', description: 'Domain generation settings applied.' });
  dispatch(pushGuidanceMessage({ campaignId, msg: { id: Date.now().toString(), message: 'Discovery configured', phase: 'discovery', severity: 'info' } }));
      onConfigured?.();
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to save', description: 'Check inputs and try again.', variant: 'destructive' });
    }
  };

  if (readOnly) {
    const values = form.getValues();
    return (
      <div className="space-y-2 text-xs">
        <div><strong>Pattern:</strong> {values.patternType}</div>
        <div><strong>TLDs:</strong> {(values.tlds||[]).join(', ')}</div>
        <div><strong>Variable Length:</strong> {values.variableLength}</div>
        <div><strong>Count:</strong> {values.numDomainsToGenerate}</div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <DomainGenerationConfig control={form.control as any} disabled={isLoading} />
        <div className="flex justify-end gap-2">
          <Button type="submit" size="sm" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Discovery'}</Button>
        </div>
      </form>
    </Form>
  );
};

export default DiscoveryConfigForm;
