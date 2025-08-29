"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Plus, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Import types and services - using the EXACT same pattern as campaign form
import { PersonasApi, ProxiesApi } from '@/lib/api-client';
import { apiConfiguration } from '@/lib/api/config';
import { PersonaType } from '@/lib/api-client/models/persona-type';
import { useConfigurePhaseStandaloneMutation } from '@/store/api/campaignApi';
import type { ApiDNSValidationConfig } from '@/lib/api-client/models/api-dnsvalidation-config';
import type { PhaseConfigurationRequest } from '@/lib/api-client/models/phase-configuration-request';
import { extractResponseData } from '@/lib/utils/apiResponseHelpers';
import type { PersonaResponse } from '@/lib/api-client/models/persona-response';
import type { ModelsProxy } from '@/lib/api-client/models/models-proxy';
// PhaseConfigureRequestPhaseTypeEnum removed - using direct string literals now

interface DNSValidationFormValues {
  personaIds: string[];
  proxyIds?: string[]; // Optional proxy selection
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
  const [loadingData, setLoadingData] = useState(true);

  // Form initialization with persona-only configuration
  const form = useForm<DNSValidationFormValues>({
    defaultValues: {
      personaIds: [],
      proxyIds: [],
      name: `DNS Validation - ${new Date().toLocaleDateString()}`,
    }
  });

  const watchedPersonaIds = form.watch('personaIds');
  const watchedProxyIds = form.watch('proxyIds') || [];

    // Load DNS personas and proxies on mount - using exact same pattern as campaign form
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true);
  const personasApi = new PersonasApi(apiConfiguration);
  const proxiesApi = new ProxiesApi(apiConfiguration);
        // Load personas and proxies in parallel (use list endpoints)
        const [personasResponse, proxiesResponse] = await Promise.all([
          personasApi.personasList(undefined, undefined, true, PersonaType.dns),
          proxiesApi.proxiesList(undefined, undefined, undefined, undefined, true, undefined),
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
        
        setDnsPersonas(dnsPersonas);
        setProxies(activeProxies);
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

  const handleProxyToggle = (proxyId: string) => {
    const currentProxyIds = form.getValues('proxyIds') || [];
    if (currentProxyIds.includes(proxyId)) {
      form.setValue('proxyIds', currentProxyIds.filter(id => id !== proxyId));
    } else {
      // No limit on proxy selection since it's optional
      form.setValue('proxyIds', [...currentProxyIds, proxyId]);
    }
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
      };

  // Use RTK mutation with canonical backend phase identifier
  await configurePhase({ campaignId, phase: 'dns_validation', config: configRequest }).unwrap();

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

            {/* Proxy Selection - Optional */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Proxy Selection (Optional)</CardTitle>
                <div className="text-sm text-muted-foreground">
                  Optionally select proxies for DNS validation requests. Proxies help vary request sources and improve reliability.
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingData ? (
                  <div className="text-center py-4">Loading proxies...</div>
                ) : proxies.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No active proxies available. DNS validation will proceed without proxy usage.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <div className="text-sm text-muted-foreground">
                      Select proxies to use for DNS validation (optional, can select multiple):
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {proxies.map((proxy) => (
                        <div
                          key={proxy.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            watchedProxyIds.includes(proxy.id || '')
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => handleProxyToggle(proxy.id || '')}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{proxy.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {proxy.protocol?.toUpperCase()} • {proxy.address} • {proxy.isEnabled ? 'Active' : 'Disabled'}
                              </div>
                            </div>
                            {watchedProxyIds.includes(proxy.id || '') && (
                              <Badge variant="default">Selected</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {watchedProxyIds.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {watchedProxyIds.map((proxyId) => {
                          const proxy = proxies.find(p => p.id === proxyId);
                          return (
                            <Badge key={proxyId} variant="secondary" className="flex items-center gap-1">
                              {proxy?.name}
                              <X
                                className="h-3 w-3 cursor-pointer"
                                onClick={() => handleProxyToggle(proxyId)}
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