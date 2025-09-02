import React, { useEffect, useMemo } from 'react';
import { Control, useWatch, useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useGetPatternOffsetQuery } from '@/store/api/campaignApi';
import { calculateMaxTheoreticalDomains, calculateRemainingDomains } from '@/lib/utils/domainCalculation';

interface DomainGenerationConfigProps {
  control: Control<any>;
  disabled?: boolean;
}

export const DomainGenerationConfig: React.FC<DomainGenerationConfigProps> = ({
  control,
  disabled = false
}) => {
  // Access full form context for setting values from helpers
  const { setValue } = useFormContext();

  // Watch relevant fields to compute derived values and query backend offset
  const patternType = useWatch({ control, name: 'patternType' });
  const characterSet = useWatch({ control, name: 'characterSet' });
  const constantString = useWatch({ control, name: 'constantString' });
  const variableLength = useWatch({ control, name: 'variableLength' });
  const prefixVariableLength = useWatch({ control, name: 'prefixVariableLength' }) as number | undefined;
  const suffixVariableLength = useWatch({ control, name: 'suffixVariableLength' }) as number | undefined;
  const tlds = useWatch({ control, name: 'tlds' }) as string[] | undefined;
  const numDomainsToGenerate = useWatch({ control, name: 'numDomainsToGenerate' }) as number | undefined;

  const offsetRequest = useMemo(() => {
    // Normalize first TLD to include leading dot as backend generator requires
    const rawTld = Array.isArray(tlds) && tlds.length > 0 ? tlds[0] : undefined;
    const tld = rawTld ? (rawTld.startsWith('.') ? rawTld : `.${rawTld}`) : undefined;
    if (!patternType || !characterSet || !variableLength || !tld) return undefined;
    return {
      patternType,
      variableLength: Number(variableLength),
      characterSet,
      constantString: constantString || '',
      tld,
    } as any;
  }, [patternType, characterSet, variableLength, constantString, tlds]);

  const { data: offsetData } = useGetPatternOffsetQuery(offsetRequest as any, {
    skip: !offsetRequest,
  });

  const maxPossible = useMemo(() => {
    return calculateMaxTheoreticalDomains({ patternType, characterSet, variableLength });
  }, [patternType, characterSet, variableLength]);

  const currentOffset = offsetData?.currentOffset ?? undefined;
  const remainingFromGlobal = useMemo(() => {
    if (!Number.isFinite(maxPossible) || maxPossible === undefined || currentOffset === undefined) return undefined;
    const rem = Math.max(0, Number(maxPossible) - Number(currentOffset));
    return rem;
  }, [maxPossible, currentOffset]);
  // No per-campaign offset selection; backend manages global offset. Remaining capacity derives from currentOffset only.

  // Derive variableLength from pattern-specific fields to match backend expectations
  useEffect(() => {
    let derived = 0;
    const pvl = Number(prefixVariableLength ?? 0);
    const svl = Number(suffixVariableLength ?? 0);
    if (patternType === 'prefix') derived = pvl;
    else if (patternType === 'suffix') derived = svl;
    else if (patternType === 'both') derived = pvl + svl;
    if (Number.isFinite(derived)) {
      setValue('variableLength', derived, { shouldValidate: true, shouldDirty: true });
    }
  }, [patternType, prefixVariableLength, suffixVariableLength, setValue]);

  return (
    <div className="space-y-6">
      <div className="text-center p-4 bg-purple-50 rounded-lg border">
        <h3 className="text-lg font-semibold text-purple-900 mb-2">Domain Generation Configuration</h3>
        <p className="text-sm text-purple-700">
          Configure domain generation using the actual backend DomainGenerationPhaseConfig structure
        </p>
      </div>

      {/* Derived metrics and offset helper */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-3 rounded border bg-muted/30">
          <div className="text-xs text-muted-foreground">Max possible domains</div>
          <div className="text-lg font-semibold" title={String(maxPossible)}>
            {Number.isFinite(maxPossible) ? maxPossible.toLocaleString() : '—'}
          </div>
        </div>
        <div className="p-3 rounded border bg-muted/30">
          <div className="text-xs text-muted-foreground">Current pattern offset (global)</div>
          <div className="text-lg font-semibold">
            {currentOffset !== undefined ? currentOffset.toLocaleString() : '—'}
          </div>
        </div>
        <div className="p-3 rounded border bg-muted/30">
          <div className="text-xs text-muted-foreground">Remaining possible</div>
          <div className="text-lg font-semibold">
            {currentOffset !== undefined
              ? calculateRemainingDomains({ patternType, characterSet, variableLength }, currentOffset).toLocaleString()
              : '—'}
          </div>
        </div>
      </div>

      {/* Pattern Type - REQUIRED enum */}
      <FormField
        control={control}
        name="patternType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Pattern Type *</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={disabled}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select pattern type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="prefix">Prefix</SelectItem>
                <SelectItem value="suffix">Suffix</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Character Set - REQUIRED string */}
      <FormField
        control={control}
        name="characterSet"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Character Set *</FormLabel>
            <FormControl>
              <Input
                placeholder="e.g. abcdefghijklmnopqrstuvwxyz0123456789"
                {...field}
                disabled={disabled}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Constant String - REQUIRED string */}
      <FormField
        control={control}
        name="constantString"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Constant String *</FormLabel>
            <FormControl>
              <Input
                placeholder="e.g. mycompany"
                {...field}
                disabled={disabled}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Pattern-specific variable lengths */}
      {patternType === 'prefix' && (
        <FormField
          control={control}
          name="prefixVariableLength"
          rules={{ required: 'Prefix variable length is required', min: { value: 1, message: 'Must be at least 1' } }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prefix Variable Length *</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="e.g. 8"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value || '0') || 0)}
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {patternType === 'suffix' && (
        <FormField
          control={control}
          name="suffixVariableLength"
          rules={{ required: 'Suffix variable length is required', min: { value: 1, message: 'Must be at least 1' } }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Suffix Variable Length *</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="e.g. 8"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value || '0') || 0)}
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {patternType === 'both' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="prefixVariableLength"
            rules={{ required: 'Prefix variable length is required', min: { value: 1, message: 'Must be at least 1' } }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prefix Variable Length *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g. 4"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value || '0') || 0)}
                    disabled={disabled}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="suffixVariableLength"
            rules={{ required: 'Suffix variable length is required', min: { value: 1, message: 'Must be at least 1' } }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Suffix Variable Length *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g. 4"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value || '0') || 0)}
                    disabled={disabled}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}

      {/* TLDs - REQUIRED Array<string> */}
      <FormField
        control={control}
        name="tlds"
        render={({ field }) => (
          <FormItem>
            <FormLabel>TLDs *</FormLabel>
            <FormControl>
              <div className="space-y-2">
                <Input
                  placeholder="Enter TLD (e.g. .com or com) and press Enter"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const input = e.target as HTMLInputElement;
                      let value = input.value.trim();
                      if (value && !value.startsWith('.')) value = `.${value}`;
                      if (value && !field.value?.includes(value)) {
                        field.onChange([...(field.value || []), value]);
                        input.value = '';
                      }
                    }
                  }}
                  disabled={disabled}
                />
                <div className="flex flex-wrap gap-2">
                  {field.value?.map((tld: string, index: number) => (
                    <Badge key={index} variant="default" className="flex items-center gap-1">
                      {tld}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          const newTlds = field.value.filter((_: string, i: number) => i !== index);
                          field.onChange(newTlds);
                        }}
                        disabled={disabled}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Number of Domains to Generate - REQUIRED */}
      <FormField
        control={control}
        name="numDomainsToGenerate"
    // Enforce required, positive, and within capacity from current global offset
        rules={{
          required: 'Number of domains to generate is required',
          min: { value: 1, message: 'Must be at least 1' },
          validate: (value: any) => {
            const n = Number(value ?? 0);
            if (!Number.isFinite(n) || n < 1) return 'Enter a positive number';
            if (!Number.isFinite(maxPossible)) return true;
      const start = Number(currentOffset ?? 0);
      const maxAllowed = Number(maxPossible) - start;
      if (maxAllowed < 1) return 'No remaining capacity for the selected pattern';
      if (n > maxAllowed) return `Exceeds remaining capacity (remaining ${maxAllowed.toLocaleString()})`;
            return true;
          }
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Number of Domains to Generate *</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="e.g. 1000"
                {...field}
                onChange={(e) => {
                  const v = parseInt(e.target.value || '0', 10);
                  field.onChange(Number.isNaN(v) ? 0 : Math.max(0, v));
                }}
                disabled={disabled}
              />
            </FormControl>
            <div className="text-xs text-muted-foreground">
              {currentOffset !== undefined
                ? `Remaining possible: ${calculateRemainingDomains({ patternType, characterSet, variableLength }, currentOffset).toLocaleString()}`
                : 'Enter pattern details to compute remaining capacity'}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Offset selection removed: backend controls global offset; UI should not expose it. */}

      {/* Batch Size - Optional number */}
      <FormField
        control={control}
        name="batchSize"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Batch Size (optional)</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="e.g. 100"
                {...field}
                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                disabled={disabled}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default DomainGenerationConfig;
