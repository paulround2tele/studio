"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import StealthToggle from '@/components/config/StealthToggle';

// Import types and services - using proper client structure
import { PersonasApi, ProxyPoolsApi } from '@/lib/api-client';
import { apiConfiguration } from '@/lib/api/config';
import { PersonaType } from '@/lib/api-client/models/persona-type';
import { useConfigurePhaseStandaloneMutation } from '@/store/api/campaignApi';
import type { ApiHTTPValidationConfig } from '@/lib/api-client/models/api-httpvalidation-config';
import type { PhaseConfigurationRequest } from '@/lib/api-client/models/phase-configuration-request';
import type { PersonaResponse } from '@/lib/api-client/models/persona-response';
import type { ModelsProxyPool } from '@/lib/api-client/models/models-proxy-pool';
import { extractResponseData } from '@/lib/utils/apiResponseHelpers';

// Response types from OpenAPI - using exact same types as campaign form
interface ExtendedPersonaResponse extends PersonaResponse {
  status?: "Active" | "Disabled" | "Testing" | "Failed";
  tags?: string[];
}

interface KeywordSetResponse {
  id?: string;
  name: string;
  isEnabled?: boolean;
}

interface HTTPValidationFormValues {
  name: string;
  personaIds: string[];
  keywordSetIds: string[];
  adHocKeywords: string[];
  proxyPoolId?: string;
}

interface HTTPValidationConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  onConfigured: () => void;
}

const MAX_PERSONAS_SELECTED = 5;
const MAX_KEYWORD_SETS_SELECTED = 5;

export default function HTTPValidationConfigModal({ 
  isOpen, 
  onClose, 
  campaignId, 
  onConfigured 
}: HTTPValidationConfigModalProps) {
  const { toast } = useToast();
  const [configurePhase] = useConfigurePhaseStandaloneMutation();
  
  // Data state - following campaign form pattern
  const [httpPersonas, setHttpPersonas] = useState<ExtendedPersonaResponse[]>([]);
  const [keywordSets, setKeywordSets] = useState<KeywordSetResponse[]>([]);
  const [proxyPools, setProxyPools] = useState<ModelsProxyPool[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [configuring, setConfiguring] = useState(false);

  // Form initialization with persona-driven configuration
  const form = useForm<HTTPValidationFormValues>({
    defaultValues: {
      name: `HTTP Validation - ${new Date().toLocaleDateString()}`,
      personaIds: [],
      keywordSetIds: [],
      adHocKeywords: [],
  proxyPoolId: undefined,
    }
  });

  const watchedPersonaIds = form.watch('personaIds');
  const watchedKeywordSetIds = form.watch('keywordSetIds');
  const watchedAdHocKeywords = form.watch('adHocKeywords');

  // Load data on mount - using exact same pattern as campaign form
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true);
        
        // Fetch HTTP personas - using proper API client
  const personasApi = new PersonasApi(apiConfiguration);
  const proxyPoolsApi = new ProxyPoolsApi(apiConfiguration);
  const [httpResponse, poolsResponse] = await Promise.all([
    personasApi.personasList(undefined, undefined, true, PersonaType.http),
    proxyPoolsApi.proxyPoolsList(),
  ]);
  const httpData = extractResponseData<{ items?: PersonaResponse[] }>(httpResponse)?.items || [];
        // Add missing status property for compatibility - exact same as campaign form
  const httpPersonasWithStatus = httpData.map((persona: any) => ({
          ...persona,
          status: persona.isEnabled ? 'Active' : 'Disabled',
          id: persona.id || '',
          name: persona.name || '',
          personaType: persona.personaType || 'http'
  })).filter((p: any) => p.isEnabled); // Only enabled personas
        setHttpPersonas(httpPersonasWithStatus as ExtendedPersonaResponse[]);

  // Load proxy pools (enabled only)
  const pools = extractResponseData<{ items?: ModelsProxyPool[] }>(poolsResponse)?.items || [];
  setProxyPools(pools.filter((p) => p.isEnabled !== false));

  // Note: Keyword sets functionality needs to be implemented with proper API
        // For now, we'll use an empty array to prevent build errors
        setKeywordSets([]);
      } catch (error) {
        console.error('Failed to load data:', error);
        toast({
          title: "Error loading data",
          description: "Failed to load HTTP configuration data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoadingData(false);
      }
    };

    if (isOpen) {
      loadData();
    }
  }, [isOpen, toast]);

  const handlePersonaToggle = (personaId: string) => {
    const currentPersonaIds = form.getValues('personaIds');
    if (currentPersonaIds.includes(personaId)) {
      form.setValue('personaIds', currentPersonaIds.filter(id => id !== personaId));
    } else if (currentPersonaIds.length < MAX_PERSONAS_SELECTED) {
      form.setValue('personaIds', [...currentPersonaIds, personaId]);
    } else {
      toast({
        title: "Maximum personas reached",
        description: `You can select up to ${MAX_PERSONAS_SELECTED} HTTP personas.`,
        variant: "destructive",
      });
    }
  };

  const handleKeywordSetToggle = (keywordSetId: string) => {
    const currentKeywordSetIds = form.getValues('keywordSetIds');
    if (currentKeywordSetIds.includes(keywordSetId)) {
      form.setValue('keywordSetIds', currentKeywordSetIds.filter(id => id !== keywordSetId));
    } else if (currentKeywordSetIds.length < MAX_KEYWORD_SETS_SELECTED) {
      form.setValue('keywordSetIds', [...currentKeywordSetIds, keywordSetId]);
    } else {
      toast({
        title: "Maximum keyword sets reached",
        description: `You can select up to ${MAX_KEYWORD_SETS_SELECTED} keyword sets.`,
        variant: "destructive",
      });
    }
  };


  const handleAddAdHocKeyword = (keyword: string) => {
    if (!keyword.trim()) return;
    const currentKeywords = form.getValues('adHocKeywords');
    if (!currentKeywords.includes(keyword.trim())) {
      form.setValue('adHocKeywords', [...currentKeywords, keyword.trim()]);
    }
  };

  const handleRemoveAdHocKeyword = (keyword: string) => {
    const currentKeywords = form.getValues('adHocKeywords');
    form.setValue('adHocKeywords', currentKeywords.filter(k => k !== keyword));
  };

  const onSubmit = async (data: HTTPValidationFormValues) => {
    try {
      setConfiguring(true);

      // Prepare the simplified persona-driven configuration
      const httpConfig: ApiHTTPValidationConfig = {
        name: data.name,
        personaIds: data.personaIds,
        keywordSetIds: data.keywordSetIds.length > 0 ? data.keywordSetIds : undefined,
        adHocKeywords: data.adHocKeywords.length > 0 ? data.adHocKeywords : undefined,
      };

      const configRequest: PhaseConfigurationRequest = {
        configuration: { httpValidation: httpConfig },
        proxyPoolId: data.proxyPoolId || undefined,
      };

  // Use RTK mutation with canonical API umbrella phase identifier ('extraction' maps to HTTP keyword validation)
  await configurePhase({ campaignId, phase: 'extraction', config: configRequest }).unwrap();

      toast({
        title: "HTTP validation configured",
        description: "HTTP validation phase has been successfully configured with selected personas and keywords.",
      });

      onConfigured();
      onClose();
    } catch (error) {
      console.error('Failed to configure HTTP validation:', error);
      toast({
        title: "Configuration failed",
        description: "Failed to configure HTTP validation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setConfiguring(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure HTTP Validation</DialogTitle>
          <DialogDescription>
            Configure HTTP keyword validation for your campaign by selecting personas and keywords. All technical parameters (timeouts, proxy settings, ports) are automatically configured from persona settings.
          </DialogDescription>
          <div className="pt-2">
            <StealthToggle />
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Configuration Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Configuration Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter configuration name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* HTTP Personas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">HTTP Personas</CardTitle>
                <div className="text-sm text-muted-foreground">
                  Select HTTP personas for validation. All technical parameters (proxy settings, ports, timeouts, batch sizes) are automatically configured from persona settings.
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingData ? (
                  <div className="text-center py-4">Loading HTTP personas...</div>
                ) : httpPersonas.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No active HTTP personas available. Please create and enable HTTP personas first.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <div className="text-sm text-muted-foreground">
                      Select HTTP personas to use for validation (max {MAX_PERSONAS_SELECTED}):
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {httpPersonas.map((persona) => (
                        <div
                          key={persona.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            watchedPersonaIds.includes(persona.id || '')
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => handlePersonaToggle(persona.id || '')}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{persona.name}</div>
                              <div className="text-sm text-muted-foreground">
                                Status: {persona.status} • Technical parameters auto-configured
                              </div>
                            </div>
                            {watchedPersonaIds.includes(persona.id || '') && (
                              <Badge variant="default">Selected</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {watchedPersonaIds.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {watchedPersonaIds.map((personaId) => {
                          const persona = httpPersonas.find(p => p.id === personaId);
                          return (
                            <Badge key={personaId} variant="secondary" className="flex items-center gap-1">
                              {persona?.name}
                              <X
                                className="h-3 w-3 cursor-pointer"
                                onClick={() => handlePersonaToggle(personaId)}
                              />
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Keywords Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Keywords Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Keyword Sets */}
                <div>
                  <div className="text-sm font-medium mb-2">Predefined Keyword Sets (optional):</div>
                  {keywordSets.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No keyword sets available.</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {keywordSets.map((keywordSet) => (
                        <div
                          key={keywordSet.id}
                          className={`p-2 border rounded cursor-pointer transition-colors ${
                            watchedKeywordSetIds.includes(keywordSet.id || '')
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => handleKeywordSetToggle(keywordSet.id || '')}
                        >
                          <div className="text-sm font-medium">{keywordSet.name}</div>
                          {watchedKeywordSetIds.includes(keywordSet.id || '') && (
                            <Badge variant="secondary" className="mt-1">Selected</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Ad Hoc Keywords */}
                <div>
                  <div className="text-sm font-medium mb-2">Custom Keywords (optional):</div>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Enter a keyword and press Enter"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddAdHocKeyword(e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                  </div>
                  {watchedAdHocKeywords.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {watchedAdHocKeywords.map((keyword) => (
                        <Badge key={keyword} variant="secondary" className="flex items-center gap-1">
                          {keyword}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => handleRemoveAdHocKeyword(keyword)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Proxy Pool Selection - Optional */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Proxy Pool (Optional)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingData ? (
                  <div className="text-center py-4">Loading proxy pools...</div>
                ) : proxyPools.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No proxy pools available. HTTP validation will proceed without proxies.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {proxyPools.map((pool) => (
                      <div
                        key={pool.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          form.watch('proxyPoolId') === pool.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => form.setValue('proxyPoolId', form.watch('proxyPoolId') === pool.id ? undefined : (pool.id || ''))}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{pool.name}</div>
                            <div className="text-sm text-muted-foreground">
                              Strategy: {pool.poolStrategy || 'round_robin'} • Timeout: {pool.timeoutSeconds || 0}s
                            </div>
                          </div>
                          {form.watch('proxyPoolId') === pool.id && (
                            <Badge variant="default">Selected</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>


            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={configuring || watchedPersonaIds.length === 0}
              >
                {configuring ? 'Configuring...' : 'Configure HTTP Validation'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}