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

// Import types and services - using the EXACT same pattern as campaign form
import { PersonasApi, ProxiesApi, ProxyPoolsApi } from '@/lib/api-client';
import { apiConfiguration } from '@/lib/api/config';
import { PersonaType } from '@/lib/api-client/models/persona-type';
import { useConfigurePhaseStandaloneMutation } from '@/store/api/campaignApi';
import type { ApiDNSValidationConfig } from '@/lib/api-client/models/api-dnsvalidation-config';
import type { PhaseConfigurationRequest } from '@/lib/api-client/models/phase-configuration-request';
import { extractResponseData } from '@/lib/utils/apiResponseHelpers';
import type { PersonaResponse } from '@/lib/api-client/models/persona-response';
import type { ModelsProxy } from '@/lib/api-client/models/models-proxy';
import type { ModelsProxyPool } from '@/lib/api-client/models/models-proxy-pool';
// PhaseConfigureRequestPhaseTypeEnum removed - using direct string literals now

interface DNSValidationFormValues {
  personaIds: string[];
  proxyPoolId?: string; // Optional proxy pool selection
  name: string;
}

interface DNSValidationConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  onConfigured: () => void;
}

const MAX_PERSONAS_SELECTED = 5;

export default function DNSValidationConfigModal({ 
  isOpen, 
  onClose, 
  campaignId, 
  onConfigured 
}: DNSValidationConfigModalProps) {
  const { toast } = useToast();
  
  // Professional RTK Query mutation instead of amateur singleton API
  const [configurePhase, { isLoading: isConfiguringPhase }] = useConfigurePhaseStandaloneMutation();
  
  // Data state - following campaign form pattern
  const [dnsPersonas, setDnsPersonas] = useState<PersonaResponse[]>([]);
  const [proxies, setProxies] = useState<ModelsProxy[]>([]);
  const [proxyPools, setProxyPools] = useState<ModelsProxyPool[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form initialization with persona-only configuration
  const form = useForm<DNSValidationFormValues>({
    defaultValues: {
      personaIds: [],
  proxyPoolId: undefined,
      name: `DNS Validation - ${new Date().toLocaleDateString()}`,
    }
  });

  const watchedPersonaIds = form.watch('personaIds');
  const watchedProxyPoolId = form.watch('proxyPoolId');

    // Load DNS personas and proxies on mount - using exact same pattern as campaign form
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true);
  const personasApi = new PersonasApi(apiConfiguration);
  const proxiesApi = new ProxiesApi(apiConfiguration);
  const proxyPoolsApi = new ProxyPoolsApi(apiConfiguration);
        // Load personas and proxies in parallel (use list endpoints)
        const [personasResponse, proxiesResponse, proxyPoolsResponse] = await Promise.all([
          personasApi.personasList(undefined, undefined, true, PersonaType.dns),
          proxiesApi.proxiesList(undefined, undefined, undefined, undefined, true, undefined),
          proxyPoolsApi.proxyPoolsList(),
        ]);
        // Unwrap SuccessEnvelope consistently
        const personas = extractResponseData<{ items?: PersonaResponse[] }>(personasResponse)?.items || [];
        const proxies = extractResponseData<{ items?: ModelsProxy[] }>(proxiesResponse)?.items || [];
        
        // Filter for active DNS personas only
        const dnsPersonas = personas.filter((persona) => 
          persona.personaType === 'dns' && persona.isEnabled === true
        );
        
        // Filter for active proxies only  
  const activeProxies = proxies.filter((proxy) => proxy.isEnabled === true);
  // Load proxy pools (enabled only)
  const pools = extractResponseData<{ items?: ModelsProxyPool[] }>(proxyPoolsResponse)?.items || [];
  const enabledPools = pools.filter((p) => p.isEnabled !== false);

        setDnsPersonas(dnsPersonas);
        setProxies(activeProxies);
  setProxyPools(enabledPools);
      } catch (error) {
        console.error('Failed to load DNS personas and proxies:', error);
        toast({
          title: "Failed to load configuration data",
          description: "Could not load DNS personas and proxies. Please try again.",
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
        description: `You can select up to ${MAX_PERSONAS_SELECTED} DNS personas.`,
        variant: "destructive",
      });
    }
  };

  const handleProxyPoolSelect = (poolId: string) => {
    form.setValue('proxyPoolId', poolId === form.getValues('proxyPoolId') ? undefined : poolId);
  };

  const onSubmit = async (data: DNSValidationFormValues) => {
    try {
      // Prepare the simplified persona-only configuration
      const dnsConfig: ApiDNSValidationConfig = {
        personaIds: data.personaIds,
        name: data.name,
      };

      const configRequest: PhaseConfigurationRequest = {
        configuration: { dnsValidation: dnsConfig },
        proxyPoolId: data.proxyPoolId || undefined,
      };

  // Use RTK mutation with canonical backend phase identifier (validation)
  await configurePhase({ campaignId, phase: 'validation', config: configRequest }).unwrap();

      toast({
        title: "DNS validation configured",
        description: "DNS validation phase has been successfully configured with selected personas.",
      });

      onConfigured();
      onClose();
    } catch (error: any) {
      console.error('Failed to configure DNS validation:', error);
      
      // RTK Query standardized error handling
      const errorMessage = error?.data?.message || error?.message || "Failed to configure DNS validation. Please try again.";
      toast({
        title: "Configuration failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure DNS Validation</DialogTitle>
          <DialogDescription>
            Set up DNS validation parameters for your campaign. Select DNS personas and configure processing settings.
          </DialogDescription>
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

            {/* Persona Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">DNS Personas</CardTitle>
                <div className="text-sm text-muted-foreground">
                  Select DNS personas for validation. All technical parameters (timeouts, batch sizes, retry attempts) are automatically configured from persona settings.
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingData ? (
                  <div className="text-center py-4">Loading DNS personas...</div>
                ) : dnsPersonas.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No active DNS personas available. Please create and enable DNS personas first.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <div className="text-sm text-muted-foreground">
                      Select DNS personas to use for validation (max {MAX_PERSONAS_SELECTED}):
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {dnsPersonas.map((persona) => (
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
                                Status: {persona.isEnabled ? 'Active' : 'Disabled'} • Technical parameters auto-configured
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
                          const persona = dnsPersonas.find(p => p.id === personaId);
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

            {/* Proxy Pool Selection - Optional */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Proxy Pool (Optional)</CardTitle>
                <div className="text-sm text-muted-foreground">
                  Optionally select a proxy pool for DNS validation requests. Pools manage rotation and failover strategies.
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingData ? (
                  <div className="text-center py-4">Loading proxy pools...</div>
                ) : proxyPools.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No proxy pools available. DNS validation will proceed without proxies.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-2">
                      {proxyPools.map((pool) => (
                        <div
                          key={pool.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            watchedProxyPoolId === pool.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => handleProxyPoolSelect(pool.id || '')}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{pool.name}</div>
                              <div className="text-sm text-muted-foreground">
                                Strategy: {pool.poolStrategy || 'round_robin'} • Timeout: {pool.timeoutSeconds || 0}s
                              </div>
                            </div>
                            {watchedProxyPoolId === pool.id && (
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isConfiguringPhase || watchedPersonaIds.length === 0}
              >
                {isConfiguringPhase ? 'Configuring...' : 'Configure DNS Validation'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}