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
import type { components } from '@/lib/api-client/types';
import { getPersonas } from '@/lib/services/personaService';
import { campaignsApi } from '@/lib/api-client/client';
import type { DNSValidationConfig } from '@/lib/api-client/models/dnsvalidation-config';
import type { PhaseConfigureRequest } from '@/lib/api-client/models/phase-configure-request';
// PhaseConfigureRequestPhaseTypeEnum removed - using direct string literals now

// Response types from OpenAPI - using exact same types as campaign form
type PersonaBase = components['schemas']['PersonaResponse'];

interface PersonaResponse extends PersonaBase {
  status?: "Active" | "Disabled" | "Testing" | "Failed";
  tags?: string[];
}

interface DNSValidationFormValues {
  personaIds: string[];
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
  
  // Data state - following campaign form pattern
  const [dnsPersonas, setDnsPersonas] = useState<PersonaResponse[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [configuring, setConfiguring] = useState(false);

  // Form initialization with persona-only configuration
  const form = useForm<DNSValidationFormValues>({
    defaultValues: {
      personaIds: [],
      name: `DNS Validation - ${new Date().toLocaleDateString()}`,
    }
  });

  const watchedPersonaIds = form.watch('personaIds');

  // Load DNS personas on mount - using exact same pattern as campaign form
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true);
        const response = await getPersonas('dns');
        
        // FIXED: Response already properly handled by personaService using extractResponseData
        const personas = response.success ? (response.data || []) : [];
        
        // Filter for DNS personas only (already filtered by type, but add safety checks)
        const dnsOnly = personas.filter(p =>
          p.personaType === 'dns' &&
          p.isEnabled
        );
        
        setDnsPersonas(dnsOnly);
      } catch (error) {
        console.error('Failed to load DNS personas:', error);
        toast({
          title: "Error loading personas",
          description: "Failed to load DNS personas. Please try again.",
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

  const onSubmit = async (data: DNSValidationFormValues) => {
    try {
      setConfiguring(true);

      // Prepare the simplified persona-only configuration
      const dnsConfig: DNSValidationConfig = {
        personaIds: data.personaIds,
        name: data.name,
      };

      const configRequest: PhaseConfigureRequest = {
        phaseType: 'dns_validation',
        config: dnsConfig,
      };

      // Use the generated API client method
      await campaignsApi.configurePhaseStandalone(campaignId, 'dns_validation', configRequest);

      toast({
        title: "DNS validation configured",
        description: "DNS validation phase has been successfully configured with selected personas.",
      });

      onConfigured();
      onClose();
    } catch (error) {
      console.error('Failed to configure DNS validation:', error);
      toast({
        title: "Configuration failed",
        description: "Failed to configure DNS validation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setConfiguring(false);
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={configuring || watchedPersonaIds.length === 0}
              >
                {configuring ? 'Configuring...' : 'Configure DNS Validation'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}