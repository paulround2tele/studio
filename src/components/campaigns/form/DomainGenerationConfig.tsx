import React, { memo, useEffect, useState, useMemo } from 'react';
import { Control, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { apiClient } from '@/lib/api-client/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Import shared types to prevent conflicts
import type { CampaignFormValues } from '../types/CampaignFormTypes';

interface DomainGenerationConfigProps {
  control: Control<CampaignFormValues>;
  watch: UseFormWatch<CampaignFormValues>;
  _setValue: UseFormSetValue<CampaignFormValues>; // Unused parameter
  totalPossible: number;
  calculationDetails?: {
    pattern: string;
    charSetLength: number;
    prefixLength: number;
    suffixLength: number;
    tldCount: number;
    combinations: number;
  };
  calculationWarning?: string | null;
  isCalculationSafe: boolean;
  amount?: number; // Amount field value for remaining calculation
}

/**
 * Memoized domain generation configuration component
 * Prevents re-renders when form values haven't changed
 */
const DomainGenerationConfig = memo<DomainGenerationConfigProps>(({
  control,
  watch,
  _setValue,
  totalPossible,
  calculationDetails,
  calculationWarning,
  isCalculationSafe,
  amount
}) => {
  // Watch form values for pattern offset calculation
  const generationPattern = watch("generationPattern");
  const constantPart = watch("constantPart");
  const allowedCharSet = watch("allowedCharSet");
  const tldsInput = watch("tldsInput");
  const prefixVariableLength = watch("prefixVariableLength");
  
  // State for displaying current offset from backend
  const [currentOffset, setCurrentOffset] = useState<{
    value: number;
    isLoading: boolean;
    error: string | null;
  }>({
    value: 0,
    isLoading: false,
    error: null
  });

  // Pattern signature for backend matching
  const patternSignature = useMemo(() => {
    if (!generationPattern || !constantPart || !allowedCharSet || !tldsInput) {
      return null;
    }
    
    const patternTypeMap = {
      "prefix_variable": "prefix_variable",
      "suffix_variable": "suffix_variable",
      "both_variable": "both_variable"
    } as const;
    
    const tlds = tldsInput.split(',').map(tld => tld.trim()).filter(tld => tld.length > 0);
    const primaryTld = tlds[0] || '.com';
    const variableLength = prefixVariableLength || 3;
    
    return {
      patternType: patternTypeMap[generationPattern],
      variableLength,
      characterSet: allowedCharSet,
      constantString: constantPart,
      tld: primaryTld,
    };
  }, [generationPattern, constantPart, allowedCharSet, tldsInput, prefixVariableLength]);

  // Fetch current offset for this pattern from backend using dedicated endpoint
  useEffect(() => {
    if (!patternSignature) {
      setCurrentOffset({ value: 0, isLoading: false, error: null });
      return;
    }

    let cancelled = false;

    async function fetchCurrentOffset() {
      if (!patternSignature) {
        setCurrentOffset({ value: 0, isLoading: false, error: null });
        return;
      }

      setCurrentOffset(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        // Call the pattern offset endpoint with proper request format
        const patternRequest = {
          patternType: patternSignature.patternType as 'prefix' | 'suffix' | 'both',
          variableLength: patternSignature.variableLength,
          characterSet: patternSignature.characterSet,
          constantString: patternSignature.constantString,
          tld: patternSignature.tld
        };
        
        const response = await apiClient.getDomainGenerationPatternOffset(patternRequest);
        const data = response.data;

        if (cancelled) return;
        
        if (!cancelled) {
          setCurrentOffset({
            value: data.currentOffset || 0,
            isLoading: false,
            error: null
          });
        }
      } catch (err) {
        if (!cancelled) {
          setCurrentOffset({
            value: 0,
            isLoading: false,
            error: err instanceof Error ? err.message : 'Failed to fetch offset'
          });
        }
      }
    }

    fetchCurrentOffset();
    return () => { cancelled = true; };
  }, [patternSignature]);
  
  // Determine if suffix variable length input should be shown
  const showSuffixInput = generationPattern === 'both_variable' || generationPattern === 'suffix_variable';
  
  // Calculate remaining domains
  const remainingDomains = amount && totalPossible > 0 ? Math.max(0, totalPossible - amount) : 0;
  return (
    <Card className="p-4 pt-2 border-dashed">
      <CardHeader className="p-2">
        <CardTitle className="text-base">Domain Generation Configuration</CardTitle>
        <CardDescription className="text-xs">Configure how domains will be generated.</CardDescription>
      </CardHeader>
      <CardContent className="p-2 space-y-4">
        <FormField control={control} name="generationPattern" render={({ field }) => (
          <FormItem>
            <FormLabel>Generation Pattern</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select pattern" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="prefix_variable">Prefix + Variable Characters (e.g., [aaa]constant.com)</SelectItem>
                <SelectItem value="suffix_variable">Variable Characters + Suffix (e.g., constant[aaa].com)</SelectItem>
                <SelectItem value="both_variable">Prefix + Variable + Suffix (e.g., [aaa]constant[bbb].com)</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={control} name="constantPart" render={({ field }) => (
          <FormItem>
            <FormLabel>Constant Part</FormLabel>
            <FormControl>
              <Input placeholder="e.g., business, tech, shop" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={control} name="allowedCharSet" render={({ field }) => (
          <FormItem>
            <FormLabel>Allowed Character Set</FormLabel>
            <FormControl>
              <Input placeholder="e.g., abcdefghijklmnopqrstuvwxyz0123456789" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={control} name="tldsInput" render={({ field }) => (
          <FormItem>
            <FormLabel>TLDs</FormLabel>
            <Select onValueChange={(value) => {
              // Handle multiple selection by appending to existing value
              const currentValue = field.value || '';
              const existingTlds = currentValue.split(',').map(tld => tld.trim()).filter(tld => tld.length > 0);
              if (!existingTlds.includes(value)) {
                const newValue = existingTlds.length > 0 ? `${currentValue}, ${value}` : value;
                field.onChange(newValue);
              }
            }} value="">
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select TLDs" />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="max-h-60">
                <SelectItem value=".com">.com</SelectItem>
                <SelectItem value=".net">.net</SelectItem>
                <SelectItem value=".org">.org</SelectItem>
                <SelectItem value=".io">.io</SelectItem>
                <SelectItem value=".co">.co</SelectItem>
                <SelectItem value=".uk">.uk</SelectItem>
                <SelectItem value=".de">.de</SelectItem>
                <SelectItem value=".fr">.fr</SelectItem>
                <SelectItem value=".ca">.ca</SelectItem>
                <SelectItem value=".au">.au</SelectItem>
                <SelectItem value=".in">.in</SelectItem>
                <SelectItem value=".cn">.cn</SelectItem>
                <SelectItem value=".jp">.jp</SelectItem>
                <SelectItem value=".br">.br</SelectItem>
                <SelectItem value=".ru">.ru</SelectItem>
                <SelectItem value=".mx">.mx</SelectItem>
                <SelectItem value=".es">.es</SelectItem>
                <SelectItem value=".it">.it</SelectItem>
                <SelectItem value=".nl">.nl</SelectItem>
                <SelectItem value=".se">.se</SelectItem>
                <SelectItem value=".no">.no</SelectItem>
                <SelectItem value=".fi">.fi</SelectItem>
                <SelectItem value=".dk">.dk</SelectItem>
                <SelectItem value=".pl">.pl</SelectItem>
                <SelectItem value=".cz">.cz</SelectItem>
                <SelectItem value=".be">.be</SelectItem>
                <SelectItem value=".ch">.ch</SelectItem>
                <SelectItem value=".at">.at</SelectItem>
                <SelectItem value=".pt">.pt</SelectItem>
                <SelectItem value=".gr">.gr</SelectItem>
                <SelectItem value=".hu">.hu</SelectItem>
                <SelectItem value=".ro">.ro</SelectItem>
                <SelectItem value=".bg">.bg</SelectItem>
                <SelectItem value=".hr">.hr</SelectItem>
                <SelectItem value=".si">.si</SelectItem>
                <SelectItem value=".sk">.sk</SelectItem>
                <SelectItem value=".lt">.lt</SelectItem>
                <SelectItem value=".lv">.lv</SelectItem>
                <SelectItem value=".ee">.ee</SelectItem>
                <SelectItem value=".is">.is</SelectItem>
                <SelectItem value=".ie">.ie</SelectItem>
                <SelectItem value=".lu">.lu</SelectItem>
                <SelectItem value=".mt">.mt</SelectItem>
                <SelectItem value=".cy">.cy</SelectItem>
              </SelectContent>
            </Select>
            <div className="mt-2">
              <Input
                placeholder="Selected TLDs (e.g., .com, .net, .org)"
                value={field.value || ''}
                onChange={field.onChange}
                className="text-sm"
              />
            </div>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-2 gap-4">
          <FormField control={control} name="prefixVariableLength" render={({ field }) => (
            <FormItem>
              <FormLabel>Prefix Variable Length</FormLabel>
              <FormControl>
                <Input type="number" min="0" placeholder="3" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          {showSuffixInput && (
            <FormField control={control} name="suffixVariableLength" render={({ field }) => (
              <FormItem>
                <FormLabel>Suffix Variable Length</FormLabel>
                <FormControl>
                  <Input type="number" min="0" placeholder="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          )}
        </div>

        <FormField control={control} name="maxDomainsToGenerate" render={({ field }) => (
          <FormItem>
            <FormLabel>Amount</FormLabel>
            <FormControl>
              <Input type="number" min="1" placeholder="1000" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* Current Offset Display (Read-Only) */}
        <div className="p-3 rounded-md bg-blue-50 border border-blue-200">
          <div className="text-sm font-medium text-blue-700 mb-2">
            Current Offset for This Pattern
            {currentOffset.isLoading && (
              <span className="ml-2 text-xs text-blue-600">(loading...)</span>
            )}
          </div>
          <div className="text-2xl font-bold text-blue-800 mb-1">
            {currentOffset.value.toLocaleString()}
          </div>
          {currentOffset.error && (
            <div className="text-xs text-red-500 mb-2">
              <strong>Error:</strong> {currentOffset.error}
            </div>
          )}
          <div className="text-xs text-blue-600">
            ℹ️ Domain generation will resume from this offset for this exact pattern combination.
            This value is automatically managed by the backend.
          </div>
        </div>

        {/* Performance-aware domain calculation display */}
        {totalPossible > 0 && (
          <div className={`p-3 rounded-md ${isCalculationSafe ? 'bg-muted' : 'bg-yellow-50 border border-yellow-200'}`}>
            <div className="text-sm font-medium text-muted-foreground">Total Possible Combinations</div>
            <div className={`text-lg font-semibold ${!isCalculationSafe ? 'text-yellow-700' : ''}`}>
              {totalPossible.toLocaleString()} domains
            </div>
            {calculationDetails && (
              <div className="text-xs text-muted-foreground mt-1">
                Pattern: {calculationDetails.pattern} •
                Character set length: {calculationDetails.charSetLength} •
                {calculationDetails.pattern === 'prefix_variable' && `Prefix length: ${calculationDetails.prefixLength} • `}
                {calculationDetails.pattern === 'suffix_variable' && `Suffix length: ${calculationDetails.suffixLength} • `}
                {calculationDetails.pattern === 'both_variable' && `Prefix: ${calculationDetails.prefixLength}, Suffix: ${calculationDetails.suffixLength} • `}
                TLD count: {calculationDetails.tldCount}
              </div>
            )}
            {calculationWarning && (
              <div className="text-xs text-yellow-700 mt-2 font-medium">
                ⚠️ {calculationWarning}
              </div>
            )}
          </div>
        )}

        {/* Remaining Domains Section */}
        {totalPossible > 0 && amount && amount > 0 && (
          <div className="p-3 rounded-md bg-blue-50 border border-blue-200">
            <div className="text-sm font-medium text-blue-700">Remaining Domains</div>
            <div className="text-lg font-semibold text-blue-800">
              {remainingDomains.toLocaleString()} domains
            </div>
            <div className="text-xs text-blue-600 mt-1">
              Available after generating {amount.toLocaleString()} domains
            </div>
          </div>
        )}

        {/* Read-only total display for form compatibility */}
        <FormItem>
          <FormLabel>Total Possible Domains</FormLabel>
          <FormControl>
            <Input 
              value={totalPossible.toString()} 
              readOnly 
              placeholder="Calculated total domains"
              className={!isCalculationSafe ? 'border-yellow-300 bg-yellow-50' : ''}
            />
          </FormControl>
        </FormItem>
      </CardContent>
    </Card>
  );
});

DomainGenerationConfig.displayName = 'DomainGenerationConfig';

export default DomainGenerationConfig;