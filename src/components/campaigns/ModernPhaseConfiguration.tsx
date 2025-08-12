import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';

import { CampaignDetailsSection } from './configuration/CampaignDetailsSection';
import { KeywordTargetingSection } from './configuration/KeywordTargetingSection';
import { PersonaAssignmentSection } from './configuration/PersonaAssignmentSection';
import { PerformanceTuningSection } from './sections/PerformanceTuningSection';

import { campaignsApi } from '@/lib/api-client/client';
import { isResponseSuccess, getResponseError } from '@/lib/utils/apiResponseHelpers';
import { validateUUID } from '@/lib/utils/uuidValidation';
import type { CampaignViewModel } from '@/lib/api-client/types-bridge';

// Phase configuration form interface
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

interface ModernPhaseConfigurationProps {
  isOpen: boolean;
  onClose: () => void;
  sourceCampaign: CampaignViewModel;
  phaseType: string;
  onPhaseStarted: (campaignId: string) => void;
}

// Phase display names
const phaseDisplayNames: Record<string, string> = {
  domain_generation: "Domain Generation",
  dns_validation: "DNS Validation", 
  http_keyword_validation: "HTTP Keyword Validation",
  analysis: "Analysis",
};

export const ModernPhaseConfiguration: React.FC<ModernPhaseConfigurationProps> = ({
  isOpen,
  onClose,
  sourceCampaign,
  phaseType,
  onPhaseStarted
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form setup with proper defaults
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

  // Form submission handler
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
      if (needsDnsPersona && (!data.assignedDnsPersonaId || data.assignedDnsPersonaId === "__none__")) {
        throw new Error("DNS persona is required for DNS validation");
      }
      
      if (needsHttpPersona && (!data.assignedHttpPersonaId || data.assignedHttpPersonaId === "__none__")) {
        throw new Error("HTTP persona is required for HTTP validation");
      }

      if (needsKeywords && !data.targetKeywords?.trim()) {
        throw new Error("Keywords are required for HTTP keyword validation");
      }

      // Validate persona UUIDs
      if (data.assignedDnsPersonaId && data.assignedDnsPersonaId !== "__none__") {
        const dnsValidation = validateUUID(data.assignedDnsPersonaId, { fieldName: 'DNS Persona ID', showToast: true });
        if (!dnsValidation.isValid) return;
      }

      if (data.assignedHttpPersonaId && data.assignedHttpPersonaId !== "__none__") {
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
  }, [sourceCampaign, phaseType, needsDnsPersona, needsHttpPersona, needsKeywords, onClose, onPhaseStarted, toast]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
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
            {/* Campaign Details */}
            <CampaignDetailsSection 
              control={form.control}
              disabled={isSubmitting}
            />

            {/* Keywords - only for HTTP validation */}
            <KeywordTargetingSection 
              control={form.control}
              disabled={isSubmitting}
              needsKeywords={needsKeywords}
            />

            {/* Persona assignments */}
            <PersonaAssignmentSection 
              control={form.control}
              disabled={isSubmitting}
              needsDnsPersona={needsDnsPersona}
              needsHttpPersona={needsHttpPersona}
            />

            {/* Performance tuning */}
            <PerformanceTuningSection 
              control={form.control}
              disabled={isSubmitting}
            />

            {/* Form Actions */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starting Phase...
                  </>
                ) : (
                  `Start ${phaseDisplayNames[phaseType]}`
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
