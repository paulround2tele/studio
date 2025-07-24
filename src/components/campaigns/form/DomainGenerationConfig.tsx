import React, { memo, useEffect, useState, useMemo } from 'react';
import { Control, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { AxiosError } from 'axios';
import { apiClient } from '@/lib/api-client/client';
import { PatternOffsetRequestPatternTypeEnum } from '@/lib/api-client/models/pattern-offset-request';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Import shared types to prevent conflicts
import type { CampaignFormValues } from '../types/CampaignFormTypes';

// WebSocket message data interfaces
interface DNSValidationResult {
  offsetUpdates?: OffsetUpdate[];
  [key: string]: unknown;
}

interface DomainGeneratedResult {
  patternSignature?: {
    patternType: string;
    variableLength: number;
    characterSet: string;
    constantString: string;
    tld: string;
  };
  currentOffset?: number;
  [key: string]: unknown;
}

interface OffsetUpdate {
  patternSignature?: {
    patternType: string;
    variableLength: number;
    characterSet: string;
    constantString: string;
    tld: string;
  };
  newOffset?: number;
  [key: string]: unknown;
}

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
      "prefix_variable": PatternOffsetRequestPatternTypeEnum.Prefix,
      "suffix_variable": PatternOffsetRequestPatternTypeEnum.Suffix,
      "both_variable": PatternOffsetRequestPatternTypeEnum.Both
    } as const;
    
    const tlds = (tldsInput as string).split(',').map(tld => tld.trim()).filter(tld => tld.length > 0);
    // Ensure TLD format is consistent (ensure dot prefix for backend)
    const primaryTld = tlds[0] || '.com';
    const normalizedTld = primaryTld.startsWith('.') ? primaryTld : '.' + primaryTld;
    const variableLength = parseInt(String(prefixVariableLength || 3), 10);
    
    return {
      patternType: patternTypeMap[generationPattern],
      variableLength,
      characterSet: allowedCharSet,
      constantString: constantPart,
      tld: normalizedTld,
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
          patternType: patternSignature.patternType as PatternOffsetRequestPatternTypeEnum,
          variableLength: patternSignature.variableLength,
          characterSet: patternSignature.characterSet,
          constantString: patternSignature.constantString,
          tld: patternSignature.tld
        };
        
        console.log('🔍 [Offset] Fetching offset for pattern:', patternRequest);
        
        // TODO: Fix getPatternOffset API call once OpenAPI client is properly regenerated
        let offsetValue = 0;
        try {
          const response = await apiClient.getPatternOffset(patternRequest as any);
          const data = response.data as { [key: string]: number };
          offsetValue = data.currentOffset || data['currentOffset'] || 0;
        } catch (error) {
          console.warn('Failed to fetch pattern offset, using default:', error);
          offsetValue = 0;
        }

        if (cancelled) return;
        
        if (!cancelled) {
          if (typeof offsetValue === 'number') {
            setCurrentOffset({
              value: offsetValue,
              isLoading: false,
              error: null
            });
            console.log(`✅ [Offset] Successfully fetched offset: ${offsetValue}`);
          } else {
            throw new Error(`Invalid offset response: expected number, got ${typeof offsetValue}`);
          }
        }
      } catch (err) {
        console.error('❌ [Offset] Error fetching pattern offset:', err);
        
        if (!cancelled) {
          let errorMessage = 'Failed to fetch offset';
          if (err instanceof Error) {
            errorMessage = err.message;
          } else if (typeof err === 'object' && err !== null && 'response' in err) {
            const axiosError = err as AxiosError;
            if (axiosError.response?.status === 404) {
              errorMessage = 'Pattern not found - this is a new pattern combination';
            } else if (axiosError.response?.status !== undefined && axiosError.response.status >= 500) {
              errorMessage = 'Server error while fetching offset';
            } else if (axiosError.response?.data && typeof axiosError.response.data === 'object' && 'message' in axiosError.response.data) {
              errorMessage = String(axiosError.response.data.message);
            }
          }
          
          setCurrentOffset({
            value: 0, // Default to 0 for new patterns, but with clear error indication
            isLoading: false,
            error: errorMessage
          });
        }
      }
    }

    fetchCurrentOffset();
    return () => { cancelled = true; };
  }, [patternSignature]);

  // WebSocket subscription for real-time offset updates
  useEffect(() => {
    if (!patternSignature) return;

    let wsCleanup: (() => void) | null = null;

    // Dynamically import WebSocket service to avoid SSR issues
    const setupWebSocket = async () => {
      try {
        const { websocketService } = await import('@/lib/services/websocketService.simple');
        
        wsCleanup = websocketService.connect('global', {
          onMessage: (message) => {
            console.log('🔄 [Offset] WebSocket message received:', message);
            
            // Handle DNS validation results that might contain offset updates
            if (message.type === 'dns.validation.result' && message.data) {
              const data = message.data as DNSValidationResult;
              
              // Check if this message contains offset information for our pattern
              if (data.offsetUpdates && Array.isArray(data.offsetUpdates)) {
                for (const offsetUpdate of data.offsetUpdates) {
                  if (offsetUpdate.patternSignature &&
                      offsetUpdate.patternSignature.patternType === patternSignature.patternType &&
                      offsetUpdate.patternSignature.variableLength === patternSignature.variableLength &&
                      offsetUpdate.patternSignature.characterSet === patternSignature.characterSet &&
                      offsetUpdate.patternSignature.constantString === patternSignature.constantString &&
                      offsetUpdate.patternSignature.tld === patternSignature.tld) {
                    
                    console.log('🔄 [Offset] Real-time offset update:', offsetUpdate.newOffset);
                    setCurrentOffset(prev => ({
                      ...prev,
                      value: typeof offsetUpdate.newOffset === 'number' ? offsetUpdate.newOffset : prev.value,
                      error: null
                    }));
                    break;
                  }
                }
              }
            }
            
            // Handle general offset updates
            if (message.type === 'domain_generated' && message.data) {
              const data = message.data as DomainGeneratedResult;
              
              // Check if this domain generation relates to our pattern
              if (data.patternSignature &&
                  data.patternSignature.patternType === patternSignature.patternType &&
                  data.patternSignature.variableLength === patternSignature.variableLength &&
                  data.patternSignature.characterSet === patternSignature.characterSet &&
                  data.patternSignature.constantString === patternSignature.constantString &&
                  data.patternSignature.tld === patternSignature.tld &&
                  typeof data.newOffset === 'number') {
                
                console.log('🔄 [Offset] Domain generation offset update:', data.newOffset);
                setCurrentOffset(prev => ({
                  ...prev,
                  value: typeof data.newOffset === 'number' ? data.newOffset : prev.value,
                  error: null
                }));
              }
            }
          },
          onError: (error) => {
            console.error('❌ [Offset] WebSocket error:', error);
          }
        });
        
        console.log('🔗 [Offset] WebSocket subscription established for offset updates');
      } catch (error) {
        console.error('❌ [Offset] Failed to setup WebSocket subscription:', error);
      }
    };

    setupWebSocket();

    return () => {
      if (wsCleanup) {
        console.log('🔌 [Offset] Cleaning up WebSocket subscription');
        wsCleanup();
      }
    };
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

        {/* Current Offset Display (Read-Only) with Enhanced Error Handling */}
        <div className={`p-3 rounded-md border ${
          currentOffset.error
            ? currentOffset.error.includes('limit') || currentOffset.error.includes('maximum')
              ? 'bg-red-50 border-red-200'
              : 'bg-yellow-50 border-yellow-200'
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className={`text-sm font-medium mb-2 ${
            currentOffset.error
              ? currentOffset.error.includes('limit') || currentOffset.error.includes('maximum')
                ? 'text-red-700'
                : 'text-yellow-700'
              : 'text-blue-700'
          }`}>
            Current Offset for This Pattern
            {currentOffset.isLoading && (
              <span className="ml-2 text-xs text-blue-600">(loading...)</span>
            )}
          </div>
          <div className={`text-2xl font-bold mb-1 ${
            currentOffset.error
              ? currentOffset.error.includes('limit') || currentOffset.error.includes('maximum')
                ? 'text-red-800'
                : 'text-yellow-800'
              : 'text-blue-800'
          }`}>
            {currentOffset.value.toLocaleString()}
          </div>
          {currentOffset.error && (
            <div className={`text-xs mb-2 ${
              currentOffset.error.includes('limit') || currentOffset.error.includes('maximum')
                ? 'text-red-600'
                : 'text-yellow-600'
            }`}>
              <strong>
                {currentOffset.error.includes('limit') || currentOffset.error.includes('maximum')
                  ? '🚫 Offset Limit:'
                  : '⚠️ Warning:'
                }
              </strong> {currentOffset.error}
              {(currentOffset.error.includes('limit') || currentOffset.error.includes('maximum')) && (
                <div className="mt-1 text-xs">
                  💡 Try using a different pattern combination or character set to continue domain generation.
                </div>
              )}
            </div>
          )}
          <div className={`text-xs ${
            currentOffset.error
              ? currentOffset.error.includes('limit') || currentOffset.error.includes('maximum')
                ? 'text-red-600'
                : 'text-yellow-600'
              : 'text-blue-600'
          }`}>
            ℹ️ Domain generation will resume from this offset for this exact pattern combination.
            This value is automatically managed by the backend and updates in real-time.
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