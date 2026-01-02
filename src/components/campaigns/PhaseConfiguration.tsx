"use client";

import React, { useState, useCallback } from 'react';
import { useForm } from "react-hook-form";
import Button from '@/components/ta/ui/button/Button';
import { Modal } from "@/components/ta/ui/modal";
import { Form } from "@/components/ui/form";
import { LoaderIcon, CheckCircleIcon } from '@/icons';
import { useToast } from "@/hooks/use-toast";
import { useCampaignFormData } from "@/lib/hooks/useCampaignFormData";
import type { CampaignResponse } from '@/lib/api-client/models/campaign-response';
import { useStartPhaseStandaloneMutation } from '@/store/api/campaignApi';
import { validateUUID } from '@/lib/utils/uuidValidation';
import { normalizeToApiPhase } from '@/lib/utils/phaseNames';
import { getApiErrorMessage } from '@/lib/utils/getApiErrorMessage';

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
  sourceCampaign: CampaignResponse;
  phaseType: string;
  onPhaseStarted: (campaignId: string) => void;
}

// Display names for phases
const phaseDisplayNames: Record<string, string> = {
  domain_generation: "Domain Generation",
  dns_validation: "DNS Validation",
  http_keyword_validation: "HTTP Keyword Validation",
  analysis: "Analysis",
  enrichment: "Lead Enrichment",
};

export const PhaseConfiguration: React.FC<PhaseConfigurationProps> = ({
  mode: _mode,
  isOpen,
  onClose,
  sourceCampaign,
  phaseType,
  onPhaseStarted
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startPhase] = useStartPhaseStandaloneMutation();

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
  const backendPhaseParam = normalizeToApiPhase(phaseType as string);
  if (!backendPhaseParam) {
        throw new Error(`Unsupported phase type: ${phaseType}`);
      }

  // Execute phase transition via RTK Query
  await startPhase({ campaignId: sourceCampaign.id, phase: backendPhaseParam }).unwrap();

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
      let errorDescription = getApiErrorMessage(error, 'Failed to start the phase. Please try again.');
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [sourceCampaign, phaseType, needsDnsPersona, needsHttpPersona, needsKeywords, toast, onClose, onPhaseStarted, startPhase]);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  if (dataLoadError) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} className="max-w-md p-6 lg:p-8">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Error Loading Data</h3>
          <p className="text-destructive mb-4">Error loading configuration data: {dataLoadError}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Reload
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <CheckCircleIcon className="h-5 w-5 text-green-600" />
          Configure {phaseDisplayNames[phaseType]}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Configure the settings for the next phase of your campaign pipeline.
          This will transition &quot;{sourceCampaign?.name}&quot; to the {phaseDisplayNames[phaseType]?.toLowerCase()} phase.
        </p>
      </div>

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
            httpPersonas={httpPersonas.map(p => ({ id: p.id, name: p.name }))}
            dnsPersonas={dnsPersonas.map(p => ({ id: p.id, name: p.name }))}
            proxies={proxies.map(p => ({ id: p.id, host: p.host, port: p.port }))}
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

      {/* Footer */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
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
              <LoaderIcon className="mr-2 h-4 w-4" />
              Starting Phase...
            </>
          ) : (
            <>
              <CheckCircleIcon className="mr-2 h-4 w-4" />
              Start {phaseDisplayNames[phaseType]}
            </>
          )}
        </Button>
      </div>
    </Modal>
  );
};

export default PhaseConfiguration;
