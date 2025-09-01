"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import DomainGenerationConfig from '@/components/campaigns/configuration/DomainGenerationConfig';
import { useToast } from '@/hooks/use-toast';
import { useConfigurePhaseStandaloneMutation } from '@/store/api/campaignApi';
import type { ServicesDomainGenerationPhaseConfig } from '@/lib/api-client/models/services-domain-generation-phase-config';
import type { PhaseConfigurationRequest } from '@/lib/api-client/models/phase-configuration-request';

interface DiscoveryConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  onConfigured: () => void;
}

export default function DiscoveryConfigModal({ isOpen, onClose, campaignId, onConfigured }: DiscoveryConfigModalProps) {
  const { toast } = useToast();
  const [configuring, setConfiguring] = useState(false);
  const [configurePhase] = useConfigurePhaseStandaloneMutation();

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
      setConfiguring(true);
      // Discovery expects the raw config map (not nested) so the backend can map it to typed DomainGenerationConfig
      const config: PhaseConfigurationRequest = {
        configuration: values as any,
      };
      await configurePhase({ campaignId, phase: 'discovery', config }).unwrap();
      toast({ title: 'Discovery configuration saved', description: 'Domain generation settings applied.' });
      onConfigured();
      onClose();
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to save', description: 'Check inputs and try again.', variant: 'destructive' });
    } finally {
      setConfiguring(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Discovery (Domain Generation)</DialogTitle>
          <DialogDescription>
            Set how domains will be generated. After saving, start the Discovery phase from the Discovery card to begin generation.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <DomainGenerationConfig control={form.control as any} disabled={configuring} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={configuring}>{configuring ? 'Saving...' : 'Save Discovery'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
