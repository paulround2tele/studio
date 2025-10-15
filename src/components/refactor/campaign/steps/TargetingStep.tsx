/**
 * Targeting Step - Personas, keywords, and simple filters
 */

import React, { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, RefreshCcw, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ExecutionMode, WizardTargetingStep } from '../../types';

interface PersonaOption {
  id: string;
  name: string;
}

interface TargetingStepProps {
  data: Partial<WizardTargetingStep>;
  onChange: (data: Partial<WizardTargetingStep>) => void;
  dnsPersonas: PersonaOption[];
  httpPersonas: PersonaOption[];
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
  personasLoading,
  personasError,
  onRetryPersonas,
  executionMode,
}: TargetingStepProps) {
  const [pendingAdHocKeyword, setPendingAdHocKeyword] = useState('');

  const selectedDns = data.dnsPersonas || [];
  const selectedHttp = data.httpPersonas || [];
  const adHocKeywords = data.adHocKeywords || [];
  const includeKeywords = data.includeKeywords || [];

  const autoMode = executionMode === 'auto';

  const dnsPersonaNames = useMemo(() => new Map(dnsPersonas.map(p => [p.id, p.name])), [dnsPersonas]);
  const httpPersonaNames = useMemo(() => new Map(httpPersonas.map(p => [p.id, p.name])), [httpPersonas]);

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

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Targeting Personas & Keywords:</strong> Choose personas to run DNS / HTTP phases and supply the keywords used for analysis.
          {autoMode ? ' Auto mode requires at least one DNS persona, one HTTP persona, and one keyword.' : ' You can configure these later from the campaign dashboard if needed.'}
        </AlertDescription>
      </Alert>

      {personasError && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Persona data unavailable</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-2">
            <span>{personasError}</span>
            {onRetryPersonas && (
              <Button type="button" variant="outline" size="sm" onClick={onRetryPersonas} className="gap-1">
                <RefreshCcw className="h-3 w-3" /> Retry
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">DNS Personas</h3>
          <p className="text-xs text-muted-foreground">Select personas that resolve DNS records for generated domains.</p>
        </div>
        {personasLoading ? (
          <p className="text-sm text-muted-foreground">Loading personas...</p>
        ) : dnsPersonas.length === 0 ? (
          <p className="text-sm text-muted-foreground">No DNS personas available. Create one before running validation.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {dnsPersonas.map(persona => {
              const checkboxId = `dns-persona-${persona.id}`;
              const checked = selectedDns.includes(persona.id);
              return (
                <label
                  key={persona.id}
                  htmlFor={checkboxId}
                  className={`flex items-center gap-3 rounded border p-3 transition-colors ${checked ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                >
                  <Checkbox
                    id={checkboxId}
                    checked={checked}
                    onCheckedChange={(value) => togglePersona(persona.id, persona.name, 'dns', value)}
                    aria-label={`DNS persona ${persona.name}`}
                  />
                  <span className="text-sm font-medium">{persona.name}</span>
                </label>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">HTTP Personas</h3>
          <p className="text-xs text-muted-foreground">Select personas used during HTTP keyword extraction and analysis.</p>
        </div>
        {personasLoading ? (
          <p className="text-sm text-muted-foreground">Loading personas...</p>
        ) : httpPersonas.length === 0 ? (
          <p className="text-sm text-muted-foreground">No HTTP personas available. Create one before running extraction.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {httpPersonas.map(persona => {
              const checkboxId = `http-persona-${persona.id}`;
              const checked = selectedHttp.includes(persona.id);
              return (
                <label
                  key={persona.id}
                  htmlFor={checkboxId}
                  className={`flex items-center gap-3 rounded border p-3 transition-colors ${checked ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                >
                  <Checkbox
                    id={checkboxId}
                    checked={checked}
                    onCheckedChange={(value) => togglePersona(persona.id, persona.name, 'http', value)}
                    aria-label={`HTTP persona ${persona.name}`}
                  />
                  <span className="text-sm font-medium">{persona.name}</span>
                </label>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <Label htmlFor="include-keywords">Include Keywords</Label>
        <Input
          id="include-keywords"
          placeholder="keyword1, keyword2, keyword3"
          value={includeKeywords.join(', ')}
          onChange={(event) => applyIncludeKeywords(event.target.value)}
        />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          These keywords seed HTTP validation and downstream analysis. Provide at least one to run in auto mode.
        </p>
      </section>

      <section className="space-y-2">
        <Label htmlFor="ad-hoc-keyword">Custom Keywords</Label>
        <div className="flex gap-2">
          <Input
            id="ad-hoc-keyword"
            placeholder="Add a single keyword and press Enter"
            value={pendingAdHocKeyword}
            onChange={(event) => setPendingAdHocKeyword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addAdHocKeyword();
              }
            }}
          />
          <Button type="button" onClick={addAdHocKeyword} variant="secondary">
            Add
          </Button>
        </div>
        {adHocKeywords.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {adHocKeywords.map(keyword => (
              <Badge key={keyword} variant="secondary" className="flex items-center gap-1">
                {keyword}
                <button
                  type="button"
                  onClick={() => removeAdHocKeyword(keyword)}
                  aria-label={`Remove keyword ${keyword}`}
                  className="rounded-full p-0.5 hover:bg-secondary/80"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Optional additional keywords sent as ad-hoc prompts to the extraction engine.
        </p>
      </section>

      <section className="space-y-2">
        <Label htmlFor="exclude-keywords">Exclude Keywords</Label>
        <Input
          id="exclude-keywords"
          placeholder="spam, adult, illegal"
          value={(data.excludeKeywords || []).join(', ')}
          onChange={(event) => applyExcludeKeywords(event.target.value)}
        />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Domains containing these terms can be deprioritized or skipped during review workflows.
        </p>
      </section>

      <section className="space-y-2">
        <Label htmlFor="exclude-extensions">Exclude Extensions</Label>
        <Input
          id="exclude-extensions"
          placeholder="gov, edu, mil"
          value={(data.excludeExtensions || []).join(', ')}
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