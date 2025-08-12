"use client";

import React, { useState, useCallback } from 'react';
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
import { Form } from "@/components/ui/form";
import { Loader2, CheckCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useCampaignFormData } from "@/lib/hooks/useCampaignFormData";
import type { CampaignViewModel, CampaignType } from '@/lib/types';
import { campaignsApi } from '@/lib/api-client/client';
import { isResponseSuccess, getResponseError } from '@/lib/utils/apiResponseHelpers';
import { validateUUID } from '@/lib/utils/uuidValidation';

// Clean, modular section components
import { CampaignDetailsSection } from './sections/CampaignDetailsSection';
import { KeywordTargetingSection } from './sections/KeywordTargetingSection';
import { PersonaAssignmentSection } from './sections/PersonaAssignmentSection';
import { PerformanceTuningSection } from './sections/PerformanceTuningSection';

// Types
type PhaseConfigurationMode = 'panel' | 'dialog';

// Constants - backend-driven
const CampaignFormConstants = {
  NONE_VALUE_PLACEHOLDER: "__none__" as const,
} as const;

// Simplified form interface for phase transitions
interface PhaseConfigurationFormValues {
  name: string;
  description?: string;
  targetKeywords?: string;
  assignedHttpPersonaId?: string;
  assignedDnsPersonaId?: string;
  proxyAssignmentMode?: string;
  assignedProxyId?: string;
  processingSpeed?: string;
  batchSize?: number;
  rotationInterval?: number;
  retryAttempts?: number;
}

interface PhaseConfigurationProps {
  mode: PhaseConfigurationMode;
  isOpen: boolean;
  onClose: () => void;
  sourceCampaign: CampaignViewModel;
  phaseType: CampaignType | string;
  onPhaseStarted: (campaignId: string) => void;
}

// Display names for phases
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load data using the existing hook
  const {
    httpPersonas,
    dnsPersonas,
    proxies,
    isLoading: loadingData,
    error: dataLoadError
  } = useCampaignFormData(false);

  // Form setup
  const form = useForm<PhaseConfigurationFormValues>({
    defaultValues: {
      name: sourceCampaign.name,
      description: `${phaseDisplayNames[phaseType]} phase for ${sourceCampaign.name}`,
      targetKeywords: "",
      assignedHttpPersonaId: undefined,
      assignedDnsPersonaId: undefined,
      proxyAssignmentMode: 'none',
      assignedProxyId: undefined,
      processingSpeed: 'medium',
      batchSize: 10,
      rotationInterval: 30,
      retryAttempts: 3,
    },
    mode: "onChange"
  });

  // Determine what fields are needed based on phase type
  const needsKeywords = phaseType === 'http_keyword_validation';
  const needsHttpPersona = phaseType === 'http_keyword_validation';
  const needsDnsPersona = phaseType === 'dns_validation';

  // Form submission - simplified phase transition logic
  const onSubmit = useCallback(async (data: PhaseConfigurationFormValues) => {
    if (!sourceCampaign?.id) {
      toast({
        title: "Error",
        description: "Invalid source campaign",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Validate required fields based on phase type
      if (needsDnsPersona && (!data.assignedDnsPersonaId || data.assignedDnsPersonaId === CampaignFormConstants.NONE_VALUE_PLACEHOLDER)) {
        throw new Error("DNS persona is required for DNS validation");
      }
      
      if (needsHttpPersona && (!data.assignedHttpPersonaId || data.assignedHttpPersonaId === CampaignFormConstants.NONE_VALUE_PLACEHOLDER)) {
        throw new Error("HTTP persona is required for HTTP validation");
      }

      if (needsKeywords && !data.targetKeywords?.trim()) {
        throw new Error("Keywords are required for HTTP keyword validation");
      }

      // Validate persona UUIDs
      if (data.assignedDnsPersonaId && data.assignedDnsPersonaId !== CampaignFormConstants.NONE_VALUE_PLACEHOLDER) {
        const dnsValidation = validateUUID(data.assignedDnsPersonaId, { fieldName: 'DNS Persona ID', showToast: true });
        if (!dnsValidation.isValid) return;
      }

      if (data.assignedHttpPersonaId && data.assignedHttpPersonaId !== CampaignFormConstants.NONE_VALUE_PLACEHOLDER) {
        const httpValidation = validateUUID(data.assignedHttpPersonaId, { fieldName: 'HTTP Persona ID', showToast: true });
        if (!httpValidation.isValid) return;
      }

      // Map phase type to backend parameter
      const phaseParameterMap: Record<string, string> = {
        'dns_validation': 'dns_validation',
        'http_keyword_validation': 'http_keyword_validation',
        'analysis': 'analysis'
      };

      const backendPhaseParam = phaseParameterMap[phaseType as string];
      if (!backendPhaseParam) {
        throw new Error(`Unsupported phase type: ${phaseType}`);
      }

      // Execute phase transition
      const response = await campaignsApi.startPhaseStandalone(sourceCampaign.id, backendPhaseParam as any);

      if (!isResponseSuccess(response)) {
        const errorMessage = getResponseError(response) || 'Failed to start phase';
        throw new Error(errorMessage);
      }

      toast({
        title: `${phaseDisplayNames[phaseType]} Started`,
        description: `Campaign has successfully transitioned to ${phaseDisplayNames[phaseType]} phase.`,
        variant: "default"
      });

      onClose();
      onPhaseStarted(sourceCampaign.id);

      // Force cache invalidation
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('force_campaign_refresh', {
          detail: { campaignId: sourceCampaign.id }
        }));
      }

    } catch (error) {
      console.error('Phase transition error:', error);
      
      let errorTitle = "Error Starting Phase";
      let errorDescription = "Failed to start the phase. Please try again.";
      
      if (error instanceof Error) {
        errorDescription = error.message;
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [sourceCampaign, phaseType, needsDnsPersona, needsHttpPersona, needsKeywords, toast, onClose, onPhaseStarted]);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  if (dataLoadError) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error Loading Data</DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <p className="text-destructive">Error loading configuration data: {dataLoadError}</p>
            <Button onClick={() => window.location.reload()} variant="outline" className="mt-2">
              Reload
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

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
            This will transition "{sourceCampaign?.name}" to the {phaseDisplayNames[phaseType]?.toLowerCase()} phase.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic campaign details */}
            <CampaignDetailsSection 
              control={form.control}
              disabled={isSubmitting}
            />

            {/* Keywords - only for HTTP validation */}
            {needsKeywords && (
              <KeywordTargetingSection 
                control={form.control}
                disabled={isSubmitting}
                needsKeywords={needsKeywords}
              />
            )}

            {/* Persona assignments - the core of the phase transition */}
            <PersonaAssignmentSection 
              control={form.control}
              disabled={isSubmitting}
              httpPersonas={httpPersonas.map(p => ({ id: p.id || '', name: p.name || '' }))}
              dnsPersonas={dnsPersonas.map(p => ({ id: p.id || '', name: p.name || '' }))}
              proxies={proxies.map(p => ({ 
                id: p.id || '', 
                name: p.name, 
                host: p.host, 
                port: p.port ? parseInt(p.port.toString()) : undefined 
              }))}
              needsHttpPersona={needsHttpPersona}
              needsDnsPersona={needsDnsPersona}
              noneValuePlaceholder={CampaignFormConstants.NONE_VALUE_PLACEHOLDER}
              isLoadingData={loadingData}
            />

            {/* Performance tuning */}
            <PerformanceTuningSection 
              control={form.control}
              disabled={isSubmitting}
            />
          </form>
        </Form>

        <DialogFooter>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={form.handleSubmit(onSubmit)}
              disabled={isSubmitting || loadingData || !form.formState.isValid}
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
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PhaseConfiguration;
