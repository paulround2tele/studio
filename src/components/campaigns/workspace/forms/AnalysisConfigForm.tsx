   
"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import InputAdapter from '@/components/ta/adapters/InputAdapter';
import Button from '@/components/ta/ui/button/Button';
import Badge from '@/components/ta/ui/badge/Badge';
import SwitchAdapter from '@/components/ta/adapters/SwitchAdapter';
import SelectAdapter from '@/components/ta/adapters/SelectAdapter';
import { CloseIcon } from '@/icons';
import { PersonasApi } from '@/lib/api-client';
import type { PersonaResponse } from '@/lib/api-client/models/persona-response';
import { PersonaType } from '@/lib/api-client/models/persona-type';
import { apiConfiguration } from '@/lib/api/config';
import { useToast } from '@/hooks/use-toast';
import { useConfigurePhaseStandaloneMutation, campaignApi } from '@/store/api/campaignApi';
import { useAppDispatch } from '@/store/hooks';
import { pushGuidanceMessage } from '@/store/ui/campaignUiSlice';
import type { PhaseConfigurationRequest } from '@/lib/api-client/models/phase-configuration-request';
import { markConfigured } from '@/utils/phaseStatus';
import type { AnalysisConfigFormValues, AnalysisKeywordRuleFormValue } from '@/types/forms';

interface Props {
  campaignId: string;
  onConfigured?: () => void;
  readOnly?: boolean;
}

const ALL_ANALYSIS_TYPES = ['content', 'links', 'headers', 'structure'];
const MAX_PERSONAS = 5;

export const makeDefaultValues = (): AnalysisConfigFormValues => ({
  name: `Analysis - ${new Date().toLocaleDateString()}`,
  personaIds: [],
  analysisTypes: ['content'],
  includeExternal: false,
  enableSuggestions: true,
  generateReports: true,
  keywordRules: [],
});

export const buildRulePayload = (rules: AnalysisKeywordRuleFormValue[]) =>
  rules
    .map((rule) => ({
      pattern: rule.pattern.trim(),
      ruleType: rule.ruleType,
      contextChars: Number.isFinite(rule.contextChars)
        ? Math.max(0, Math.round(rule.contextChars))
        : 0,
    }))
    .filter((rule) => rule.pattern.length > 0);

export const AnalysisConfigForm: React.FC<Props> = ({ campaignId, onConfigured, readOnly }) => {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const [configurePhase, { isLoading: saving }] = useConfigurePhaseStandaloneMutation();
  const [personas, setPersonas] = useState<PersonaResponse[]>([]);
  const [loadingPersonas, setLoadingPersonas] = useState(true);
  const form = useForm<AnalysisConfigFormValues>({ defaultValues: makeDefaultValues() });
  const { control } = form;
  const ruleArray = useFieldArray({ control, name: 'keywordRules' });
  const watchedPersonaIds = form.watch('personaIds');
  const watchedAnalysisTypes = form.watch('analysisTypes');
  const watchedRules = form.watch('keywordRules');
  const [newRulePattern, setNewRulePattern] = useState('');
  const [newRuleType, setNewRuleType] = useState<'string' | 'regex'>('string');
  const [newRuleContext, setNewRuleContext] = useState(32);

  useEffect(() => {
    form.register('personaIds');
    form.register('analysisTypes');
  }, [form]);

  useEffect(() => {
    if (readOnly) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingPersonas(true);
        const personasApi = new PersonasApi(apiConfiguration);
        const response = await personasApi.personasList(
          undefined,
          undefined,
          true,
          PersonaType.http,
        );
        const candidates = Array.isArray(response.data) ? response.data : [];
        if (!cancelled) {
          setPersonas(candidates.filter((p) => p && p.id));
          if (candidates.length === 1 && form.getValues('personaIds').length === 0) {
            const lone = candidates[0];
            if (lone?.id) {
              form.setValue('personaIds', [lone.id]);
            }
          }
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          toast({ title: 'Unable to load personas', variant: 'destructive' });
        }
      } finally {
        if (!cancelled) setLoadingPersonas(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form, readOnly, toast]);

  const personaLookup = useMemo(() =>
    personas.reduce<Record<string, PersonaResponse>>((acc, p) => {
      if (p.id) acc[p.id] = p;
      return acc;
    }, {}), [personas]);

  const togglePersona = (id: string) => {
    const current = form.getValues('personaIds');
    if (current.includes(id)) {
      form.setValue('personaIds', current.filter((pid) => pid !== id));
      return;
    }
    if (current.length >= MAX_PERSONAS) {
      toast({ title: `Limit ${MAX_PERSONAS} personas`, variant: 'destructive' });
      return;
    }
    form.setValue('personaIds', [...current, id]);
  };

  const toggleAnalysisType = (type: string) => {
    const current = form.getValues('analysisTypes');
    if (current.includes(type)) {
      const next = current.filter((t) => t !== type);
      form.setValue('analysisTypes', next.length ? next : ['content']);
    } else {
      form.setValue('analysisTypes', [...current, type]);
    }
  };

  const handleAddRule = () => {
    const pattern = newRulePattern.trim();
    if (!pattern) {
      toast({ title: 'Rule pattern required', variant: 'destructive' });
      return;
    }
    ruleArray.append({
      id: `${Date.now()}`,
      pattern,
      ruleType: newRuleType,
      contextChars: newRuleContext,
    });
    setNewRulePattern('');
  };

  const handleSubmitForm = async (values: AnalysisConfigFormValues) => {
    const trimmedName = values.name.trim() || `Analysis - ${new Date().toLocaleDateString()}`;
    const payloadRules = buildRulePayload(values.keywordRules);
    if (!values.analysisTypes.length) {
      toast({ title: 'Select an analysis type', variant: 'destructive' });
      return;
    }
    const configuration: Record<string, unknown> = {
      name: trimmedName,
      personaIds: values.personaIds,
      analysisTypes: values.analysisTypes,
      includeExternal: values.includeExternal,
      enableSuggestions: values.enableSuggestions,
      generateReports: values.generateReports,
    };
    if (payloadRules.length) {
      configuration.keywordRules = payloadRules;
    }
    try {
      const request: PhaseConfigurationRequest = { configuration };
      const response = await configurePhase({ campaignId, phase: 'analysis', config: request }).unwrap();
      if (response?.status === 'configured') {
        dispatch(
          campaignApi.util.updateQueryData(
            'getPhaseStatusStandalone',
            { campaignId, phase: 'analysis' },
            (draft) => markConfigured(draft, 'analysis'),
          ),
        );
      }
      dispatch(
        campaignApi.endpoints.getPhaseStatusStandalone.initiate({ campaignId, phase: 'analysis' }),
      );
      toast({ title: 'Analysis configured' });
      dispatch(
        pushGuidanceMessage({
          campaignId,
          msg: {
            id: Date.now().toString(),
            message: 'Analysis configured',
            phase: 'analysis',
            severity: 'info',
          },
        }),
      );
      onConfigured?.();
    } catch (error) {
      console.error(error);
      toast({ title: 'Save failed', description: 'Unable to configure analysis', variant: 'destructive' });
    }
  };

  if (readOnly) {
    const snapshot = form.getValues();
    const personaNames = snapshot.personaIds
      .map((id) => personaLookup[id]?.name)
      .filter(Boolean)
      .join(', ');
    return (
      <div className="space-y-2 text-xs" data-testid="phase-analysis-readonly">
        <div><strong>Name:</strong> {snapshot.name}</div>
        <div><strong>Personas:</strong> {personaNames || snapshot.personaIds.length || '—'}</div>
        <div><strong>Analysis Types:</strong> {snapshot.analysisTypes.join(', ')}</div>
        <div><strong>Include External:</strong> {snapshot.includeExternal ? 'Yes' : 'No'}</div>
        <div><strong>AI Suggestions:</strong> {snapshot.enableSuggestions ? 'Enabled' : 'Disabled'}</div>
        <div><strong>Reports:</strong> {snapshot.generateReports ? 'Enabled' : 'Disabled'}</div>
        <div><strong>Keyword Rules:</strong> {snapshot.keywordRules.length}</div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        data-testid="phase-analysis-form"
        onSubmit={form.handleSubmit(handleSubmitForm)}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem data-testid="phase-analysis-field-name">
              <FormLabel>Configuration Name</FormLabel>
              <FormControl>
                <InputAdapter {...field} data-testid="phase-analysis-input-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2" data-testid="phase-analysis-personas">
          <div className="text-xs font-medium">Scoring Personas (optional)</div>
          {loadingPersonas ? (
            <div className="text-xs text-muted-foreground">Loading personas...</div>
          ) : personas.length === 0 ? (
            <div className="text-xs text-muted-foreground">No HTTP personas available.</div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {personas.map((persona) => (
                <div
                  key={persona.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => persona.id && togglePersona(persona.id)}
                  onKeyDown={(evt) => {
                    if (evt.key === 'Enter' && persona.id) togglePersona(persona.id);
                  }}
                  className={`p-2 border rounded text-xs flex justify-between items-center cursor-pointer ${
                    persona.id && watchedPersonaIds.includes(persona.id)
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/60'
                  }`}
                >
                  <span>{persona.name}</span>
                  {persona.id && watchedPersonaIds.includes(persona.id) && (
                    <Badge color="primary" size="sm">Selected</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
          {watchedPersonaIds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {watchedPersonaIds.map((id) => (
                <Badge key={id} color="light" size="sm" className="flex items-center gap-1">
                  {personaLookup[id]?.name || id}
                  <CloseIcon className="h-3 w-3 cursor-pointer" onClick={() => togglePersona(id)} />
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2" data-testid="phase-analysis-types">
          <div className="text-xs font-medium">Analysis Types</div>
          <div className="flex flex-wrap gap-2">
            {ALL_ANALYSIS_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                data-testid={`phase-analysis-type-${type}`}
                onClick={() => toggleAnalysisType(type)}
                className="focus:outline-none"
              >
                <Badge
                  className="cursor-pointer text-[11px]"
                  color={watchedAnalysisTypes.includes(type) ? 'primary' : 'light'}
                  size="sm"
                >
                  {type}
                </Badge>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-3" data-testid="phase-analysis-toggles">
          <div className="flex items-center justify-between border rounded px-3 py-2">
            <span>Include External Links</span>
            <SwitchAdapter
              checked={form.watch('includeExternal')}
              onChange={(checked) => form.setValue('includeExternal', !!checked)}
            />
          </div>
          <div className="flex items-center justify-between border rounded px-3 py-2">
            <span>AI Suggestions</span>
            <SwitchAdapter
              checked={form.watch('enableSuggestions')}
              onChange={(checked) => form.setValue('enableSuggestions', !!checked)}
            />
          </div>
          <div className="flex items-center justify-between border rounded px-3 py-2">
            <span>Generate Reports</span>
            <SwitchAdapter
              checked={form.watch('generateReports')}
              onChange={(checked) => form.setValue('generateReports', !!checked)}
            />
          </div>
        </div>

        <div className="space-y-2" data-testid="phase-analysis-rules">
          <div className="text-xs font-medium">Keyword Rules</div>
          <div className="flex flex-col gap-2 border rounded p-3">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_140px_120px_auto]">
              <InputAdapter
                placeholder="Pattern"
                value={newRulePattern}
                onChange={(evt) => setNewRulePattern(evt.target.value)}
              />
              <SelectAdapter
                options={[
                  { value: 'string', label: 'Contains' },
                  { value: 'regex', label: 'Regex' },
                ]}
                value={newRuleType}
                onChange={(val) => setNewRuleType(val as 'string' | 'regex')}
                placeholder="Type"
              />
              <InputAdapter
                type="number"
                min={0}
                value={newRuleContext}
                onChange={(evt) => setNewRuleContext(parseInt(evt.target.value || '0', 10))}
                placeholder="Context chars"
              />
              <Button type="button" size="sm" onClick={handleAddRule}>
                Add Rule
              </Button>
            </div>
            {watchedRules.length === 0 && (
              <div className="text-[11px] text-muted-foreground">
                Optional: add patterns to boost leads for exact strings or regex matches.
              </div>
            )}
            {ruleArray.fields.length > 0 && (
              <div className="space-y-2">
                {ruleArray.fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex flex-wrap items-center gap-2 rounded border px-2 py-1 text-xs"
                  >
                    <span className="flex-1 truncate" title={watchedRules[index]?.pattern}>
                      {watchedRules[index]?.pattern}
                    </span>
                    <Badge color="light" size="sm">{watchedRules[index]?.ruleType}</Badge>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                      ctx {watchedRules[index]?.contextChars ?? 0}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="p-1 h-auto"
                      onClick={() => ruleArray.remove(index)}
                    >
                      <CloseIcon className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end" data-testid="phase-analysis-actions">
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? 'Saving…' : 'Save Analysis'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default AnalysisConfigForm;
