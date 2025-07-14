"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, Globe, Wifi, ShieldCheck, Settings } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { apiClient } from '@/lib/api-client/client';
import { useCampaignFormData } from "@/lib/hooks/useCampaignFormData";
import type { components } from '@/lib/api-client/types';
import type { CampaignViewModel, CampaignType } from '@/lib/types';

// Types
type CreateCampaignRequest = components['schemas']['services.CreateCampaignRequest'];

// Constants
const CampaignFormConstants = {
  NONE_VALUE_PLACEHOLDER: "__none__" as const,
  DEFAULT_BATCH_SIZE: 10,
  DEFAULT_RETRY_ATTEMPTS: 3,
  DEFAULT_PROCESSING_SPEED: 60,
  DEFAULT_ROTATION_INTERVAL: 300,
} as const;

// Form values interface
interface PhaseConfigurationFormValues {
  name: string;
  description?: string;
  rotationIntervalSeconds: number;
  processingSpeedPerMinute: number;
  batchSize: number;
  retryAttempts: number;
  targetHttpPorts?: number[];
  assignedHttpPersonaId?: string;
  assignedDnsPersonaId?: string;
  proxyAssignmentMode: 'none' | 'single' | 'rotate_active';
  assignedProxyId?: string;
  targetKeywordsInput?: string;
}

interface PhaseConfigurationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sourceCampaign: CampaignViewModel;
  phaseType: CampaignType;
  onPhaseStarted: (campaignId: string) => void;
}

const phaseDisplayNames: Record<CampaignType, string> = {
  domain_generation: "Domain Generation",
  dns_validation: "DNS Validation",
  http_keyword_validation: "HTTP Keyword Validation",
};

export const PhaseConfigurationDialog: React.FC<PhaseConfigurationDialogProps> = ({
  isOpen,
  onClose,
  sourceCampaign,
  phaseType,
  onPhaseStarted
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load personas and proxies data
  const {
    httpPersonas,
    dnsPersonas,
    proxies,
    isLoading: loadingData,
    error: dataLoadError
  } = useCampaignFormData(false);

  // Default form values
  const defaultValues = useMemo(() => ({
    name: `${sourceCampaign.name} - ${phaseDisplayNames[phaseType]}`,
    description: `Automated ${phaseDisplayNames[phaseType]} phase from ${sourceCampaign.name}`,
    rotationIntervalSeconds: CampaignFormConstants.DEFAULT_ROTATION_INTERVAL,
    processingSpeedPerMinute: CampaignFormConstants.DEFAULT_PROCESSING_SPEED,
    batchSize: CampaignFormConstants.DEFAULT_BATCH_SIZE,
    retryAttempts: CampaignFormConstants.DEFAULT_RETRY_ATTEMPTS,
    targetHttpPorts: [80, 443],
    assignedHttpPersonaId: CampaignFormConstants.NONE_VALUE_PLACEHOLDER,
    assignedDnsPersonaId: CampaignFormConstants.NONE_VALUE_PLACEHOLDER,
    proxyAssignmentMode: 'none' as const,
    assignedProxyId: CampaignFormConstants.NONE_VALUE_PLACEHOLDER,
    targetKeywordsInput: "telecom, voip, saas, business, services",
  }), [sourceCampaign.name, phaseType]);

  const form = useForm<PhaseConfigurationFormValues>({
    defaultValues,
    mode: "onChange"
  });

  const { control, formState: { isValid }, watch, reset } = form;

  // Form submission handler
  const onSubmit = useCallback(async (data: PhaseConfigurationFormValues) => {
    try {
      setIsSubmitting(true);

      // Build campaign payload based on phase type
      let payload: CreateCampaignRequest;

      if (phaseType === 'dns_validation') {
        // Validate required DNS fields
        if (!data.assignedDnsPersonaId || data.assignedDnsPersonaId === CampaignFormConstants.NONE_VALUE_PLACEHOLDER) {
          toast({
            title: "Validation Error",
            description: "DNS persona is required for DNS validation campaigns.",
            variant: "destructive"
          });
          return;
        }

        payload = {
          campaignType: 'dns_validation',
          name: data.name,
          description: data.description,
          dnsValidationParams: {
            sourceCampaignId: sourceCampaign.id!,
            personaIds: [data.assignedDnsPersonaId],
            rotationIntervalSeconds: Number(data.rotationIntervalSeconds),
            processingSpeedPerMinute: Number(data.processingSpeedPerMinute),
            batchSize: Number(data.batchSize),
            retryAttempts: Number(data.retryAttempts),
          },
        };
      } else if (phaseType === 'http_keyword_validation') {
        // Validate required HTTP fields
        if (!data.assignedHttpPersonaId || data.assignedHttpPersonaId === CampaignFormConstants.NONE_VALUE_PLACEHOLDER) {
          toast({
            title: "Validation Error",
            description: "HTTP persona is required for HTTP keyword validation campaigns.",
            variant: "destructive"
          });
          return;
        }

        if (!data.targetKeywordsInput?.trim()) {
          toast({
            title: "Validation Error",
            description: "At least one keyword is required for HTTP keyword validation campaigns.",
            variant: "destructive"
          });
          return;
        }

        // Parse keywords
        const adHocKeywords = data.targetKeywordsInput
          .split(',')
          .map((k: string) => k.trim())
          .filter((k: string) => k.length > 0);

        payload = {
          campaignType: 'http_keyword_validation',
          name: data.name,
          description: data.description,
          httpKeywordParams: {
            sourceCampaignId: sourceCampaign.id!,
            adHocKeywords: adHocKeywords,
            personaIds: [data.assignedHttpPersonaId],
            proxyPoolId: (data.assignedProxyId && data.assignedProxyId !== CampaignFormConstants.NONE_VALUE_PLACEHOLDER)
              ? data.assignedProxyId
              : undefined,
            rotationIntervalSeconds: Number(data.rotationIntervalSeconds),
            processingSpeedPerMinute: Number(data.processingSpeedPerMinute),
            batchSize: Number(data.batchSize),
            retryAttempts: Number(data.retryAttempts),
            targetHttpPorts: data.targetHttpPorts,
          },
        };
      } else {
        throw new Error(`Unsupported phase type: ${phaseType}`);
      }

      // For DNS validation, this should be a phase transition, not a new campaign
      let response;
      if (phaseType === 'dns_validation') {
        // Update existing campaign to transition to DNS validation phase
        response = await apiClient.updateCampaign(sourceCampaign.id!, {
          campaignType: 'dns_validation', // This will trigger the phase transition in backend
          name: data.name,
          personaIds: [data.assignedDnsPersonaId!], // Safe to use ! because we validated this above
          rotationIntervalSeconds: Number(data.rotationIntervalSeconds),
          processingSpeedPerMinute: Number(data.processingSpeedPerMinute),
          batchSize: Number(data.batchSize),
          retryAttempts: Number(data.retryAttempts),
        });
      } else {
        // Create new campaign for other phase types (like HTTP keyword validation)
        response = await apiClient.createCampaign(payload);
      }

      // Extract campaign from response
      let campaign;
      if (Array.isArray(response)) {
        campaign = response.find(item =>
          item &&
          typeof item === 'object' &&
          'id' in item &&
          item.id
        ) || response[0];
      } else if (response && typeof response === 'object' && 'id' in response) {
        campaign = response;
      } else if (response && typeof response === 'object') {
        const possibleKeys = ['campaign', 'data', 'result', 'payload', 'campaign_data'];
        let foundCampaign = null;
        
        for (const key of possibleKeys) {
          const responseAsRecord = response.data as Record<string, unknown>;
          if (key in responseAsRecord && responseAsRecord[key] && typeof responseAsRecord[key] === 'object') {
            const nestedObj = responseAsRecord[key] as Record<string, unknown>;
            if ('id' in nestedObj && nestedObj.id) {
              foundCampaign = nestedObj;
              break;
            }
          }
        }
        campaign = foundCampaign;
      }

      if (campaign && campaign.id) {
        toast({
          title: "Phase Started Successfully",
          description: `${phaseDisplayNames[phaseType]} campaign "${campaign.name}" has been created and started.`,
          variant: "default"
        });

        // Start the campaign automatically
        try {
          await apiClient.startCampaign(campaign.id);
        } catch (e) {
          console.warn('Campaign may have auto-started:', e);
        }

        // Close dialog and notify parent
        onClose();
        onPhaseStarted(campaign.id);
      } else {
        throw new Error("Failed to extract campaign ID from response");
      }
    } catch (error: unknown) {
      console.error('[PhaseConfiguration] Campaign creation error:', error);
      
      if (error instanceof Error) {
        toast({
          title: "Error Starting Phase",
          description: error.message || "Failed to start the next phase. Please try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error Starting Phase",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [sourceCampaign.id, phaseType, toast, onClose, onPhaseStarted]);

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (isOpen) {
      reset(defaultValues);
    }
  }, [isOpen, reset, defaultValues]);

  const needsHttpPersona = phaseType === 'http_keyword_validation';
  const needsDnsPersona = phaseType === 'dns_validation';
  const needsKeywords = phaseType === 'http_keyword_validation';
  const needsHttpPorts = phaseType === 'http_keyword_validation';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Configure {phaseDisplayNames[phaseType]}
          </DialogTitle>
          <DialogDescription>
            Configure the settings for the next phase of your campaign pipeline.
            This will create a new {phaseDisplayNames[phaseType]?.toLowerCase()} campaign using domains from &quot;{sourceCampaign?.name}&quot;.
          </DialogDescription>
        </DialogHeader>

        {dataLoadError ? (
          <div className="text-center py-6">
            <p className="text-destructive">Error loading configuration data: {dataLoadError}</p>
            <Button onClick={() => window.location.reload()} variant="outline" className="mt-2">
              Reload
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Campaign Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Campaign Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter campaign name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  
                  <FormField control={control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe the campaign goals" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              {/* Keywords Configuration (HTTP only) */}
              {needsKeywords && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Keyword Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField control={control} name="targetKeywordsInput" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Keywords (comma-separated)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="e.g., telecom, voip, saas, business, services"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>
              )}

              {/* Operational Assignments */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Operational Assignments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {needsHttpPersona && (
                    <FormField control={control} name="assignedHttpPersonaId" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          HTTP Persona *
                        </FormLabel>
                        <Select 
                          onValueChange={(val) => field.onChange(val === CampaignFormConstants.NONE_VALUE_PLACEHOLDER ? undefined : val)} 
                          value={field.value || CampaignFormConstants.NONE_VALUE_PLACEHOLDER} 
                          disabled={loadingData}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={loadingData ? "Loading..." : "Select HTTP Persona"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={CampaignFormConstants.NONE_VALUE_PLACEHOLDER}>None (Default)</SelectItem>
                            {httpPersonas.filter(p => p.id).map(p => (
                              <SelectItem key={p.id} value={p.id!}>{p.name}</SelectItem>
                            ))}
                            {httpPersonas.length === 0 && !loadingData && (
                              <SelectItem value="no-active-http" disabled>No HTTP personas found. Please upload some first.</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                  
                  {needsDnsPersona && (
                    <FormField control={control} name="assignedDnsPersonaId" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Wifi className="h-4 w-4" />
                          DNS Persona *
                        </FormLabel>
                        <Select 
                          onValueChange={(val) => field.onChange(val === CampaignFormConstants.NONE_VALUE_PLACEHOLDER ? undefined : val)} 
                          value={field.value || CampaignFormConstants.NONE_VALUE_PLACEHOLDER} 
                          disabled={loadingData}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={loadingData ? "Loading..." : "Select DNS Persona"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={CampaignFormConstants.NONE_VALUE_PLACEHOLDER}>None (Default)</SelectItem>
                            {dnsPersonas.filter(p => p.id).map(p => (
                              <SelectItem key={p.id} value={p.id!}>{p.name}</SelectItem>
                            ))}
                            {dnsPersonas.length === 0 && !loadingData && (
                              <SelectItem value="no-active-dns" disabled>No DNS personas found. Please upload some first.</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                  
                  <FormField control={control} name="proxyAssignmentMode" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        Proxy Assignment
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || 'none'} disabled={loadingData}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select proxy mode" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None (Direct)</SelectItem>
                          <SelectItem value="single">Single Proxy</SelectItem>
                          <SelectItem value="rotate_active">Rotate Active Proxies</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {watch("proxyAssignmentMode") === 'single' && (
                    <FormField control={control} name="assignedProxyId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Specific Proxy</FormLabel>
                        <Select
                          onValueChange={(val) => field.onChange(val === CampaignFormConstants.NONE_VALUE_PLACEHOLDER ? undefined : val)}
                          value={field.value || CampaignFormConstants.NONE_VALUE_PLACEHOLDER}
                          disabled={loadingData}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={loadingData ? "Loading..." : "Select Proxy"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={CampaignFormConstants.NONE_VALUE_PLACEHOLDER}>None</SelectItem>
                            {proxies.filter(p => p.id && p.isEnabled).map(p => (
                              <SelectItem key={p.id} value={p.id!}>
                                {p.host?.string}:{p.port?.int32} ({p.isHealthy ? 'Healthy' : 'Unhealthy'})
                              </SelectItem>
                            ))}
                            {proxies.filter(p => p.id && p.isEnabled).length === 0 && !loadingData && (
                              <SelectItem value="no-active-proxies" disabled>No active proxies found. Please upload some first.</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                </CardContent>
              </Card>

              {/* Campaign Tuning */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Performance Tuning</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={control} name="processingSpeedPerMinute" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Processing Speed (per minute)</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={control} name="batchSize" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Batch Size</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={control} name="rotationIntervalSeconds" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rotation Interval (seconds)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={control} name="retryAttempts" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Retry Attempts</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  {needsHttpPorts && (
                    <FormField control={control} name="targetHttpPorts" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target HTTP Ports (comma-separated)</FormLabel>
                        <FormControl>
                          <Input
                            value={field.value?.join(', ') || ''}
                            onChange={(e) => {
                              const ports = e.target.value
                                .split(',')
                                .map(p => parseInt(p.trim(), 10))
                                .filter(p => !Number.isNaN(p));
                              field.onChange(ports);
                            }}
                            placeholder="80, 443, 8080"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                </CardContent>
              </Card>
            </form>
          </Form>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={form.handleSubmit(onSubmit)}
            disabled={isSubmitting || loadingData || !isValid}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting Phase...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Start {phaseDisplayNames[phaseType]}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PhaseConfigurationDialog;