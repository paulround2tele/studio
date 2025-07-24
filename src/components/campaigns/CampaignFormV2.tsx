"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Plus, AlertCircle } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Import types and services - using the EXACT same pattern as personas page
import type { CampaignFormValues } from './types/CampaignFormTypes';
import type { components } from '@/lib/api-client/types';
// REMOVED: Legacy unifiedCampaignService deleted during cleanup - using standalone services
// import { unifiedCampaignService } from '@/lib/services/unifiedCampaignService';
import { getPersonas } from '@/lib/services/personaService';
import { getProxies } from '@/lib/services/proxyService.production';
import { listProxyPools } from '@/lib/services/proxyPoolService.production';
import { listKeywordSets } from '@/lib/services/keywordSetService';
import { campaignsApi } from '@/lib/api-client/client';
import { calculateMaxTheoreticalDomains, calculateRemainingDomains } from '@/lib/utils/domainCalculation';

// Response types from OpenAPI - using exact same types as personas page
type PersonaBase = components['schemas']['PersonaResponse'];

interface PersonaResponse extends PersonaBase {
  status?: "Active" | "Disabled" | "Testing" | "Failed";
  tags?: string[];
}

interface ProxyResponse {
  id?: string;
  name?: string;
  isEnabled?: boolean;
}

interface ProxyPoolResponse {
  id?: string;
  name?: string;
  isEnabled?: boolean;
}

interface KeywordSetResponse {
  id?: string;
  name: string;
  isEnabled?: boolean;
}

const MAX_PERSONAS_SELECTED = 5;
const MAX_PROXIES_SELECTED = 10;
const MAX_KEYWORD_SETS_SELECTED = 5;

// Common TLD options
const COMMON_TLDS = [
  '.com', '.net', '.org', '.io', '.co', '.app', '.dev', '.tech', '.info', '.biz',
  'me', 'tv', 'cc', 'ai', 'xyz', 'online', 'site', 'website', 'store'
];

export default function CampaignFormV2() {
  const router = useRouter();
  const { toast } = useToast();
  
  // Data state - following personas page pattern
  const [httpPersonas, setHttpPersonas] = useState<PersonaResponse[]>([]);
  const [dnsPersonas, setDnsPersonas] = useState<PersonaResponse[]>([]);
  const [proxies, setProxies] = useState<ProxyResponse[]>([]);
  const [proxyPools, setProxyPools] = useState<ProxyPoolResponse[]>([]);
  const [keywordSets, setKeywordSets] = useState<KeywordSetResponse[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Domain calculation state
  const [totalRemainingDomains, setTotalRemainingDomains] = useState<number>(0);
  const [currentOffset, setCurrentOffset] = useState<number>(0);
  const [calculatingDomains, setCalculatingDomains] = useState(false);

  // Form initialization - using EXACT CampaignFormTypes structure
  const form = useForm<CampaignFormValues>({
    defaultValues: {
      name: "",
      description: "",
      // Domain generation parameters (top-level, not nested!)
      generationPattern: "prefix_variable",
      constantPart: "",
      allowedCharSet: "abcdefghijklmnopqrstuvwxyz0123456789",
      tldsInput: "com",
      prefixVariableLength: 3,
      suffixVariableLength: 3,
      maxDomainsToGenerate: 1000,
      
      // Launch sequence toggle
      launchSequence: false,
      fullSequenceMode: false,
      
      // DNS validation parameters (nested under dnsValidationParams)
      dnsValidationParams: {
        personaIds: [],
        rotationIntervalSeconds: 300,
        processingSpeedPerMinute: 100,
        batchSize: 50,
        retryAttempts: 3,
      },
      
      // HTTP keyword validation parameters (nested under httpKeywordParams)
      httpKeywordParams: {
        personaIds: [],
        keywordSetIds: [],
        proxyIds: [],
        targetHttpPorts: [80, 443],
        rotationIntervalSeconds: 300,
        processingSpeedPerMinute: 50,
        batchSize: 25,
        retryAttempts: 2,
      }
    }
  });

  // Data fetching - using EXACT personas page pattern
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        // Fetch HTTP personas - using exact personas page pattern
        const httpResponse = await getPersonas('http');
        if (httpResponse.success && httpResponse.data) {
          const httpData = Array.isArray(httpResponse.data) ? httpResponse.data : [];
          // Add missing status property for compatibility - exact same as personas page
          const httpPersonasWithStatus = httpData.map(persona => ({
            ...persona,
            status: persona.isEnabled ? 'Active' : 'Disabled',
            id: persona.id || '',
            name: persona.name || '',
            personaType: persona.personaType || 'http'
          }));
          setHttpPersonas(httpPersonasWithStatus as PersonaResponse[]);
        }

        // Fetch DNS personas - using exact personas page pattern
        const dnsResponse = await getPersonas('dns');
        if (dnsResponse.success && dnsResponse.data) {
          const dnsData = Array.isArray(dnsResponse.data) ? dnsResponse.data : [];
          // Add missing status property for compatibility - exact same as personas page
          const dnsPersonasWithStatus = dnsData.map(persona => ({
            ...persona,
            status: persona.isEnabled ? 'Active' : 'Disabled',
            id: persona.id || '',
            name: persona.name || '',
            personaType: persona.personaType || 'dns'
          }));
          setDnsPersonas(dnsPersonasWithStatus as PersonaResponse[]);
        }

        // Fetch proxies
        const proxiesResponse = await getProxies();
        if (proxiesResponse.success && proxiesResponse.data) {
          const proxiesData = Array.isArray(proxiesResponse.data) ? proxiesResponse.data : [];
          setProxies(proxiesData);
        }

        // Fetch proxy pools
        const proxyPoolsResponse = await listProxyPools();
        if (proxyPoolsResponse.success && proxyPoolsResponse.data) {
          const poolsData = Array.isArray(proxyPoolsResponse.data) ? proxyPoolsResponse.data : [];
          setProxyPools(poolsData);
        }

        // Fetch keyword sets
        const keywordSetsResponse = await listKeywordSets();
        if (keywordSetsResponse.success && keywordSetsResponse.data) {
          const keywordSetsData = Array.isArray(keywordSetsResponse.data) ? keywordSetsResponse.data : [];
          setKeywordSets(keywordSetsData);
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error Loading Data",
          description: "Failed to load form data. Please refresh the page.",
          variant: "destructive"
        });
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [toast]);
  // Domain calculation function
  const calculateDomainStatistics = async (formData: any) => {
    if (!formData.constantPart || !formData.allowedCharSet) return;
    
    setCalculatingDomains(true);
    try {
      // Build domain generation config for calculation
      const config = {
        patternType: formData.generationPattern.replace('_variable', '') as 'prefix' | 'suffix' | 'both',
        characterSet: formData.allowedCharSet,
        constantString: formData.constantPart,
        tld: formData.tldsInput,
        variableLength: formData.generationPattern === 'prefix_variable'
          ? formData.prefixVariableLength
          : formData.generationPattern === 'suffix_variable'
          ? formData.suffixVariableLength
          : Math.max(formData.prefixVariableLength, formData.suffixVariableLength),
        numDomainsToGenerate: formData.maxDomainsToGenerate
      };

      // Get current offset from backend and calculate remaining domains
      let offset = 0;
      try {
        const offsetResponse = await campaignsApi.getPatternOffset({
          patternType: config.patternType,
          characterSet: config.characterSet,
          constantString: config.constantString,
          tld: config.tld,
          variableLength: config.variableLength
        });

        offset = (offsetResponse.data as any)?.data?.currentOffset || 0;
        setCurrentOffset(offset);
      } catch (offsetError) {
        console.warn('Could not fetch current offset, using 0:', offsetError);
        setCurrentOffset(0);
      }

      // Calculate remaining domains
      const maxTheoretical = calculateMaxTheoreticalDomains(config);
      const remaining = calculateRemainingDomains(config, offset);
      setTotalRemainingDomains(remaining);

    } catch (error) {
      console.error('Error calculating domain statistics:', error);
      setCurrentOffset(0);
      setTotalRemainingDomains(0);
    } finally {
      setCalculatingDomains(false);
    }
  };

  // Watch form changes for real-time domain calculation
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout;
    
    const subscription = form.watch((data) => {
      if (data.constantPart && data.allowedCharSet && data.generationPattern) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          calculateDomainStatistics(data);
        }, 500); // Debounce for 500ms
      }
    });
    
    return () => {
      clearTimeout(debounceTimer);
      subscription.unsubscribe();
    };
  }, [form, calculateDomainStatistics]);


  // Selection handlers - using correct field paths from CampaignFormTypes
  const addPersona = (personaId: string, type: 'dns' | 'http') => {
    const fieldPath = type === 'dns' ? 'dnsValidationParams.personaIds' : 'httpKeywordParams.personaIds';
    const currentPersonas = form.getValues(fieldPath) || [];
    
    if (!currentPersonas.includes(personaId)) {
      if (currentPersonas.length >= MAX_PERSONAS_SELECTED) {
        toast({
          title: "Selection Limit",
          description: `Maximum ${MAX_PERSONAS_SELECTED} personas allowed.`,
          variant: "destructive"
        });
        return;
      }
      const updated = [...currentPersonas, personaId];
      form.setValue(fieldPath, updated);
    }
  };

  const removePersona = (personaId: string, type: 'dns' | 'http') => {
    const fieldPath = type === 'dns' ? 'dnsValidationParams.personaIds' : 'httpKeywordParams.personaIds';
    const currentPersonas = form.getValues(fieldPath) || [];
    const updated = currentPersonas.filter(id => id !== personaId);
    form.setValue(fieldPath, updated);
  };

  const addProxy = (proxyId: string) => {
    const currentProxies = form.getValues('httpKeywordParams.proxyIds') || [];
    if (!currentProxies.includes(proxyId)) {
      if (currentProxies.length >= MAX_PROXIES_SELECTED) {
        toast({
          title: "Selection Limit",
          description: `Maximum ${MAX_PROXIES_SELECTED} proxies allowed.`,
          variant: "destructive"
        });
        return;
      }
      const updated = [...currentProxies, proxyId];
      form.setValue('httpKeywordParams.proxyIds', updated);
    }
  };

  const removeProxy = (proxyId: string) => {
    const currentProxies = form.getValues('httpKeywordParams.proxyIds') || [];
    const updated = currentProxies.filter(id => id !== proxyId);
    form.setValue('httpKeywordParams.proxyIds', updated);
  };

  const addKeywordSet = (keywordSetId: string) => {
    const currentKeywordSets = form.getValues('httpKeywordParams.keywordSetIds') || [];
    if (!currentKeywordSets.includes(keywordSetId)) {
      if (currentKeywordSets.length >= MAX_KEYWORD_SETS_SELECTED) {
        toast({
          title: "Selection Limit",
          description: `Maximum ${MAX_KEYWORD_SETS_SELECTED} keyword sets allowed.`,
          variant: "destructive"
        });
        return;
      }
      const updated = [...currentKeywordSets, keywordSetId];
      form.setValue('httpKeywordParams.keywordSetIds', updated);
    }
  };

  const removeKeywordSet = (keywordSetId: string) => {
    const currentKeywordSets = form.getValues('httpKeywordParams.keywordSetIds') || [];
    const updated = currentKeywordSets.filter(id => id !== keywordSetId);
    form.setValue('httpKeywordParams.keywordSetIds', updated);
  };

  // Form submission - Updated for standalone services workflow
  const onSubmit = async (data: CampaignFormValues) => {
    try {
      // Parse TLDs from input and ensure dot prefixes for backend compatibility
      const tlds = data.tldsInput.split(',')
        .map(tld => tld.trim())
        .filter(Boolean)
        .map(tld => tld.startsWith('.') ? tld : '.' + tld);
      
      // Build domain generation config using auto-generated types
      const domainConfig: any = {
        generationPattern: data.generationPattern,
        constantPart: data.constantPart,
        allowedCharSet: data.allowedCharSet,
        tlds: tlds,
        prefixVariableLength: data.prefixVariableLength,
        suffixVariableLength: data.suffixVariableLength,
        numDomainsToGenerate: data.maxDomainsToGenerate,
      };

      // Create standalone services request using auto-generated types
      const request: any = {
        name: data.name,
        description: data.description,
        domainConfig: domainConfig,
      };

      // Use standalone services API - all state management happens in backend
      const response = await campaignsApi.createLeadGenerationCampaign(request);
      
      // Handle unified APIResponse structure safely
      const responseData = response.data;
      let campaignData: any = null;
      
      if (responseData && typeof responseData === 'object') {
        // Check if response follows APIResponse<T> pattern with data field
        if ('data' in responseData) {
          campaignData = (responseData as any).data;
        } else if ('id' in responseData) {
          // Direct campaign object response
          campaignData = responseData;
        } else if ('error' in responseData) {
          // Handle error response
          throw new Error((responseData as any).error || 'Failed to create campaign');
        }
      }
      
      if (!campaignData || !campaignData.id) {
        throw new Error('Campaign creation succeeded but no campaign ID returned');
      }
      
      toast({
        title: "Campaign Created",
        description: `Lead generation campaign "${data.name}" has been created successfully.`,
      });

      // Navigate to campaign details page
      router.push(`/campaigns/${campaignData.id}`);
    } catch (error: any) {
      console.error('Campaign creation error:', error);
      
      // Enhanced error handling for various response structures
      let errorMessage = "Failed to create campaign. Please try again.";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error.response?.data) {
        const errorData = error.response.data;
        errorMessage = errorData.error || errorData.message || errorMessage;
      }
      
      toast({
        title: "Creation Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  // Watch form values for UI updates
  const watchFullSequenceMode = form.watch('fullSequenceMode');
  const watchLaunchSequence = form.watch('launchSequence'); // Keep for backend compatibility
  const watchGenerationPattern = form.watch('generationPattern');
  const watchDnsPersonas = form.watch('dnsValidationParams.personaIds');
  const watchHttpPersonas = form.watch('httpKeywordParams.personaIds');
  const watchProxies = form.watch('httpKeywordParams.proxyIds');
  const watchKeywordSets = form.watch('httpKeywordParams.keywordSetIds');

  // Determine if suffix variable length should be enabled
  const isSuffixEnabled = watchGenerationPattern === 'suffix_variable' || watchGenerationPattern === 'both_variable';

  return (
    <>
      <PageHeader
        title="Create New Campaign"
        description="Create a new domain generation campaign with optional advanced validation phases."
      />

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Campaign Configuration</CardTitle>
          <CardDescription>
            Configure your domain generation campaign. Enable full sequence mode to include DNS and HTTP validation phases.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter campaign name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter campaign description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Domain Statistics Display */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {calculatingDomains ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        </div>
                      ) : (
                        totalRemainingDomains.toLocaleString()
                      )}
                    </div>
                    <div className="text-sm text-foreground/80 font-medium">Total Remaining Domains</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      {calculatingDomains ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
                        </div>
                      ) : (
                        currentOffset.toLocaleString()
                      )}
                    </div>
                    <div className="text-sm text-foreground/80 font-medium">Current Offset</div>
                  </div>
                </div>
              </div>

              {/* Launch Sequence Toggle */}
              <div className="border rounded-lg p-4">
                <FormField
                  control={form.control}
                  name="fullSequenceMode"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Enable Full Auto Sequence Mode
                        </FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Configure all parameters (generation, DNS, HTTP) now and automatically progress through phases when each completes successfully
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            // Also sync launchSequence for backend compatibility
                            form.setValue('launchSequence', checked);
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Domain Generation Parameters */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Domain Generation</h3>
                
                <FormField
                  control={form.control}
                  name="maxDomainsToGenerate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Domains to Generate</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="1000"
                          value={field.value || ''}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="generationPattern"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Generation Pattern</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select pattern" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="prefix_variable">Prefix Variable</SelectItem>
                          <SelectItem value="suffix_variable">Suffix Variable</SelectItem>
                          <SelectItem value="both_variable">Both Variable</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="constantPart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Constant Part</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., mycompany" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="allowedCharSet"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Allowed Character Set</FormLabel>
                      <FormControl>
                        <Input placeholder="abcdefghijklmnopqrstuvwxyz0123456789" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="prefixVariableLength"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prefix Variable Length</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="6"
                          value={field.value || ''}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="suffixVariableLength"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Suffix Variable Length</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="3"
                          value={field.value || ''}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          disabled={!isSuffixEnabled}
                          className={!isSuffixEnabled ? 'bg-muted text-muted-foreground' : ''}
                        />
                      </FormControl>
                      <FormMessage />
                      {!isSuffixEnabled && (
                        <p className="text-xs text-muted-foreground">
                          Only available when Suffix or Both pattern is selected
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tldsInput"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Top Level Domains</FormLabel>
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-3 border rounded-lg bg-background">
                          {field.value?.split(',').filter(Boolean).map((tld: string) => (
                            <Badge key={tld.trim()} variant="secondary" className="flex items-center gap-1">
                              .{tld.trim()}
                              <X
                                className="h-3 w-3 cursor-pointer"
                                onClick={() => {
                                  const currentTlds = field.value?.split(',').filter(Boolean) || [];
                                  const newTlds = currentTlds.filter((t: string) => t.trim() !== tld.trim());
                                  field.onChange(newTlds.join(','));
                                }}
                              />
                            </Badge>
                          ))}
                          {(!field.value || field.value.split(',').filter(Boolean).length === 0) && (
                            <span className="text-muted-foreground text-sm">Select TLDs...</span>
                          )}
                        </div>
                        <Select onValueChange={(value) => {
                          const currentTlds = field.value?.split(',').filter(Boolean) || [];
                          if (!currentTlds.includes(value)) {
                            field.onChange([...currentTlds, value].join(','));
                          }
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Add TLD" />
                          </SelectTrigger>
                          <SelectContent>
                            {COMMON_TLDS.map((tld) => (
                              <SelectItem key={tld} value={tld}>
                                .{tld}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Full Sequence Mode Parameters */}
              {watchFullSequenceMode && (
                <div className="space-y-6 border rounded-lg p-4">
                  <h3 className="text-lg font-medium">Full Auto Sequence Parameters</h3>
                  <div className="text-sm text-muted-foreground mb-4">
                    Configure all validation phases now. The campaign will automatically progress: Generation → DNS Validation → HTTP Keyword Validation
                  </div>
                  
                  {/* DNS Validation */}
                  <div className="space-y-4">
                    <h4 className="text-base font-medium">DNS Validation</h4>
                    
                    {/* DNS Personas Selection */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">DNS Personas (Required)</label>
                      {loadingData ? (
                        <div>Loading personas...</div>
                      ) : (
                        <>
                          <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-2 border rounded">
                            {(watchDnsPersonas || []).map((personaId) => {
                              const persona = dnsPersonas.find(p => p.id === personaId);
                              return (
                                <Badge key={personaId} variant="secondary" className="flex items-center gap-1">
                                  {persona?.name || personaId}
                                  <X 
                                    className="h-3 w-3 cursor-pointer" 
                                    onClick={() => removePersona(personaId, 'dns')}
                                  />
                                </Badge>
                              );
                            })}
                          </div>
                          <Select onValueChange={(value) => addPersona(value, 'dns')}>
                            <SelectTrigger className="w-[300px]">
                              <SelectValue placeholder="Add DNS persona" />
                            </SelectTrigger>
                            <SelectContent>
                              {dnsPersonas
                                .filter(persona => persona.isEnabled && !watchDnsPersonas?.includes(persona.id || ''))
                                .map((persona) => (
                                  <SelectItem key={persona.id} value={persona.id || ''}>
                                    {persona.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </>
                      )}
                    </div>

                    {/* DNS Parameters */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="dnsValidationParams.rotationIntervalSeconds"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rotation Interval (seconds)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                value={field.value || ''}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 300)}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dnsValidationParams.processingSpeedPerMinute"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Processing Speed (/min)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                value={field.value || ''}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 100)}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dnsValidationParams.batchSize"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Batch Size</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                value={field.value || ''}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 50)}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dnsValidationParams.retryAttempts"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Retry Attempts</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                value={field.value || ''}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 3)}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* HTTP Keyword Validation */}
                  <div className="space-y-4">
                    <h4 className="text-base font-medium">HTTP Keyword Validation</h4>
                    
                    {/* HTTP Personas Selection */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">HTTP Personas (Required)</label>
                      {loadingData ? (
                        <div>Loading personas...</div>
                      ) : (
                        <>
                          <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-2 border rounded">
                            {(watchHttpPersonas || []).map((personaId) => {
                              const persona = httpPersonas.find(p => p.id === personaId);
                              return (
                                <Badge key={personaId} variant="secondary" className="flex items-center gap-1">
                                  {persona?.name || personaId}
                                  <X 
                                    className="h-3 w-3 cursor-pointer" 
                                    onClick={() => removePersona(personaId, 'http')}
                                  />
                                </Badge>
                              );
                            })}
                          </div>
                          <Select onValueChange={(value) => addPersona(value, 'http')}>
                            <SelectTrigger className="w-[300px]">
                              <SelectValue placeholder="Add HTTP persona" />
                            </SelectTrigger>
                            <SelectContent>
                              {httpPersonas
                                .filter(persona => persona.isEnabled && !watchHttpPersonas?.includes(persona.id || ''))
                                .map((persona) => (
                                  <SelectItem key={persona.id} value={persona.id || ''}>
                                    {persona.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </>
                      )}
                    </div>

                    {/* Proxies Selection */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Proxies (Optional)</label>
                      {loadingData ? (
                        <div>Loading proxies...</div>
                      ) : (
                        <>
                          <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-2 border rounded">
                            {(watchProxies || []).map((proxyId) => {
                              const proxy = proxies.find(p => p.id === proxyId);
                              return (
                                <Badge key={proxyId} variant="secondary" className="flex items-center gap-1">
                                  {proxy?.name || proxyId}
                                  <X 
                                    className="h-3 w-3 cursor-pointer" 
                                    onClick={() => removeProxy(proxyId)}
                                  />
                                </Badge>
                              );
                            })}
                          </div>
                          <Select onValueChange={addProxy}>
                            <SelectTrigger className="w-[300px]">
                              <SelectValue placeholder="Add proxy" />
                            </SelectTrigger>
                            <SelectContent>
                              {proxies
                                .filter(proxy => proxy.isEnabled && !watchProxies?.includes(proxy.id || ''))
                                .map((proxy) => (
                                  <SelectItem key={proxy.id} value={proxy.id || ''}>
                                    {proxy.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </>
                      )}
                    </div>

                    {/* Keyword Sets Selection */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Keyword Sets (Optional)</label>
                      {loadingData ? (
                        <div>Loading keyword sets...</div>
                      ) : (
                        <>
                          <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-2 border rounded">
                            {(watchKeywordSets || []).map((keywordSetId) => {
                              const keywordSet = keywordSets.find(k => k.id === keywordSetId);
                              return (
                                <Badge key={keywordSetId} variant="secondary" className="flex items-center gap-1">
                                  {keywordSet?.name || keywordSetId}
                                  <X 
                                    className="h-3 w-3 cursor-pointer" 
                                    onClick={() => removeKeywordSet(keywordSetId)}
                                  />
                                </Badge>
                              );
                            })}
                          </div>
                          <Select onValueChange={addKeywordSet}>
                            <SelectTrigger className="w-[300px]">
                              <SelectValue placeholder="Add keyword set" />
                            </SelectTrigger>
                            <SelectContent>
                              {keywordSets
                                .filter(set => set.isEnabled && !watchKeywordSets?.includes(set.id || ''))
                                .map((keywordSet) => (
                                  <SelectItem key={keywordSet.id} value={keywordSet.id || ''}>
                                    {keywordSet.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </>
                      )}
                    </div>

                    {/* HTTP Parameters */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="httpKeywordParams.targetHttpPorts"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target HTTP Ports</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="80,443"
                                value={field.value?.join(',') || ''}
                                onChange={(e) => {
                                  const ports = e.target.value.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p));
                                  field.onChange(ports);
                                }}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="httpKeywordParams.rotationIntervalSeconds"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rotation Interval (seconds)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                value={field.value || ''}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 300)}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="httpKeywordParams.processingSpeedPerMinute"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Processing Speed (/min)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                value={field.value || ''}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 50)}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="httpKeywordParams.batchSize"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Batch Size</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                value={field.value || ''}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 25)}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="httpKeywordParams.retryAttempts"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Retry Attempts</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                value={field.value || ''}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 2)}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Validation Alert */}
              {watchFullSequenceMode && (!watchDnsPersonas?.length || !watchHttpPersonas?.length) && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Full auto sequence mode requires at least one DNS persona and one HTTP persona to be selected.
                  </AlertDescription>
                </Alert>
              )}

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={watchFullSequenceMode && (!watchDnsPersonas?.length || !watchHttpPersonas?.length)}
                >
                  Create Campaign
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}