"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import Button from '@/components/ta/ui/button/Button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import InputAdapter from '@/components/ta/adapters/InputAdapter';
import SwitchAdapter from '@/components/ta/adapters/SwitchAdapter';
import { useToast } from '@/hooks/use-toast';
import { useConfigurePhaseStandaloneMutation, campaignApi } from '@/store/api/campaignApi';
import { useAppDispatch } from '@/store/hooks';
import { pushGuidanceMessage } from '@/store/ui/campaignUiSlice';
import type { PhaseConfigurationRequest } from '@/lib/api-client/models/phase-configuration-request';
import { markConfigured } from '@/utils/phaseStatus';
import type { EnrichmentConfigFormValues } from '@/types/forms';

interface Props {
  campaignId: string;
  onConfigured?: () => void;
  readOnly?: boolean;
}

const MATCH_SCORE_RANGE = { min: 0.05, max: 0.95 } as const;
const GRACE_RANGE = { min: 0, max: 0.6 } as const;
const MIN_BYTES_RANGE = { min: 256, max: 2 * 1024 * 1024 } as const;
const PARKED_RANGE = { min: 0, max: 1 } as const;

export const ENRICHMENT_DEFAULT_VALUES: EnrichmentConfigFormValues = {
  matchScoreThreshold: 0.27,
  lowScoreGraceThreshold: 0.24,
  minContentBytes: 1024,
  parkedConfidenceFloor: 0.45,
  requireStructuralSignals: true,
};

const clamp = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

export const normalizeEnrichmentValues = (values: EnrichmentConfigFormValues): EnrichmentConfigFormValues => {
  const matchScoreThreshold = clamp(values.matchScoreThreshold, MATCH_SCORE_RANGE.min, MATCH_SCORE_RANGE.max);
  const lowScoreGraceThreshold = clamp(
    Math.min(values.lowScoreGraceThreshold, matchScoreThreshold),
    GRACE_RANGE.min,
    GRACE_RANGE.max,
  );
  const minContentBytes = Math.round(
    clamp(values.minContentBytes, MIN_BYTES_RANGE.min, MIN_BYTES_RANGE.max),
  );
  const parkedConfidenceFloor = clamp(values.parkedConfidenceFloor, PARKED_RANGE.min, PARKED_RANGE.max);
  return {
    matchScoreThreshold,
    lowScoreGraceThreshold,
    minContentBytes,
    parkedConfidenceFloor,
    requireStructuralSignals: !!values.requireStructuralSignals,
  };
};

const numberInputProps = {
  className: 'font-mono',
  step: '0.01',
};

export const EnrichmentConfigForm: React.FC<Props> = ({ campaignId, onConfigured, readOnly }) => {
  const form = useForm<EnrichmentConfigFormValues>({ defaultValues: ENRICHMENT_DEFAULT_VALUES });
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const [configurePhase, { isLoading: saving }] = useConfigurePhaseStandaloneMutation();

  const submitForm = async (values: EnrichmentConfigFormValues) => {
    const normalized = normalizeEnrichmentValues(values);
    const configuration: Record<string, unknown> = {
      matchScoreThreshold: normalized.matchScoreThreshold,
      lowScoreGraceThreshold: normalized.lowScoreGraceThreshold,
      minContentBytes: normalized.minContentBytes,
      parkedConfidenceFloor: normalized.parkedConfidenceFloor,
      requireStructuralSignals: normalized.requireStructuralSignals,
    };
    const configRequest: PhaseConfigurationRequest = { configuration };

    try {
      const result = await configurePhase({ campaignId, phase: 'enrichment', config: configRequest }).unwrap();
      if (result?.status === 'configured') {
        dispatch(
          campaignApi.util.updateQueryData(
            'getPhaseStatusStandalone',
            { campaignId, phase: 'enrichment' },
            (draft) => markConfigured(draft, 'enrichment'),
          ),
        );
      }
      dispatch(
        campaignApi.endpoints.getPhaseStatusStandalone.initiate({ campaignId, phase: 'enrichment' }),
      );
      toast({ title: 'Enrichment configured' });
      dispatch(
        pushGuidanceMessage({
          campaignId,
          msg: {
            id: Date.now().toString(),
            message: 'Enrichment configured',
            phase: 'enrichment',
            severity: 'info',
          },
        }),
      );
      onConfigured?.();
    } catch (error) {
      console.error(error);
      toast({
        title: 'Save failed',
        description: 'Unable to configure enrichment phase',
        variant: 'destructive',
      });
    }
  };

  if (readOnly) {
    const snapshot = normalizeEnrichmentValues(form.getValues());
    return (
      <div className="space-y-2 text-xs" data-testid="phase-enrichment-readonly">
        <div>
          <strong>Match Score:</strong> {snapshot.matchScoreThreshold.toFixed(2)}
        </div>
        <div>
          <strong>Low-Score Grace:</strong> {snapshot.lowScoreGraceThreshold.toFixed(2)}
        </div>
        <div>
          <strong>Min Content Bytes:</strong> {snapshot.minContentBytes}
        </div>
        <div>
          <strong>Parked Floor:</strong> {snapshot.parkedConfidenceFloor.toFixed(2)}
        </div>
        <div>
          <strong>Require Structural Signals:</strong> {snapshot.requireStructuralSignals ? 'Yes' : 'No'}
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        data-testid="phase-enrichment-form"
        onSubmit={form.handleSubmit(submitForm)}
        className="space-y-4"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="matchScoreThreshold"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Match Score Threshold</FormLabel>
                <FormControl>
                  <InputAdapter
                    {...numberInputProps}
                    type="number"
                    min={MATCH_SCORE_RANGE.min}
                    max={MATCH_SCORE_RANGE.max}
                    value={field.value}
                    onChange={(evt) => field.onChange(parseFloat(evt.target.value))}
                  />
                </FormControl>
                <div className="text-[11px] text-muted-foreground">
                  Leads scoring above this value are auto-matches. Range {MATCH_SCORE_RANGE.min} - {MATCH_SCORE_RANGE.max}.
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lowScoreGraceThreshold"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Low-Score Grace Threshold</FormLabel>
                <FormControl>
                  <InputAdapter
                    {...numberInputProps}
                    type="number"
                    min={GRACE_RANGE.min}
                    max={GRACE_RANGE.max}
                    value={field.value}
                    onChange={(evt) => field.onChange(parseFloat(evt.target.value))}
                  />
                </FormControl>
                <div className="text-[11px] text-muted-foreground">
                  Secondary threshold applied when other signals look promising. Cannot exceed match score.
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="minContentBytes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Minimum Content Bytes</FormLabel>
                <FormControl>
                  <InputAdapter
                    type="number"
                    min={MIN_BYTES_RANGE.min}
                    max={MIN_BYTES_RANGE.max}
                    value={field.value}
                    onChange={(evt) => field.onChange(parseInt(evt.target.value, 10) || 0)}
                  />
                </FormControl>
                <div className="text-[11px] text-muted-foreground">
                  Ignores sparse pages below this size. Range {MIN_BYTES_RANGE.min} - {MIN_BYTES_RANGE.max} bytes.
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="parkedConfidenceFloor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Parked Confidence Floor</FormLabel>
                <FormControl>
                  <InputAdapter
                    {...numberInputProps}
                    type="number"
                    min={PARKED_RANGE.min}
                    max={PARKED_RANGE.max}
                    value={field.value}
                    onChange={(evt) => field.onChange(parseFloat(evt.target.value))}
                  />
                </FormControl>
                <div className="text-[11px] text-muted-foreground">
                  Domains with higher parked confidence are auto-rejected.
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="requireStructuralSignals"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded border px-3 py-2">
              <div>
                <FormLabel>Require Structural Signals</FormLabel>
                <div className="text-[11px] text-muted-foreground">
                  When enabled, thin pages without headings/links are ignored even with good scores.
                </div>
              </div>
              <FormControl>
                <SwitchAdapter checked={field.value} onChange={(checked) => field.onChange(!!checked)} />
              </FormControl>
            </FormItem>
          )}
        />
        <div className="flex justify-end" data-testid="phase-enrichment-actions">
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? 'Saving…' : 'Save Enrichment'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default EnrichmentConfigForm;
