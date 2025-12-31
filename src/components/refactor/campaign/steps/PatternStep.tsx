/**
 * Enhanced Pattern Step - Unified domain generation configuration
 * Implements confirmed spec: patternType, variable lengths, charset presets, tlds, batch size, offset, optional variations mode.
 * Migrated to TailAdmin + Tailwind patterns (Dec 31, 2025)
 */

import React, { useMemo } from 'react';
import Input from '@/components/ta/form/input/InputField';
import Label from '@/components/ta/form/Label';
import Alert from '@/components/ta/ui/alert/Alert';
import Checkbox from '@/components/ta/form/input/Checkbox';
import Button from '@/components/ta/ui/button/Button';
import { Info } from 'lucide-react';
import type { WizardPatternStep } from '../../types';
import { DiscoveryPreviewPanel } from './DiscoveryPreviewPanel';

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

  const patternType = data.patternType || 'prefix';
  const legacyVariableLength = data.variableLength ?? 0;
  const defaultLength = legacyVariableLength > 0 ? legacyVariableLength : 6;
  const prefixVariableLength = data.prefixVariableLength ?? (patternType === 'suffix' ? 0 : defaultLength);
  const suffixVariableLength = data.suffixVariableLength ?? (patternType === 'prefix' ? 0 : defaultLength);

  const totalVariableLength = useMemo(() => {
    switch (patternType) {
      case 'prefix':
        return prefixVariableLength || 0;
      case 'suffix':
        return suffixVariableLength || 0;
      case 'both':
        return (prefixVariableLength || 0) + (suffixVariableLength || 0);
      default:
        return legacyVariableLength || 0;
    }
  }, [patternType, prefixVariableLength, suffixVariableLength, legacyVariableLength]);

  // Deduplicate charset and compute unique size
  const rawCharset = data.characterSet ?? CHARSET_PRESETS.alphanumeric;
  const charsetUnique = Array.from(new Set((rawCharset || '').split(''))).join('');
  const uniqueSize = charsetUnique.length;

  // Combination estimation (simplified: prefix or suffix => size^length, both => size^(prefix)*size^(suffix))
  const combinationEstimate = useMemo(() => {
    if (uniqueSize === 0) return 1;
    if (patternType === 'both') {
      const prefixCombos = Math.pow(uniqueSize, prefixVariableLength || 0);
      const suffixCombos = Math.pow(uniqueSize, suffixVariableLength || 0);
      return Math.max(1, prefixCombos * suffixCombos);
    }
    if (totalVariableLength <= 0) return 1;
    return Math.pow(uniqueSize, totalVariableLength);
  }, [uniqueSize, patternType, prefixVariableLength, suffixVariableLength, totalVariableLength]);

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
      if (patternType === 'prefix') sld = gen(i, prefixVariableLength) + constant;
      else if (patternType === 'suffix') sld = constant + gen(i, suffixVariableLength);
      else if (patternType === 'both') {
        const prefixLen = prefixVariableLength || 0;
        const suffixLen = suffixVariableLength || 0;
        sld = gen(i, prefixLen) + constant + gen(i, suffixLen);
      }
      const tld = (data.tlds && data.tlds[0]) || data.tld || '.com';
      results.push(sld + tld);
    }
    return results;
  }, [usingVariationsMode, data.basePattern, data.variations, data.constantString, charsetUnique, patternType, prefixVariableLength, suffixVariableLength, data.tlds, data.tld]);

  return (
    <div className="space-y-8">
      <Alert
        variant="info"
        title="Domain Pattern Configuration"
        message="Configure how domains will be generated. You can switch between manual variations and generated character-based patterns."
      />

      {/* Mode Indicator (implicit via presence of {variation}) */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={usingVariationsMode}
            onChange={(checked) => {
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
            label="Manual Variations Mode"
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          When enabled, specify explicit variation tokens. Disabled = generated prefixes/suffixes from character set.
        </p>
      </div>

      {/* Base / Constant Pattern */}
      <div className="space-y-2">
        <Label htmlFor="basePattern">{usingVariationsMode ? 'Base Pattern (with {variation})' : 'Constant Segment'}</Label>
        <Input
          id="basePattern"
          type="text"
          placeholder={usingVariationsMode ? 'brand-{variation}' : 'brand'}
          defaultValue={data.basePattern || ''}
          onChange={(e) => update({ basePattern: e.target.value })}
        />
        {usingVariationsMode && (
          <p className="text-xs text-gray-500 dark:text-gray-400">Include the literal {'{variation}'} placeholder.</p>
        )}
      </div>

      {/* Variations Input (manual mode) */}
      {usingVariationsMode && (
        <div className="space-y-2">
          <Label htmlFor="variations">Pattern Variations</Label>
          <Input
            id="variations"
            type="text"
            placeholder="alpha, beta, gamma"
            defaultValue={data.variations?.join(', ') || ''}
            onChange={(e) => update({ variations: e.target.value.split(',').map(v => v.trim()).filter(Boolean) })}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">Comma-separated list. Up to 10,000 total domains will be requested.</p>
        </div>
      )}

      {/* Generated Pattern Controls */}
      {!usingVariationsMode && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <Label>Pattern Type</Label>
              <select
                className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                value={patternType}
                onChange={(e) => {
                  const val = e.target.value as 'prefix' | 'suffix' | 'both';
                  if (val === 'prefix') {
                    const nextPrefix = prefixVariableLength || defaultLength;
                    update({ patternType: val, prefixVariableLength: nextPrefix, suffixVariableLength: 0, variableLength: nextPrefix });
                    return;
                  }
                  if (val === 'suffix') {
                    const nextSuffix = suffixVariableLength || defaultLength;
                    update({ patternType: val, prefixVariableLength: 0, suffixVariableLength: nextSuffix, variableLength: nextSuffix });
                    return;
                  }
                  const inferredPrefix = prefixVariableLength || Math.max(1, Math.floor(defaultLength / 2));
                  const inferredSuffix = suffixVariableLength || Math.max(1, Math.ceil(defaultLength / 2));
                  update({ patternType: val, prefixVariableLength: inferredPrefix, suffixVariableLength: inferredSuffix, variableLength: inferredPrefix + inferredSuffix });
                }}
              >
                <option value="prefix">Prefix</option>
                <option value="suffix">Suffix</option>
                <option value="both">Both</option>
              </select>
            </div>
            {patternType === 'prefix' && (
              <div className="space-y-1">
                <Label>Prefix Variable Length</Label>
                <Input
                  type="number"
                  defaultValue={prefixVariableLength}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    update({ prefixVariableLength: val, variableLength: val });
                  }}
                />
              </div>
            )}
            {patternType === 'suffix' && (
              <div className="space-y-1">
                <Label>Suffix Variable Length</Label>
                <Input
                  type="number"
                  defaultValue={suffixVariableLength}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    update({ suffixVariableLength: val, variableLength: val });
                  }}
                />
              </div>
            )}
            {patternType === 'both' && (
              <>
                <div className="space-y-1">
                  <Label>Prefix Variable Length</Label>
                  <Input
                    type="number"
                    defaultValue={prefixVariableLength}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      update({ prefixVariableLength: val, variableLength: val + (suffixVariableLength || 0) });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Suffix Variable Length</Label>
                  <Input
                    type="number"
                    defaultValue={suffixVariableLength}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      update({ suffixVariableLength: val, variableLength: val + (prefixVariableLength || 0) });
                    }}
                  />
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
                  variant={data.charsetPreset === preset ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => handleCharsetPresetChange(preset)}
                >{preset}</Button>
              ))}
            </div>
            <textarea
              rows={3}
              className="w-full font-mono rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 disabled:opacity-50"
              value={data.characterSet || ''}
              onChange={(e) => update({ characterSet: e.target.value })}
              placeholder="Enter custom characters"
              disabled={data.charsetPreset !== 'custom' && data.charsetPreset !== undefined && data.charsetPreset !== '' && data.charsetPreset !== 'custom'}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">Unique chars: {uniqueSize}. Empty set with variable length &gt; 0 will produce 0 combinations.</p>
          </div>
        </div>
      )}

      {/* Shared Fields */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <Label>Max Domains</Label>
          <Input type="number" defaultValue={maxDomains}
            onChange={(e) => update({ maxDomains: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="space-y-1">
          <Label>Batch Size</Label>
          <Input type="number" defaultValue={data.batchSize || 100}
            onChange={(e) => update({ batchSize: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="space-y-1">
          <Label>Offset Start (Advanced)</Label>
          <Input type="number" defaultValue={data.offsetStart || 0}
            onChange={(e) => update({ offsetStart: parseInt(e.target.value) || 0 })} />
        </div>
      </div>

      {/* TLDs */}
      <div className="space-y-2">
        <Label>TLDs (comma separated)</Label>
        <Input
          type="text"
          placeholder=".com, .net, .org"
          defaultValue={(data.tlds && data.tlds.join(', ')) || data.tld || '.com'}
          onChange={(e) => updateTlds(e.target.value)}
        />
        <div className="flex flex-wrap gap-2 text-xs">
          {DEFAULT_TLD_SUGGESTIONS.map(t => (
            <button
              key={t}
              type="button"
              className="px-2 py-0.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
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
          <div><strong>Total Variable Chars:</strong> {totalVariableLength}</div>
          <div><strong>Charset Size:</strong> {uniqueSize}</div>
          <div><strong>Est. Combos (single TLD):</strong> {combinationEstimate.toLocaleString()}</div>
          <div><strong>Requested:</strong> {maxDomains}</div>
        </div>
        {combinationEstimate < maxDomains && !usingVariationsMode && (
          <p className="text-warning-600 dark:text-warning-400">Warning: Requested exceeds theoretical combination count. Some domains may repeat or generation will stop early.</p>
        )}
        <div>
          <p className="font-medium mb-1">Preview (first {preview.length})</p>
          <ul className="list-disc ml-5 space-y-0.5 text-xs">
            {preview.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
          {/* Preview semantics clarification (P0) */}
          <p className="text-[10px] text-amber-600 dark:text-amber-400 italic mt-1">
            Preview shows examples from the start of the pattern, not your actual start offset.
          </p>
        </div>
      </div>

      {/* Discovery Lineage Preview Panel - shows configHash, nextOffset, priorCampaigns */}
      {!usingVariationsMode && (
        <DiscoveryPreviewPanel
          patternType={patternType}
          constantString={data.constantString || data.basePattern}
          prefixVariableLength={prefixVariableLength}
          suffixVariableLength={suffixVariableLength}
          characterSet={charsetUnique}
          tld={(data.tlds?.[0]) || data.tld || '.com'}
          enabled={uniqueSize > 0 && totalVariableLength > 0}
          domainsRequested={maxDomains}
          batchSize={data.batchSize || 100}
        />
      )}
    </div>
  );
}

export default PatternStep;