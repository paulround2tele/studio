"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Plus, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Import types and services - using the EXACT same pattern as campaign form
import type { components } from '@/lib/api-client/types';
import { getPersonas } from '@/lib/services/personaService';
import { getProxies } from '@/lib/services/proxyService.production';
import { listProxyPools } from '@/lib/services/proxyPoolService.production';
import { listKeywordSets } from '@/lib/services/keywordSetService';
import { campaignsApi } from '@/lib/api-client/client';
import type { HTTPValidationConfig, HTTPValidationConfigProxySelectionStrategyEnum } from '@/lib/api-client/models/httpvalidation-config';
import type { PhaseConfigureRequest } from '@/lib/api-client/models/phase-configure-request';

// Response types from OpenAPI - using exact same types as campaign form
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

interface HTTPValidationFormValues {
  personaIds: string[];
  keywordSetIds: string[];
  adHocKeywords: string[];
  proxyIds: string[];
  proxyPoolId: string;
  proxySelectionStrategy: string;
  targetHttpPorts: number[];
  rotationIntervalSeconds: number;
  processingSpeedPerMinute: number;
  batchSize: number;
  retryAttempts: number;
}

interface HTTPValidationConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  onConfigured: () => void;
}

const MAX_PERSONAS_SELECTED = 5;
const MAX_PROXIES_SELECTED = 10;
const MAX_KEYWORD_SETS_SELECTED = 5;

// Common HTTP ports
const COMMON_HTTP_PORTS = [80, 443, 8080, 8443, 3000, 5000, 8000, 9000];

export default function HTTPValidationConfigModal({ 
  isOpen, 
  onClose, 
  campaignId, 
  onConfigured 
}: HTTPValidationConfigModalProps) {
  const { toast } = useToast();
  
  // Data state - following campaign form pattern
  const [httpPersonas, setHttpPersonas] = useState<PersonaResponse[]>([]);
  const [proxies, setProxies] = useState<ProxyResponse[]>([]);
  const [proxyPools, setProxyPools] = useState<ProxyPoolResponse[]>([]);
  const [keywordSets, setKeywordSets] = useState<KeywordSetResponse[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [configuring, setConfiguring] = useState(false);

  // Form initialization with smart defaults
  const form = useForm<HTTPValidationFormValues>({
    defaultValues: {
      personaIds: [],
      keywordSetIds: [],
      adHocKeywords: [],
      proxyIds: [],
      proxyPoolId: '',
      proxySelectionStrategy: 'round_robin',
      targetHttpPorts: [80, 443],
      rotationIntervalSeconds: 300, // 5 minutes
      processingSpeedPerMinute: 50,
      batchSize: 25,
      retryAttempts: 3,
    }
  });

  const watchedPersonaIds = form.watch('personaIds');
  const watchedKeywordSetIds = form.watch('keywordSetIds');
  const watchedProxyIds = form.watch('proxyIds');
  const watchedTargetPorts = form.watch('targetHttpPorts');
  const watchedAdHocKeywords = form.watch('adHocKeywords');

  // Load data on mount - using exact same pattern as campaign form
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true);
        
        // Fetch HTTP personas - using exact personas page pattern
        const httpResponse = await getPersonas('http');
        if (httpResponse.success && httpResponse.data) {
          const httpData = Array.isArray(httpResponse.data) ? httpResponse.data : [];
          // Add missing status property for compatibility - exact same as campaign form
          const httpPersonasWithStatus = httpData.map(persona => ({
            ...persona,
            status: persona.isEnabled ? 'Active' : 'Disabled',
            id: persona.id || '',
            name: persona.name || '',
            personaType: persona.personaType || 'http'
          })).filter(p => p.isEnabled); // Only enabled personas
          setHttpPersonas(httpPersonasWithStatus as PersonaResponse[]);
        }

        // Fetch proxies
        const proxiesResponse = await getProxies();
        if (proxiesResponse.success && proxiesResponse.data) {
          const proxiesData = Array.isArray(proxiesResponse.data) ? proxiesResponse.data : [];
          const enabledProxies = proxiesData.filter(p => p.isEnabled);
          setProxies(enabledProxies);
        }

        // Fetch proxy pools
        const proxyPoolsResponse = await listProxyPools();
        if (proxyPoolsResponse.success && proxyPoolsResponse.data) {
          const poolsData = Array.isArray(proxyPoolsResponse.data) ? proxyPoolsResponse.data : [];
          const enabledProxyPools = poolsData.filter(p => p.isEnabled);
          setProxyPools(enabledProxyPools);
        }

        // Fetch keyword sets
        const keywordSetsResponse = await listKeywordSets();
        if (keywordSetsResponse.success && keywordSetsResponse.data) {
          const keywordSetsData = Array.isArray(keywordSetsResponse.data) ? keywordSetsResponse.data : [];
          const enabledKeywordSets = keywordSetsData.filter(k => k.isEnabled);
          setKeywordSets(enabledKeywordSets);
        }
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

  const handleProxyToggle = (proxyId: string) => {
    const currentProxyIds = form.getValues('proxyIds');
    if (currentProxyIds.includes(proxyId)) {
      form.setValue('proxyIds', currentProxyIds.filter(id => id !== proxyId));
    } else if (currentProxyIds.length < MAX_PROXIES_SELECTED) {
      form.setValue('proxyIds', [...currentProxyIds, proxyId]);
    } else {
      toast({
        title: "Maximum proxies reached",
        description: `You can select up to ${MAX_PROXIES_SELECTED} proxies.`,
        variant: "destructive",
      });
    }
  };

  const handlePortToggle = (port: number) => {
    const currentPorts = form.getValues('targetHttpPorts');
    if (currentPorts.includes(port)) {
      form.setValue('targetHttpPorts', currentPorts.filter(p => p !== port));
    } else {
      form.setValue('targetHttpPorts', [...currentPorts, port]);
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

      // Prepare the configuration using the generated API types
      const httpConfig: HTTPValidationConfig = {
        personaIds: data.personaIds,
        keywordSetIds: data.keywordSetIds,
        adHocKeywords: data.adHocKeywords,
        proxyIds: data.proxyIds.length > 0 ? data.proxyIds : undefined,
        proxyPoolId: data.proxyPoolId || undefined,
        proxySelectionStrategy: data.proxySelectionStrategy as HTTPValidationConfigProxySelectionStrategyEnum,
        targetHttpPorts: data.targetHttpPorts,
        rotationIntervalSeconds: data.rotationIntervalSeconds,
        processingSpeedPerMinute: data.processingSpeedPerMinute,
        batchSize: data.batchSize,
        retryAttempts: data.retryAttempts,
      };

      const configRequest: PhaseConfigureRequest = {
        phaseType: 'http_keyword_validation',
        config: httpConfig,
      };

      // Use the generated API client method
      await campaignsApi.configurePhaseStandalone(campaignId, 'http_keyword_validation', configRequest);

      toast({
        title: "HTTP validation configured",
        description: "HTTP validation phase has been successfully configured.",
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
            Set up HTTP keyword validation parameters for your campaign. Select personas, keywords, proxies, and configure processing settings.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* HTTP Personas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">HTTP Personas</CardTitle>
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
                                Status: {persona.status}
                              </div>
                            </div>
                            {watchedPersonaIds.includes(persona.id || '') && (
                              <Badge variant="default">Selected</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
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

            {/* Proxy Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Proxy Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Proxy Pool Selection */}
                <FormField
                  control={form.control}
                  name="proxyPoolId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proxy Pool (optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a proxy pool" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">No proxy pool</SelectItem>
                          {proxyPools.map((pool) => (
                            <SelectItem key={pool.id} value={pool.id || ''}>
                              {pool.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Individual Proxies */}
                <div>
                  <div className="text-sm font-medium mb-2">Individual Proxies (optional):</div>
                  {proxies.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No proxies available.</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                      {proxies.map((proxy) => (
                        <div
                          key={proxy.id}
                          className={`p-2 border rounded cursor-pointer transition-colors ${
                            watchedProxyIds.includes(proxy.id || '')
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => handleProxyToggle(proxy.id || '')}
                        >
                          <div className="text-sm font-medium">{proxy.name}</div>
                          {watchedProxyIds.includes(proxy.id || '') && (
                            <Badge variant="secondary" className="mt-1">Selected</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Proxy Selection Strategy */}
                <FormField
                  control={form.control}
                  name="proxySelectionStrategy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proxy Selection Strategy</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="round_robin">Round Robin</SelectItem>
                          <SelectItem value="random">Random</SelectItem>
                          <SelectItem value="least_used">Least Used</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Target Ports */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Target HTTP Ports</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground mb-2">
                  Select HTTP ports to target:
                </div>
                <div className="flex flex-wrap gap-2">
                  {COMMON_HTTP_PORTS.map((port) => (
                    <Badge
                      key={port}
                      variant={watchedTargetPorts.includes(port) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handlePortToggle(port)}
                    >
                      {port}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Processing Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Processing Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="rotationIntervalSeconds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rotation Interval (seconds)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="60" 
                            max="3600" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 300)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="processingSpeedPerMinute"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Processing Speed (per minute)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            max="500" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 50)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="batchSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Batch Size</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            max="100" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 25)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="retryAttempts"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Retry Attempts</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            max="10" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 3)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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