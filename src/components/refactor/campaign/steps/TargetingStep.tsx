/**
 * Targeting Step - Personas, keywords, and simple filters
 * Migrated to TailAdmin + Tailwind patterns (Dec 31, 2025)
 */

import React, { useMemo, useState } from 'react';
import Input from '@/components/ta/form/input/InputField';
import Label from '@/components/ta/form/Label';
import Alert from '@/components/ta/ui/alert/Alert';
import Checkbox from '@/components/ta/form/input/Checkbox';
import Button from '@/components/ta/ui/button/Button';
import Badge from '@/components/ta/ui/badge/Badge';
import { Info, RefreshCcw, X } from 'lucide-react';
import type { ExecutionMode, WizardTargetingStep } from '../../types';

interface PersonaOption {
  id: string;
  name: string;
}

interface KeywordSetOption {
  id: string;
  name: string;
  description?: string;
  ruleCount?: number;
}

interface TargetingStepProps {
  data: Partial<WizardTargetingStep>;
  onChange: (data: Partial<WizardTargetingStep>) => void;
  dnsPersonas: PersonaOption[];
  httpPersonas: PersonaOption[];
  keywordSets: KeywordSetOption[];
  personasLoading: boolean;
  personasError?: string | null;
  onRetryPersonas?: () => void;
  executionMode?: ExecutionMode;
}

export function TargetingStep({
  data,
  onChange,
  dnsPersonas,
  httpPersonas,
  keywordSets,
  personasLoading,
  personasError,
  onRetryPersonas,
  executionMode,
}: TargetingStepProps) {
  const [pendingAdHocKeyword, setPendingAdHocKeyword] = useState('');

  const selectedDns = data.dnsPersonas || [];
  const selectedHttp = data.httpPersonas || [];
  const selectedKeywordSetIds = data.keywordSetIds || [];
  const adHocKeywords = data.adHocKeywords || [];
  const includeKeywords = data.includeKeywords || [];

  const autoMode = executionMode === 'auto';

  const dnsPersonaNames = useMemo(() => new Map(dnsPersonas.map(p => [p.id, p.name])), [dnsPersonas]);
  const httpPersonaNames = useMemo(() => new Map(httpPersonas.map(p => [p.id, p.name])), [httpPersonas]);
  const keywordSetNameMap = useMemo(() => new Map(keywordSets.map(set => [set.id, set.name])), [keywordSets]);

  const applyIncludeKeywords = (raw: string) => {
    const parsed = raw.split(',').map(value => value.trim()).filter(Boolean);
    onChange({
      includeKeywords: parsed,
      keywords: parsed,
    });
  };

  const applyExcludeKeywords = (raw: string) => {
    const parsed = raw.split(',').map(value => value.trim()).filter(Boolean);
    onChange({
      excludeKeywords: parsed,
    });
  };

  const applyExcludeExtensions = (raw: string) => {
    const parsed = raw.split(',').map(value => value.trim()).filter(Boolean);
    onChange({
      excludeExtensions: parsed,
    });
  };

  const togglePersona = (personaId: string, name: string, type: 'dns' | 'http', nextChecked: boolean | 'indeterminate') => {
    if (!personaId) return;
    if (type === 'dns') {
      const shouldSelect = nextChecked === true || (nextChecked === 'indeterminate' && !selectedDns.includes(personaId));
      const nextIds = shouldSelect
        ? Array.from(new Set([...selectedDns, personaId]))
        : selectedDns.filter(id => id !== personaId);
      const nextNames = nextIds.map(id => dnsPersonaNames.get(id) || id);
      onChange({
        dnsPersonas: nextIds,
        dnsPersonaNames: nextNames,
      });
      return;
    }

    const shouldSelect = nextChecked === true || (nextChecked === 'indeterminate' && !selectedHttp.includes(personaId));
    const nextIds = shouldSelect
      ? Array.from(new Set([...selectedHttp, personaId]))
      : selectedHttp.filter(id => id !== personaId);
    const nextNames = nextIds.map(id => httpPersonaNames.get(id) || id);
    onChange({
      httpPersonas: nextIds,
      httpPersonaNames: nextNames,
      analysisPersonas: nextIds,
      analysisPersonaNames: nextNames,
    });
  };

  const addAdHocKeyword = () => {
    const trimmed = pendingAdHocKeyword.trim();
    if (!trimmed) return;
    if (adHocKeywords.includes(trimmed)) {
      setPendingAdHocKeyword('');
      return;
    }
    onChange({
      adHocKeywords: [...adHocKeywords, trimmed],
    });
    setPendingAdHocKeyword('');
  };

  const removeAdHocKeyword = (keyword: string) => {
    onChange({
      adHocKeywords: adHocKeywords.filter(item => item !== keyword),
    });
  };

  const toggleKeywordSet = (keywordSetId: string) => {
    if (!keywordSetId) {
      return;
    }
    const isSelected = selectedKeywordSetIds.includes(keywordSetId);
    const nextIds = isSelected
      ? selectedKeywordSetIds.filter(id => id !== keywordSetId)
      : [...selectedKeywordSetIds, keywordSetId];
    const nextNames = nextIds.map(id => keywordSetNameMap.get(id) || id);
    onChange({
      keywordSetIds: nextIds,
      keywordSetNames: nextNames,
    });
  };

  return (
    <div className="space-y-6">
      <Alert
        variant="info"
        title="Targeting Personas & Keywords"
        message={autoMode 
          ? 'Choose personas to run DNS and enrichment phases and supply the keywords used for analysis. Auto mode requires at least one DNS persona, one enrichment persona, and one keyword.'
          : 'Choose personas to run DNS and enrichment phases and supply the keywords used for analysis. You can configure these later from the campaign dashboard if needed.'
        }
      />

      {personasError && (
        <div className="rounded-lg border border-error-200 bg-error-50 p-4 dark:border-error-500/30 dark:bg-error-500/10">
          <div className="flex items-start gap-3">
            <svg className="mt-0.5 h-5 w-5 text-error-600 dark:text-error-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-error-800 dark:text-error-300">Persona data unavailable</h4>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-sm text-error-700 dark:text-error-400">{personasError}</span>
                {onRetryPersonas && (
                  <Button variant="outline" size="sm" onClick={onRetryPersonas} startIcon={<RefreshCcw className="h-3 w-3" />}>
                    Retry
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">DNS Personas</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Select personas that resolve DNS records for generated domains.</p>
        </div>
        {personasLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading personas...</p>
        ) : dnsPersonas.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No DNS personas available. Create one before running validation.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {dnsPersonas.map(persona => {
              const checked = selectedDns.includes(persona.id);
              return (
                <label
                  key={persona.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${checked ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-gray-200 dark:border-gray-700 hover:border-brand-300'}`}
                >
                  <Checkbox
                    checked={checked}
                    onChange={(value) => togglePersona(persona.id, persona.name, 'dns', value)}
                  />
                  <span className="text-sm font-medium text-gray-800 dark:text-white/90">{persona.name}</span>
                </label>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Enrichment Personas</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Select personas used during HTTP enrichment and downstream analysis.</p>
        </div>
        {personasLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading personas...</p>
        ) : httpPersonas.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No enrichment personas available. Create one before running enrichment.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {httpPersonas.map(persona => {
              const checked = selectedHttp.includes(persona.id);
              return (
                <label
                  key={persona.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${checked ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-gray-200 dark:border-gray-700 hover:border-brand-300'}`}
                >
                  <Checkbox
                    checked={checked}
                    onChange={(value) => togglePersona(persona.id, persona.name, 'http', value)}
                  />
                  <span className="text-sm font-medium text-gray-800 dark:text-white/90">{persona.name}</span>
                </label>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Keyword Sets</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Choose curated keyword collections that seed HTTP validation and enrichment.</p>
          </div>
          {selectedKeywordSetIds.length === 0 && (
            <span className="text-[11px] font-medium text-error-500">Required</span>
          )}
        </div>
        {personasLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading keyword sets...</p>
        ) : keywordSets.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No keyword sets available. Create one before launching campaigns.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {keywordSets.map(set => {
              const selected = selectedKeywordSetIds.includes(set.id);
              return (
                <button
                  type="button"
                  key={set.id}
                  onClick={() => toggleKeywordSet(set.id)}
                  className={`rounded-lg border p-3 text-left transition-colors ${selected ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-gray-200 dark:border-gray-700 hover:border-brand-300'}`}
                >
                  <div className="flex items-center justify-between gap-2 text-sm font-medium text-gray-800 dark:text-white/90">
                    <span>{set.name}</span>
                    {selected && <Badge color="primary" size="sm">Selected</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{set.description || 'No description provided.'}</p>
                  {typeof set.ruleCount === 'number' && (
                    <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">{set.ruleCount} rules</p>
                  )}
                </button>
              );
            })}
          </div>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          At least one keyword set is required for every campaign. Combine sets with custom keywords for nuanced enrichment.
        </p>
      </section>

      <section className="space-y-2">
        <Label htmlFor="includeKeywords">Include Keywords</Label>
        <Input
          id="includeKeywords"
          type="text"
          placeholder="keyword1, keyword2, keyword3"
          defaultValue={includeKeywords.join(', ')}
          onChange={(event) => applyIncludeKeywords(event.target.value)}
        />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          These keywords seed HTTP enrichment and downstream analysis. Provide at least one to run in auto mode.
        </p>
      </section>

      <section className="space-y-2">
        <Label htmlFor="customKeyword">Custom Keywords</Label>
        <div className="flex gap-2">
          <input
            id="customKeyword"
            type="text"
            placeholder="Add a single keyword and press Enter"
            value={pendingAdHocKeyword}
            onChange={(event) => setPendingAdHocKeyword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addAdHocKeyword();
              }
            }}
            className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
          />
          <Button variant="outline" onClick={addAdHocKeyword}>
            Add
          </Button>
        </div>
        {adHocKeywords.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {adHocKeywords.map(keyword => (
              <span 
                key={keyword} 
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-white/[0.03] dark:text-white/80"
              >
                {keyword}
                <button
                  type="button"
                  onClick={() => removeAdHocKeyword(keyword)}
                  aria-label={`Remove keyword ${keyword}`}
                  className="rounded-full p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Optional additional keywords sent as ad-hoc prompts to the enrichment engine.
        </p>
      </section>

      <section className="space-y-2">
        <Label>Exclude Keywords</Label>
        <Input
          type="text"
          placeholder="spam, adult, illegal"
          defaultValue={(data.excludeKeywords || []).join(', ')}
          onChange={(event) => applyExcludeKeywords(event.target.value)}
        />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Domains containing these terms can be deprioritized or skipped during review workflows.
        </p>
      </section>

      <section className="space-y-2">
        <Label>Exclude Extensions</Label>
        <Input
          type="text"
          placeholder="gov, edu, mil"
          defaultValue={(data.excludeExtensions || []).join(', ')}
          onChange={(event) => applyExcludeExtensions(event.target.value)}
        />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Skip certain domain extensions (comma-separated, without dots).
        </p>
      </section>
    </div>
  );
}

export default TargetingStep;