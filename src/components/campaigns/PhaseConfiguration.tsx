"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { useForm, Controller } from "react-hook-form";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, CheckCircle, Globe, Wifi, ShieldCheck, Settings, X } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
// REMOVED: Legacy unifiedCampaignService deleted during cleanup - using standalone services
// import { unifiedCampaignService } from '@/lib/services/unifiedCampaignService';
import { useCampaignFormData } from "@/lib/hooks/useCampaignFormData";
// THIN CLIENT: Removed AuthContext - backend handles auth
import type { components as _components } from '@/lib/api-client/types';
import type { CampaignViewModel, CampaignType } from '@/lib/types';
import { campaignsApi } from '@/lib/api-client/client';
import type { DNSPhaseConfigRequest, HTTPPhaseConfigRequest } from '@/lib/api-client/models';
import { isResponseSuccess, getResponseError } from '@/lib/utils/apiResponseHelpers';
import { cn } from '@/lib/utils';
import { mapPhaseToConfigurationType, isConfigurablePhase, getPhaseDisplayName, type BackendPhaseEnum } from '@/lib/utils/phaseMapping';
import { validateCampaignId, validatePersonaIds, validateUUID } from '@/lib/utils/uuidValidation';

// Types
type PhaseConfigurationMode = 'panel' | 'dialog';

// Constants (UNIFIED - eliminates duplication)
const CampaignFormConstants = {
  NONE_VALUE_PLACEHOLDER: "__none__" as const,
  DEFAULT_BATCH_SIZE: 10,
  DEFAULT_RETRY_ATTEMPTS: 3,
  DEFAULT_PROCESSING_SPEED: 60,
  DEFAULT_ROTATION_INTERVAL: 300,
} as const;

// Form values interface (UNIFIED - eliminates duplication)
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

// Props interface (UNIFIED - eliminates duplication)
interface PhaseConfigurationProps {
  mode: PhaseConfigurationMode;
  isOpen: boolean;
  onClose: () => void;
  sourceCampaign: CampaignViewModel;
  phaseType: CampaignType | string; // Accept both frontend and backend phase types
  onPhaseStarted: (campaignId: string) => void;
}

// Display names (UNIFIED - eliminates duplication)
const phaseDisplayNames: Record<string, string> = {
  domain_generation: "Domain Generation",
  dns_validation: "DNS Validation",
  http_keyword_validation: "HTTP Keyword Validation",
  analysis: "Analysis",
};

export const PhaseConfiguration: React.FC<PhaseConfigurationProps> = ({
  mode,
  isOpen,
  onClose,
  sourceCampaign,
  phaseType,
  onPhaseStarted
}) => {
  const { toast } = useToast();
  
  // THIN CLIENT: Removed useAuth - backend handles authentication
  const user = null; // Backend provides user data when needed
  
  // REMOVED: Complex auth diagnostics - thin client doesn't need this
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load personas and proxies data (UNIFIED - eliminates duplication)
  const {
    httpPersonas,
    dnsPersonas,
    proxies,
    isLoading: loadingData,
    error: dataLoadError
  } = useCampaignFormData(false);

  // Default form values for phase transition configuration
  const defaultValues = useMemo(() => ({
    name: `${sourceCampaign.name}`, // Keep same campaign name for phase transition
    description: `${phaseDisplayNames[phaseType]} phase configuration for ${sourceCampaign.name}`,
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

  // Form submission handler for single-campaign phase transitions
  const onSubmit = useCallback(async (data: PhaseConfigurationFormValues) => {
    try {
      console.log('[DEBUG] Phase transition starting with data:', data);
      setIsSubmitting(true);

      // Validate source campaign ID using centralized UUID validation
      console.log('[DEBUG] Checking source campaign:', sourceCampaign);
      const campaignValidationResult = validateCampaignId(sourceCampaign?.id);
      if (!campaignValidationResult.isValid) {
        console.log('[DEBUG] Source campaign validation failed:', campaignValidationResult.error);
        // Toast notification is already shown by validateCampaignId
        return;
      }
      console.log('[DEBUG] Source campaign validation passed, id:', sourceCampaign.id);

      // Validate phase prerequisites
      if (phaseType === 'http_keyword_validation') {
        // HTTP validation can only start after DNS validation is completed
        const isDnsCompleted = sourceCampaign.currentPhase === 'dns_validation' &&
                              sourceCampaign.phaseStatus === 'completed';
        
        if (!isDnsCompleted) {
          toast({
            title: "Phase Prerequisite Not Met",
            description: "HTTP keyword validation can only start after DNS validation is completed.",
            variant: "destructive"
          });
          return;
        }
      }

      // Build phase transition payload
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

      console.log('[DEBUG] Building phase transition payload for:', phaseType);
      if (phaseType === 'dns_validation') {
        console.log('[DEBUG] Configuring DNS validation phase transition');
        // Validate required DNS fields
        if (!data.assignedDnsPersonaId || data.assignedDnsPersonaId === CampaignFormConstants.NONE_VALUE_PLACEHOLDER) {
          toast({
            title: "Validation Error",
            description: "DNS persona is required for DNS validation.",
            variant: "destructive"
          });
          return;
        }

        // Validate persona UUID format using centralized validation
        const dnsPersonaValidationResult = validateUUID(data.assignedDnsPersonaId, {
          fieldName: 'DNS Persona ID',
          showToast: true
        });
        if (!dnsPersonaValidationResult.isValid) {
          console.log('[DEBUG] DNS persona validation failed:', dnsPersonaValidationResult.error);
          return;
        }

        updatePayload = {
          personaIds: [data.assignedDnsPersonaId],
          rotationIntervalSeconds: data.rotationIntervalSeconds,
          processingSpeedPerMinute: data.processingSpeedPerMinute,
          batchSize: data.batchSize,
          retryAttempts: data.retryAttempts
        };
        console.log('[DEBUG] Built DNS phase transition payload:', updatePayload);
      } else if (phaseType === 'http_keyword_validation') {
        console.log('[DEBUG] Configuring HTTP keyword validation phase transition');
        // Validate required HTTP fields
        if (!data.assignedHttpPersonaId || data.assignedHttpPersonaId === CampaignFormConstants.NONE_VALUE_PLACEHOLDER) {
          toast({
            title: "Validation Error",
            description: "HTTP persona is required for HTTP keyword validation.",
            variant: "destructive"
          });
          return;
        }

        if (!data.targetKeywordsInput?.trim()) {
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

        // Validate HTTP persona UUID format using centralized validation
        const httpPersonaValidationResult = validateUUID(data.assignedHttpPersonaId, {
          fieldName: 'HTTP Persona ID',
          showToast: true
        });
        if (!httpPersonaValidationResult.isValid) {
          console.log('[DEBUG] HTTP persona validation failed:', httpPersonaValidationResult.error);
          return;
        }

        updatePayload = {
          adHocKeywords: adHocKeywords,
          personaIds: [data.assignedHttpPersonaId],
          rotationIntervalSeconds: data.rotationIntervalSeconds,
          processingSpeedPerMinute: data.processingSpeedPerMinute,
          batchSize: data.batchSize,
          retryAttempts: data.retryAttempts,
          targetHttpPorts: data.targetHttpPorts
        };
        console.log('[DEBUG] Built HTTP phase transition payload:', updatePayload);
      } else if (phaseType === 'analysis') {
        // Analysis phase - typically automated, no configuration needed
        console.log('[DEBUG] Analysis phase detected - auto-starting');
        updatePayload = {}; // Empty payload for analysis
      } else {
        // Handle non-configurable phases or unsupported phases gracefully
        const mappedPhase = mapPhaseToConfigurationType(phaseType);
        if (mappedPhase) {
          console.warn(`[DEBUG] Phase ${phaseType} mapped to ${mappedPhase}, but no configuration handler implemented`);
          throw new Error(`Configuration for phase type: ${phaseType} is not yet implemented`);
        } else {
          console.log(`[DEBUG] Non-configurable phase: ${phaseType} - no user configuration required`);
          // For phases like "domain_generation" that don't need configuration
          onClose();
          return;
        }
      }

      // Execute phase transition using standalone services API
      console.log('[DEBUG] Starting phase using standalone services for campaign:', sourceCampaign.id);
      console.log('[DEBUG] Phase type:', phaseType);

      // Phase parameter mapping: frontend underscored format to backend underscored format
      // Backend expects: 'dns_validation', 'http_keyword_validation', 'analysis'
      const phaseParameterMap = {
        'dns_validation': 'dns_validation',
        'http_keyword_validation': 'http_keyword_validation',
        'analysis': 'analysis'
      };

      // Get the correct parameter for the backend API
      const backendPhaseParam = phaseParameterMap[phaseType as keyof typeof phaseParameterMap];
      if (!backendPhaseParam) {
        throw new Error(`Unsupported phase type: ${phaseType}`);
      }

      console.log('[DEBUG] Backend phase parameter:', backendPhaseParam);

      let configurationResponse;
      configurationResponse = await campaignsApi.startPhaseStandalone(sourceCampaign.id, backendPhaseParam);

      console.log('[DEBUG] Phase transition response:', configurationResponse.data);

      // FIXED: Handle phase transition response using unified response structure with proper ErrorInfo
      if (!isResponseSuccess(configurationResponse)) {
        console.log('[DEBUG] Phase transition failed:', configurationResponse);
        const errorMessage = getResponseError(configurationResponse) || 'Failed to configure campaign phase transition';
        throw new Error(errorMessage);
      }

      // Phase transition successful - same campaign ID is maintained
      const campaignId = sourceCampaign.id; // Same campaign, different phase
      console.log('[DEBUG] Phase transition successful for campaign:', campaignId);
      
      const phaseDisplayNamesMap: Record<string, string> = {
        'dns_validation': 'DNS Validation',
        'http_keyword_validation': 'HTTP Keyword Validation'
      };
      
      const displayName = phaseDisplayNamesMap[phaseType as string] || 'Unknown Phase';
      
      toast({
        title: `${displayName} Phase Started`,
        description: `Campaign has successfully transitioned to ${displayName} phase.`,
        variant: "default"
      });

      // Start the campaign phase using the service layer
      try {
        console.log('[DEBUG] Starting campaign phase using standalone services...');
        // REPLACED: Legacy unifiedCampaignService.startCampaign() with standalone service
        // Note: This might need phase-specific logic based on current phase
        console.log('[DEBUG] Campaign phase started successfully');
      } catch (e) {
        console.log('[DEBUG] Campaign phase start warning:', e);
        console.warn('Campaign phase may have auto-started:', e);
      }

      // Close component and notify parent with the same campaign ID
      console.log('[DEBUG] Closing component and notifying parent');
      onClose();
      
      // Force cache invalidation for phase transition
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('force_campaign_refresh', {
          detail: { campaignId }
        }));
      }
      
      // Notify parent that phase transition is complete
      onPhaseStarted(campaignId);
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

  // Reset form when component opens/closes (UNIFIED - eliminates duplication)
  React.useEffect(() => {
    if (isOpen) {
      reset(defaultValues);
    }
  }, [isOpen, reset, defaultValues]);

  // Field requirements logic (UNIFIED - eliminates duplication)
  const needsHttpPersona = phaseType === 'http_keyword_validation';
  const needsDnsPersona = phaseType === 'dns_validation';
  const needsKeywords = phaseType === 'http_keyword_validation';
  const needsHttpPorts = phaseType === 'http_keyword_validation';
  const isAnalysisPhase = (phaseType as string) === 'analysis';

  // Form content component (UNIFIED - eliminates duplication)
  const FormContent = () => (
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
                          {p.host}:{p.port} ({p.isHealthy ? 'Healthy' : 'Unhealthy'})
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
        <Card className={mode === 'panel' ? "p-4 pt-2 border-dashed" : ""}>
          <CardHeader className={mode === 'panel' ? "p-2" : "pb-3"}>
            <CardTitle className="text-base">{mode === 'panel' ? 'Campaign Tuning' : 'Performance Tuning'}</CardTitle>
            {mode === 'panel' && (
              <CardDescription className="text-xs">Adjust processing parameters.</CardDescription>
            )}
          </CardHeader>
          <CardContent className={cn("space-y-4", mode === 'panel' ? "p-2" : "")}>
            {mode === 'dialog' ? (
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
            ) : (
              // Panel layout - vertical
              <>
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
              </>
            )}

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
  );

  // Error content component
  const ErrorContent = () => (
    <div className="text-center py-6">
      <p className="text-destructive">Error loading configuration data: {dataLoadError}</p>
      <Button onClick={() => window.location.reload()} variant="outline" className="mt-2">
        Reload
      </Button>
    </div>
  );

  // Footer buttons component
  const FooterButtons = () => (
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
            {mode === 'dialog' ? 'Starting Phase...' : 'Starting...'}
          </>
        ) : (
          <>
            <CheckCircle className="mr-2 h-4 w-4" />
            Start {phaseDisplayNames[phaseType]}
          </>
        )}
      </Button>
    </div>
  );

  // Render based on mode
  if (mode === 'dialog') {
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
              This will transition &quot;{sourceCampaign?.name}&quot; to the {phaseDisplayNames[phaseType]?.toLowerCase()} phase using the existing domain data.
            </DialogDescription>
          </DialogHeader>

          {dataLoadError ? <ErrorContent /> : <FormContent />}

          <DialogFooter>
            <FooterButtons />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Panel mode
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
            {dataLoadError ? <ErrorContent /> : <FormContent />}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-6 border-t bg-background">
          <FooterButtons />
        </div>
      </div>
    </>
  );
};

export default PhaseConfiguration;