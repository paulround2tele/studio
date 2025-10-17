"use client";
import React from 'react';
import { useForm } from 'react-hook-form';
// Removed phantom PhaseStatusResponse enums (not generated); use literal phases and markConfigured helper
import { markConfigured } from '@/utils/phaseStatus';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
// Legacy DomainGenerationConfig component removed with unified pipeline cleanup.
// Provide minimal inline field set instead.
import { useConfigurePhaseStandaloneMutation, campaignApi } from '@/store/api/campaignApi';
import { useAppDispatch } from '@/store/hooks';
import { pushGuidanceMessage } from '@/store/ui/campaignUiSlice';
import type { PhaseConfigurationRequest } from '@/lib/api-client/models/phase-configuration-request';
import type { DiscoveryConfigFormValues } from '@/types/forms';

// Domain generation pattern types
type PatternType = 'prefix' | 'suffix' | 'both';

// Extended form values for discovery phase
interface DiscoveryFormValues extends DiscoveryConfigFormValues {
  patternType?: PatternType;
  characterSet?: string;
  constantString?: string;
  variableLength?: number;
  prefixVariableLength?: number;
  suffixVariableLength?: number;
  tlds?: string[];
  numDomainsToGenerate?: number;
  batchSize?: number;
}
import { useToast } from '@/hooks/use-toast';

interface Props { campaignId: string; onConfigured?: () => void; readOnly?: boolean; }

export const DiscoveryConfigForm: React.FC<Props> = ({ campaignId, onConfigured, readOnly }) => {
  const { toast } = useToast();
  const [configurePhase, { isLoading }] = useConfigurePhaseStandaloneMutation();
  const dispatch = useAppDispatch();
  const form = useForm<DiscoveryFormValues>({
    defaultValues: {
      enabled: true,
      patternType: 'prefix',
      characterSet: 'abcdefghijklmnopqrstuvwxyz0123456789',
      constantString: 'brand',
      variableLength: 6,
      prefixVariableLength: 6,
      suffixVariableLength: 6,
      tlds: ['.com', '.net'],
      numDomainsToGenerate: 1000,
      batchSize: 50,
    },
  });

  const onSubmit = async (values: DiscoveryFormValues) => {
    try {
      const firstTld = Array.isArray(values.tlds) && values.tlds.length > 0 ? values.tlds[0] : '';
      const tld = firstTld && !firstTld.startsWith('.') ? `.${firstTld}` : firstTld;
      // Normalize variableLength based on pattern selection
      let variableLength = values.variableLength;
      if (values.patternType === 'prefix' && values.prefixVariableLength) variableLength = values.prefixVariableLength;
      if (values.patternType === 'suffix' && values.suffixVariableLength) variableLength = values.suffixVariableLength;
      if (values.patternType === 'both') {
        // for backend expecting single variableLength we can sum, while also pass explicit fields for future expansion
        const total = (values.prefixVariableLength||0) + (values.suffixVariableLength||0);
        if (total > 0) variableLength = total;
      }
      const configuration: Record<string, unknown> = {
        ...values,
        prefixVariableLength: values.prefixVariableLength,
        suffixVariableLength: values.suffixVariableLength,
        variableLength,
        tld,
      };
      const config: PhaseConfigurationRequest = { configuration };
      const result = await configurePhase({ campaignId, phase: 'discovery', config }).unwrap();
      // Optimistically ensure cache has status configured if backend responded
  if (result?.status === 'configured') {
        dispatch(campaignApi.util.updateQueryData(
          'getPhaseStatusStandalone',
          { campaignId, phase: 'discovery' },
          (draft) => markConfigured(draft, 'discovery')
        ));
      }
      // Force immediate refetch for authoritative status
      dispatch(campaignApi.endpoints.getPhaseStatusStandalone.initiate({ campaignId, phase: 'discovery' }));
      // Optimistic: if API returned status, dispatch guidance; otherwise force refetch hook elsewhere.
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
      <div className="space-y-2 text-xs" data-testid="phase-discovery-readonly">
        <div data-testid="phase-discovery-readonly-pattern"><strong>Pattern:</strong> {values.patternType}</div>
        <div data-testid="phase-discovery-readonly-tlds"><strong>TLDs:</strong> {(values.tlds||[]).join(', ')}</div>
  <div data-testid="phase-discovery-readonly-variable-length"><strong>Total Variable Length:</strong> {(values.prefixVariableLength || 0) + (values.suffixVariableLength || 0) || values.variableLength}</div>
        <div data-testid="phase-discovery-readonly-count"><strong>Count:</strong> {values.numDomainsToGenerate}</div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form data-testid="phase-discovery-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 text-xs" data-testid="phase-discovery-fields">
          <div className="flex flex-col gap-1" data-testid="phase-discovery-field-pattern-type">
            <label className="font-medium">Pattern Type</label>
            <select data-testid="phase-discovery-input-pattern-type" disabled={isLoading} className="border rounded px-2 py-1 bg-[hsl(var(--input))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-ring" {...form.register('patternType')}>
              <option value="prefix">Prefix</option>
              <option value="suffix">Suffix</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div className="flex flex-col gap-1" data-testid="phase-discovery-field-constant-string">
            <label className="font-medium">Constant String</label>
            <Input data-testid="phase-discovery-input-constant-string" disabled={isLoading} {...form.register('constantString')} />
          </div>
          {/* Dynamic variable length fields */}
          {(() => {
            const pt = form.watch('patternType');
            if (pt === 'prefix') return (
              <div className="flex flex-col gap-1" data-testid="phase-discovery-field-prefix-length">
                <label className="font-medium">Prefix Variable Length</label>
                <Input data-testid="phase-discovery-input-prefix-length" type="number" disabled={isLoading} {...form.register('prefixVariableLength', { valueAsNumber: true })} />
              </div>
            );
            if (pt === 'suffix') return (
              <div className="flex flex-col gap-1" data-testid="phase-discovery-field-suffix-length">
                <label className="font-medium">Suffix Variable Length</label>
                <Input data-testid="phase-discovery-input-suffix-length" type="number" disabled={isLoading} {...form.register('suffixVariableLength', { valueAsNumber: true })} />
              </div>
            );
            if (pt === 'both') return (
              <div className="flex flex-col gap-1 md:col-span-2" data-testid="phase-discovery-field-both-lengths">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1" data-testid="phase-discovery-field-prefix-length">
                    <label className="font-medium">Prefix Variable Length</label>
                    <Input data-testid="phase-discovery-input-prefix-length" type="number" disabled={isLoading} {...form.register('prefixVariableLength', { valueAsNumber: true })} />
                  </div>
                  <div className="flex flex-col gap-1" data-testid="phase-discovery-field-suffix-length">
                    <label className="font-medium">Suffix Variable Length</label>
                    <Input data-testid="phase-discovery-input-suffix-length" type="number" disabled={isLoading} {...form.register('suffixVariableLength', { valueAsNumber: true })} />
                  </div>
                </div>
              </div>
            );
            return null;
          })()}
          <div className="flex flex-col gap-1 md:col-span-2" data-testid="phase-discovery-field-character-set">
            <label className="font-medium">Character Set</label>
            <Textarea data-testid="phase-discovery-input-character-set" disabled={isLoading} rows={2} className="font-mono" {...form.register('characterSet')} />
          </div>
          <div className="flex flex-col gap-1" data-testid="phase-discovery-field-num-domains">
            <label className="font-medium">Num Domains</label>
            <Input data-testid="phase-discovery-input-num-domains" type="number" disabled={isLoading} {...form.register('numDomainsToGenerate', { valueAsNumber: true })} />
          </div>
          <div className="flex flex-col gap-1" data-testid="phase-discovery-field-batch-size">
            <label className="font-medium">Batch Size</label>
            <Input data-testid="phase-discovery-input-batch-size" type="number" disabled={isLoading} {...form.register('batchSize', { valueAsNumber: true })} />
          </div>
          <div className="flex flex-col gap-1 md:col-span-2" data-testid="phase-discovery-field-tlds">
            <label className="font-medium">TLDs (comma separated)</label>
            <Input data-testid="phase-discovery-input-tlds" disabled={isLoading} {...form.register('tlds' as const)} onBlur={() => {
              const rawVal = form.getValues('tlds') as string | string[] | undefined;
              if (typeof rawVal === 'string') {
                const arr: string[] = rawVal.split(',').map((s: string) => s.trim()).filter(Boolean);
                form.setValue('tlds', arr, { shouldDirty: true });
              }
            }} />
          </div>
        </div>
        <div className="flex justify-end gap-2" data-testid="phase-discovery-actions">
          <Button data-testid="phase-discovery-submit" type="submit" size="sm" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Discovery'}</Button>
        </div>
      </form>
    </Form>
  );
};

export default DiscoveryConfigForm;
