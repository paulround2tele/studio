/**
 * Enhanced Pattern Step - Unified domain generation configuration
 * Implements confirmed spec: patternType, variable lengths, charset presets, tlds, batch size, offset, optional variations mode.
 */

import React, { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import type { WizardPatternStep } from '../../types';

interface PatternStepProps {
  data: Partial<WizardPatternStep>;
  onChange: (data: Partial<WizardPatternStep>) => void;
}

// Character set presets
const CHARSET_PRESETS: Record<string, string> = {
  alphanumeric: 'abcdefghijklmnopqrstuvwxyz0123456789',
  letters: 'abcdefghijklmnopqrstuvwxyz',
  hex: 'abcdef0123456789',
  numeric: '0123456789',
  custom: ''
};

const DEFAULT_TLD_SUGGESTIONS = ['.com', '.net', '.org', '.io', '.co', '.ai', '.app', '.dev', '.xyz'];

export function PatternStep({ data, onChange }: PatternStepProps) {
  const usingVariationsMode = !!data.basePattern && data.basePattern.includes('{variation}');

  // Derived variableLength based on patternType and prefix/suffix lengths (stored temporarily in data.variableLength?)
  const prefixLength = data.prefixLength ?? (data.patternType === 'prefix' ? (data.variableLength ?? 6) : 3);
  const suffixLength = data.suffixLength ?? (data.patternType === 'suffix' ? (data.variableLength ?? 6) : 3);
  const patternType = data.patternType || 'prefix';

  const effectiveVariableLength = useMemo(() => {
    if (patternType === 'prefix') return prefixLength;
    if (patternType === 'suffix') return suffixLength;
    if (patternType === 'both') return (prefixLength || 0) + (suffixLength || 0);
    return data.variableLength || 0;
  }, [patternType, prefixLength, suffixLength, data.variableLength]);

  // Deduplicate charset and compute unique size
  const rawCharset = data.characterSet ?? CHARSET_PRESETS.alphanumeric;
  const charsetUnique = Array.from(new Set((rawCharset || '').split(''))).join('');
  const uniqueSize = charsetUnique.length;

  // Combination estimation (simplified: prefix or suffix => size^length, both => size^(prefix)*size^(suffix))
  const combinationEstimate = useMemo(() => {
    if (effectiveVariableLength <= 0 || uniqueSize === 0) return 1;
    if (patternType === 'both') {
      return Math.pow(uniqueSize, prefixLength || 0) * Math.pow(uniqueSize, suffixLength || 0);
    }
    return Math.pow(uniqueSize, effectiveVariableLength);
  }, [effectiveVariableLength, uniqueSize, patternType, prefixLength, suffixLength]);

  const maxDomains = data.maxDomains || 100;

  function update(partial: Partial<WizardPatternStep>) {
    onChange({ ...partial });
  }

  function handleCharsetPresetChange(preset: string) {
    if (preset === 'custom') return update({ charsetPreset: preset });
    update({ charsetPreset: preset, characterSet: CHARSET_PRESETS[preset] });
  }

  function updateTlds(raw: string) {
    const arr = raw.split(',').map(s => s.trim()).filter(Boolean).map(s => s.startsWith('.') ? s : `.${s}`);
    update({ tlds: arr });
  }

  // Simple preview (first up to 5 synthetic domains) – placeholder using constantString + pattern logic
  const preview = useMemo(() => {
    if (usingVariationsMode) {
      const vars = data.variations || [];
      return vars.slice(0, 5).map(v => (data.basePattern || '').replace('{variation}', v));
    }
    const constant = data.constantString || data.basePattern || 'brand';
    const cs = charsetUnique.split('');
    const results: string[] = [];
    const gen = (n: number, length: number): string => {
      if (length <= 0 || cs.length === 0) return '';
      let r = ''; let x = n;
      for (let i = 0; i < length; i++) { r = cs[x % cs.length] + r; x = Math.floor(x / cs.length); }
      return r;
    };
    for (let i = 0; i < 5; i++) {
      let sld = constant;
      if (patternType === 'prefix') sld = gen(i, prefixLength) + constant;
      else if (patternType === 'suffix') sld = constant + gen(i, suffixLength);
      else if (patternType === 'both') {
        const half = prefixLength || 0; // using separate lengths
        sld = gen(i, half) + constant + gen(i, suffixLength || 0);
      }
      const tld = (data.tlds && data.tlds[0]) || data.tld || '.com';
      results.push(sld + tld);
    }
    return results;
  }, [usingVariationsMode, data.basePattern, data.variations, data.constantString, charsetUnique, patternType, prefixLength, suffixLength, data.tlds, data.tld]);

  return (
    <div className="space-y-8">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Configure how domains will be generated. You can switch between manual variations and generated character-based patterns.
        </AlertDescription>
      </Alert>

      {/* Mode Indicator (implicit via presence of {variation}) */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Switch
            checked={usingVariationsMode}
            onCheckedChange={(checked) => {
              if (checked) {
                // Insert placeholder if missing
                if (!data.basePattern || !data.basePattern.includes('{variation}')) {
                  update({ basePattern: (data.basePattern || 'brand-{variation}') });
                }
              } else {
                // Remove placeholder – fallback constant
                if (data.basePattern) {
                  update({ basePattern: data.basePattern.replace('{variation}', '') });
                }
              }
            }}
          />
          <Label className="cursor-pointer">Manual Variations Mode</Label>
        </div>
        <p className="text-xs text-muted-foreground">
          When enabled, specify explicit variation tokens. Disabled = generated prefixes/suffixes from character set.
        </p>
      </div>

      {/* Base / Constant Pattern */}
      <div className="space-y-2">
        <Label htmlFor="base-pattern">{usingVariationsMode ? 'Base Pattern (with {variation})' : 'Constant Segment'}</Label>
        <Input
          id="base-pattern"
          placeholder={usingVariationsMode ? 'brand-{variation}' : 'brand'}
          value={data.basePattern || ''}
          onChange={(e) => update({ basePattern: e.target.value })}
        />
        {usingVariationsMode && (
          <p className="text-xs text-muted-foreground">Include the literal {'{variation}'} placeholder.</p>
        )}
      </div>

      {/* Variations Input (manual mode) */}
      {usingVariationsMode && (
        <div className="space-y-2">
          <Label htmlFor="variations">Pattern Variations</Label>
          <Input
            id="variations"
            placeholder="alpha, beta, gamma"
            value={data.variations?.join(', ') || ''}
            onChange={(e) => update({ variations: e.target.value.split(',').map(v => v.trim()).filter(Boolean) })}
          />
          <p className="text-xs text-muted-foreground">Comma-separated list. Up to 10,000 total domains will be requested.</p>
        </div>
      )}

      {/* Generated Pattern Controls */}
      {!usingVariationsMode && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <Label>Pattern Type</Label>
              <select
                className="border rounded px-2 py-1 bg-background"
                value={patternType}
                onChange={(e) => update({ patternType: e.target.value as any })}
              >
                <option value="prefix">Prefix</option>
                <option value="suffix">Suffix</option>
                <option value="both">Both</option>
              </select>
            </div>
            {patternType === 'prefix' && (
              <div className="space-y-1">
                <Label>Prefix Variable Length</Label>
                <Input type="number" min={0} max={32} value={prefixLength}
                  onChange={(e) => update({ prefixLength: parseInt(e.target.value) || 0 })} />
              </div>
            )}
            {patternType === 'suffix' && (
              <div className="space-y-1">
                <Label>Suffix Variable Length</Label>
                <Input type="number" min={0} max={32} value={suffixLength}
                  onChange={(e) => update({ suffixLength: parseInt(e.target.value) || 0 })} />
              </div>
            )}
            {patternType === 'both' && (
              <>
                <div className="space-y-1">
                  <Label>Prefix Length</Label>
                  <Input type="number" min={0} max={16} value={prefixLength}
                    onChange={(e) => update({ prefixLength: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="space-y-1">
                  <Label>Suffix Length</Label>
                  <Input type="number" min={0} max={16} value={suffixLength}
                    onChange={(e) => update({ suffixLength: parseInt(e.target.value) || 0 })} />
                </div>
              </>
            )}
          </div>

          {/* Character Set Presets */}
          <div className="space-y-2">
            <Label>Character Set</Label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(CHARSET_PRESETS).map(preset => (
                <Button
                  key={preset}
                  type="button"
                  variant={data.charsetPreset === preset ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => handleCharsetPresetChange(preset)}
                >{preset}</Button>
              ))}
            </div>
            <Textarea
              rows={3}
              className="font-mono"
              value={data.characterSet || ''}
              onChange={(e) => update({ characterSet: e.target.value })}
              placeholder="Enter custom characters"
              disabled={data.charsetPreset !== 'custom' && data.charsetPreset !== undefined && data.charsetPreset !== '' && data.charsetPreset !== 'custom'}
            />
            <p className="text-xs text-muted-foreground">Unique chars: {uniqueSize}. Empty set with variable length &gt; 0 will produce 0 combinations.</p>
          </div>
        </div>
      )}

      {/* Shared Fields */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <Label>Max Domains</Label>
          <Input type="number" min={1} max={10000} value={maxDomains}
            onChange={(e) => update({ maxDomains: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="space-y-1">
          <Label>Batch Size</Label>
          <Input type="number" min={1} max={1000} value={data.batchSize || 100}
            onChange={(e) => update({ batchSize: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="space-y-1">
          <Label>Offset Start (Advanced)</Label>
          <Input type="number" min={0} value={data.offsetStart || 0}
            onChange={(e) => update({ offsetStart: parseInt(e.target.value) || 0 })} />
        </div>
      </div>

      {/* TLDs */}
      <div className="space-y-2">
        <Label>TLDs (comma separated)</Label>
        <Input
          placeholder=".com, .net, .org"
          value={(data.tlds && data.tlds.join(', ')) || data.tld || '.com'}
          onChange={(e) => updateTlds(e.target.value)}
        />
        <div className="flex flex-wrap gap-2 text-xs">
          {DEFAULT_TLD_SUGGESTIONS.map(t => (
            <button
              key={t}
              type="button"
              className="px-2 py-0.5 rounded border text-muted-foreground hover:bg-accent"
              onClick={() => {
                const next = new Set([...(data.tlds || []), t]);
                update({ tlds: Array.from(next) });
              }}
            >{t}</button>
          ))}
        </div>
      </div>

      {/* Metrics & Preview */}
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-6">
          <div><strong>Variable Length:</strong> {effectiveVariableLength}</div>
          <div><strong>Charset Size:</strong> {uniqueSize}</div>
          <div><strong>Est. Combos (single TLD):</strong> {combinationEstimate.toLocaleString()}</div>
          <div><strong>Requested:</strong> {maxDomains}</div>
        </div>
        {combinationEstimate < maxDomains && !usingVariationsMode && (
          <p className="text-yellow-600 dark:text-yellow-400">Warning: Requested exceeds theoretical combination count. Some domains may repeat or generation will stop early.</p>
        )}
        <div>
          <p className="font-medium mb-1">Preview (first {preview.length})</p>
          <ul className="list-disc ml-5 space-y-0.5 text-xs">
            {preview.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default PatternStep;