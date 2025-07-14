"use client";

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, CheckCircle, Globe, Wifi, ShieldCheck, Settings, X } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { campaignService } from '@/lib/services/campaignService.production';
import { useCampaignFormData } from "@/lib/hooks/useCampaignFormData";
import { useAuth } from '@/contexts/AuthContext';
import type { components as _components } from '@/lib/api-client/types';
import type { CampaignViewModel, CampaignType } from '@/lib/types';
import { cn } from '@/lib/utils';

// Types

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

interface PhaseConfigurationPanelProps {
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

export const PhaseConfigurationPanel: React.FC<PhaseConfigurationPanelProps> = ({
  isOpen,
  onClose,
  sourceCampaign,
  phaseType,
  onPhaseStarted
}) => {
  const { toast } = useToast();
  
  // Get current user for validation - DIAGNOSTIC LOGGING
  const authContext = useAuth();
  const { user } = authContext;
  
  // DIAGNOSTIC: Log auth context state when component uses it
  useEffect(() => {
    console.log('[PhaseConfigurationPanel] DIAGNOSTIC: Auth context state on mount/update:', {
      timestamp: new Date().toISOString(),
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      isAuthenticated: authContext.isAuthenticated,
      isLoading: authContext.isLoading,
      isInitialized: authContext.isInitialized,
      currentPath: window.location.pathname,
      phaseType: phaseType
    });
  }, [user, authContext.isAuthenticated, authContext.isLoading, authContext.isInitialized, phaseType]);
  
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
      console.log('[DEBUG] onSubmit starting with data:', data);
      setIsSubmitting(true);

      // ✅ FIX: Validate authentication
      console.log('[DEBUG] Checking authentication, user:', user);
      if (!user?.id) {
        console.log('[DEBUG] Authentication failed - no user.id');
        toast({
          title: "Authentication Required",
          description: "You must be logged in to start DNS validation. Please log in and try again.",
          variant: "destructive"
        });
        return;
      }
      console.log('[DEBUG] Authentication passed, user.id:', user.id);

      // ✅ FIX: Validate source campaign
      console.log('[DEBUG] Checking source campaign:', sourceCampaign);
      if (!sourceCampaign?.id) {
        console.log('[DEBUG] Source campaign validation failed - no sourceCampaign.id');
        toast({
          title: "Invalid Source Campaign",
          description: "Source campaign is invalid. Please refresh the page and try again.",
          variant: "destructive"
        });
        return;
      }
      console.log('[DEBUG] Source campaign validation passed, id:', sourceCampaign.id);

      // Build update payload based on phase type - using UpdateCampaignRequest structure
      let updatePayload: {
        campaignType?: CampaignType;
        personaIds?: string[];
        adHocKeywords?: string[];
        proxyPoolId?: string;
        rotationIntervalSeconds?: number;
        processingSpeedPerMinute?: number;
        batchSize?: number;
        retryAttempts?: number;
        targetHttpPorts?: number[];
      };

      console.log('[DEBUG] Building payload for phaseType:', phaseType);
      if (phaseType === 'dns_validation') {
        console.log('[DEBUG] Processing DNS validation phase');
        // Validate required DNS fields
        console.log('[DEBUG] Checking DNS persona selection:', data.assignedDnsPersonaId);
        if (!data.assignedDnsPersonaId || data.assignedDnsPersonaId === CampaignFormConstants.NONE_VALUE_PLACEHOLDER) {
          console.log('[DEBUG] DNS persona validation failed');
          toast({
            title: "Validation Error",
            description: "DNS persona is required for DNS validation.",
            variant: "destructive"
          });
          return;
        }

        // ✅ FIX: Validate persona UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        console.log('[DEBUG] Validating UUID format for:', data.assignedDnsPersonaId);
        if (!uuidRegex.test(data.assignedDnsPersonaId)) {
          console.log('[DEBUG] UUID validation failed');
          toast({
            title: "Invalid Persona Selection",
            description: "Selected persona is invalid. Please refresh the page and try again.",
            variant: "destructive"
          });
          return;
        }
        console.log('[DEBUG] UUID validation passed');

        // ✅ PHASE TRANSITION: Use UpdateCampaign with campaignType for proper phase transition
        updatePayload = {
          campaignType: 'dns_validation',
          personaIds: [data.assignedDnsPersonaId],
          rotationIntervalSeconds: Number(data.rotationIntervalSeconds),
          processingSpeedPerMinute: Number(data.processingSpeedPerMinute),
          batchSize: Number(data.batchSize),
          retryAttempts: Number(data.retryAttempts),
        };
        console.log('[DEBUG] Built DNS validation params with phase transition:', updatePayload);
      } else if (phaseType === 'http_keyword_validation') {
        console.log('[DEBUG] Processing HTTP keyword validation phase');
        // Validate required HTTP fields
        if (!data.assignedHttpPersonaId || data.assignedHttpPersonaId === CampaignFormConstants.NONE_VALUE_PLACEHOLDER) {
          console.log('[DEBUG] HTTP persona validation failed');
          toast({
            title: "Validation Error",
            description: "HTTP persona is required for HTTP keyword validation.",
            variant: "destructive"
          });
          return;
        }

        if (!data.targetKeywordsInput?.trim()) {
          console.log('[DEBUG] Keywords validation failed');
          toast({
            title: "Validation Error",
            description: "At least one keyword is required for HTTP keyword validation.",
            variant: "destructive"
          });
          return;
        }

        // Parse keywords
        const adHocKeywords = data.targetKeywordsInput
          .split(',')
          .map((k: string) => k.trim())
          .filter((k: string) => k.length > 0);

        // ✅ FIX: Validate HTTP persona UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(data.assignedHttpPersonaId)) {
          console.log('[DEBUG] HTTP UUID validation failed');
          toast({
            title: "Invalid Persona Selection",
            description: "Selected HTTP persona is invalid. Please refresh the page and try again.",
            variant: "destructive"
          });
          return;
        }

        // ✅ PHASE TRANSITION: Use UpdateCampaign with campaignType for proper phase transition
        updatePayload = {
          campaignType: 'http_keyword_validation',
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
        };
        console.log('[DEBUG] Built HTTP validation params with phase transition:', updatePayload);
      } else {
        console.log('[DEBUG] Unsupported phase type:', phaseType);
        throw new Error(`Unsupported phase type: ${phaseType}`);
      }

      // ✅ PHASE TRANSITION: Use UpdateCampaign for all phase transitions
      console.log('[DEBUG] Using UpdateCampaign for phase transition:', phaseType);
      console.log('[DEBUG] Campaign ID:', sourceCampaign.id);
      console.log('[DEBUG] Update payload:', updatePayload);
      
      const updateResult = await campaignService.updateCampaign(sourceCampaign.id, updatePayload as any);
      console.log('[DEBUG] campaignService.updateCampaign returned:', updateResult);
      
      if (updateResult.status === 'error') {
        console.log('[DEBUG] Update result indicates error:', updateResult.message);
        throw new Error(updateResult.message || 'Failed to update campaign for phase transition');
      }
      
      // Fix: Extract the actual campaign data from the nested response
      const backendResponse = updateResult.data;
      const updatedCampaign = backendResponse && typeof backendResponse === 'object' && 'data' in backendResponse
        ? backendResponse.data
        : backendResponse;
      console.log('[DEBUG] Updated campaign data:', updatedCampaign);
      console.log('[DEBUG] Backend response structure:', backendResponse);

      // Type cast to handle the response structure properly
      const campaignData = updatedCampaign as any;
      if (campaignData && (campaignData.id || sourceCampaign.id)) {
        const campaignId = campaignData.id || sourceCampaign.id;
        console.log('[DEBUG] Success! Campaign ID:', campaignId);
        
        const phaseDisplayNames: Record<string, string> = {
          'dns_validation': 'DNS Validation',
          'http_keyword_validation': 'HTTP Keyword Validation'
        };
        
        const displayName = phaseDisplayNames[phaseType as string] || 'Unknown Phase';
        
        toast({
          title: `${displayName} Started Successfully`,
          description: `${displayName} phase has been configured and started on the existing campaign.`,
          variant: "default"
        });

        // Start the campaign for the new phase using the service layer
        try {
          console.log('[DEBUG] Starting campaign...');
          await campaignService.startCampaign(campaignId);
          console.log('[DEBUG] Campaign started successfully');
        } catch (e) {
          console.log('[DEBUG] Campaign start warning:', e);
          console.warn('Campaign may have auto-started:', e);
        }

        // Close panel and notify parent with the same campaign ID
        console.log('[DEBUG] Closing panel and notifying parent');
        onClose();
        
        // 🔧 PHASE TRANSITION FIX: Sync cache invalidation with notification timing
        // This prevents race conditions during phase transitions
        setTimeout(() => {
          // Force cache invalidation synchronized with navigation
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('force_campaign_refresh', {
              detail: { campaignId }
            }));
          }
          
          // Notify parent after cache invalidation
          onPhaseStarted(campaignId);
        }, 500);
      } else {
        console.log('[DEBUG] No valid campaign ID found in result');
        throw new Error("Failed to update campaign for phase transition");
      }
    } catch (error: unknown) {
      console.log('[DEBUG] Exception caught in onSubmit:', error);
      console.error('[PhaseConfiguration] Campaign creation error:', error);
      
      // ✅ FIX: Enhanced error handling with specific error messages
      let errorTitle = "Error Starting Phase";
      let errorDescription = "Failed to start the next phase. Please try again.";
      
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes('400') || errorMessage.includes('validation')) {
          errorTitle = "Validation Error";
          if (errorMessage.includes('dnsvalidationparams required')) {
            errorDescription = "DNS validation parameters are missing. Please check your configuration.";
          } else if (errorMessage.includes('personaids')) {
            errorDescription = "Invalid persona selection. Please select a valid DNS persona.";
          } else if (errorMessage.includes('sourcecampaignid')) {
            errorDescription = "Source campaign is invalid. Please select a valid completed domain generation campaign.";
          } else if (errorMessage.includes('userid')) {
            errorDescription = "User authentication failed. Please log in again.";
          } else {
            errorDescription = "Invalid configuration. Please check your settings and try again.";
          }
        } else if (errorMessage.includes('401') || errorMessage.includes('unauthorized') || errorMessage.includes('403')) {
          errorTitle = "Authentication Error";
          errorDescription = "You are not authorized to create campaigns. Please log in again.";
        } else if (errorMessage.includes('404')) {
          errorTitle = "Not Found";
          errorDescription = "Source campaign not found. Please refresh and try again.";
        } else if (errorMessage.includes('409')) {
          errorTitle = "Conflict";
          errorDescription = "Campaign cannot be started. Please check the campaign status.";
        } else if (errorMessage.includes('500')) {
          errorTitle = "Server Error";
          errorDescription = "Server error. Please try again later.";
        } else {
          errorDescription = error.message || errorDescription;
        }
        
        toast({
          title: errorTitle,
          description: errorDescription,
          variant: "destructive"
        });
      } else {
        toast({
          title: errorTitle,
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      console.log('[DEBUG] onSubmit finally block, setting isSubmitting false');
      setIsSubmitting(false);
    }
  }, [sourceCampaign, user, phaseType, toast, onClose, onPhaseStarted]);

  // Reset form when panel opens/closes
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
    <>
      {/* Backdrop - Very subtle overlay to maintain visibility */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/5 z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}
      
      {/* Slide-in Panel */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-[600px] bg-background border-l shadow-2xl z-50 flex flex-col",
          "transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        onWheel={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-card to-muted/20 flex-shrink-0">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div>
              <h2 className="text-xl font-bold">Configure {phaseDisplayNames[phaseType]}</h2>
              <p className="text-sm text-muted-foreground">
                Setup the next phase of your campaign pipeline
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden" onWheel={(e) => e.stopPropagation()}>
          <div className="p-6 space-y-6 pb-8">
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

                  {/* Campaign Tuning - Using same structure as working CampaignTuningConfig */}
                  <Card className="p-4 pt-2 border-dashed">
                    <CardHeader className="p-2">
                      <CardTitle className="text-base">Campaign Tuning</CardTitle>
                      <CardDescription className="text-xs">Adjust processing parameters.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-2 space-y-4">
                      <Controller name="rotationIntervalSeconds" control={control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rotation Interval (seconds)</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <Controller name="processingSpeedPerMinute" control={control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Processing Speed Per Minute</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <Controller name="batchSize" control={control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Batch Size</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <Controller name="retryAttempts" control={control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Retry Attempts</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      {needsHttpPorts && (
                        <Controller name="targetHttpPorts" control={control} render={({ field }) => (
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
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-6 border-t bg-background">
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={(e) => {
                e.preventDefault();
                console.log('[DEBUG] Button clicked - Starting diagnosis...');
                
                // Get current form state
                const formValues = form.getValues();
                const formErrors = form.formState.errors;
                const isFormValid = form.formState.isValid;
                
                console.log('[DEBUG] Form state diagnosis:', {
                  phaseType,
                  formValues,
                  formErrors,
                  isFormValid,
                  isSubmitting,
                  loadingData,
                  buttonDisabled: isSubmitting || loadingData || !isValid,
                  buttonClickable: !isSubmitting && !loadingData && isValid
                });
                
                // Check DNS persona specifically
                if (phaseType === 'dns_validation') {
                  console.log('[DEBUG] DNS validation specific checks:', {
                    assignedDnsPersonaId: formValues.assignedDnsPersonaId,
                    isDnsPersonaRequired: true,
                    isDnsPersonaValid: formValues.assignedDnsPersonaId && formValues.assignedDnsPersonaId !== CampaignFormConstants.NONE_VALUE_PLACEHOLDER,
                    availableDnsPersonas: dnsPersonas.length,
                    dnsPersonasList: dnsPersonas.map(p => ({ id: p.id, name: p.name }))
                  });
                }
                
                // Try manual validation
                const triggerResult = form.trigger();
                console.log('[DEBUG] Manual form validation result:', triggerResult);
                
                // Call the form submission with error handling
                const handleSubmitWithLogging = form.handleSubmit(
                  (data) => {
                    console.log('[DEBUG] Form validation PASSED - calling onSubmit with data:', data);
                    return onSubmit(data);
                  },
                  (errors) => {
                    console.log('[DEBUG] Form validation FAILED - errors:', errors);
                  }
                );
                
                console.log('[DEBUG] Calling form.handleSubmit...');
                return handleSubmitWithLogging(e);
              }}
              disabled={isSubmitting || loadingData || !isValid}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Start {phaseDisplayNames[phaseType]}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default PhaseConfigurationPanel;