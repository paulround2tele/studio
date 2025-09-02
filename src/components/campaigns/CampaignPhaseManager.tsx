import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useConfigurePhaseStandaloneMutation, useStartPhaseStandaloneMutation } from '@/store/api/campaignApi';
import type { PhaseConfigurationRequest as ApiPhaseConfigureRequest } from '@/lib/api-client/models';
import type { DNSValidatorConfigJSON as ApiDNSValidationConfig } from '@/lib/api-client/models/dnsvalidator-config-json';
import type { HTTPValidatorConfigJSON as ApiHTTPValidationConfig } from '@/lib/api-client/models/httpvalidator-config-json';
import type { ServicesDomainGenerationPhaseConfig } from '@/lib/api-client/models/services-domain-generation-phase-config';
import type { ApiAnalysisConfig } from '@/lib/api-client/models/api-analysis-config';
import { CampaignResponseCurrentPhaseEnum as CampaignCurrentPhaseEnum } from '@/lib/api-client/models';
import { normalizeToApiPhase } from '@/lib/utils/phaseNames';

// Import the properly typed configuration components
import DNSValidationConfig from './configuration/DNSValidationConfig';
import HTTPKeywordValidationConfig from './configuration/HTTPKeywordValidationConfig';
import DomainGenerationConfig from './configuration/DomainGenerationConfig';
import AnalysisConfig from './configuration/AnalysisConfig';
import { useCampaignPhaseEvents } from '@/lib/hooks/useCampaignPhaseEvents';

interface CampaignPhaseManagerProps {
  campaignId: string;
}

// Form data for phase-centric campaign system
interface PhaseManagerFormData {
  selectedPhase: CampaignCurrentPhaseEnum;
  dnsValidationConfig?: ApiDNSValidationConfig;
  httpKeywordValidationConfig?: ApiHTTPValidationConfig;
  domainGenerationConfig?: ServicesDomainGenerationPhaseConfig;
  analysisConfig?: ApiAnalysisConfig;
}

export const CampaignPhaseManager: React.FC<CampaignPhaseManagerProps> = ({ campaignId }) => {
  const { toast } = useToast();
  const [_selectedPhase, _setSelectedPhase] = useState<CampaignCurrentPhaseEnum | ''>('');
  // Live updates: invalidate campaign-state on SSE phase events
  useCampaignPhaseEvents(campaignId);
  
  const [configurePhase, { isLoading: isConfiguring }] = useConfigurePhaseStandaloneMutation();
  const [startPhase, { isLoading: isStarting }] = useStartPhaseStandaloneMutation();
  
  const form = useForm<PhaseManagerFormData>();

  const onConfigure = async (data: PhaseManagerFormData) => {
    if (!data.selectedPhase) {
      toast({
        title: "Error",
        description: "Please select a phase",
        variant: "destructive",
      });
      return;
    }

    // Get the appropriate config based on selected phase
  let phaseConfig: any;
    
    switch (data.selectedPhase) {
      case 'validation':
        phaseConfig = data.dnsValidationConfig ?? data.httpKeywordValidationConfig;
        break;
      case 'extraction':
        phaseConfig = data.httpKeywordValidationConfig;
        break;
      case 'analysis':
        phaseConfig = data.analysisConfig;
        break;
      case 'discovery':
        toast({ title: 'Info', description: 'Discovery uses campaign creation config' });
        return;
      default:
        toast({
          title: "Error",
          description: "Invalid phase selected",
          variant: "destructive",
        });
        return;
    }

    try {
  const configReq: ApiPhaseConfigureRequest = {
        configuration: phaseConfig || {},
        // personaIds/keywordSetIds can be set by the individual config UIs
      };
  const apiPhase = normalizeToApiPhase(data.selectedPhase);
  if (!apiPhase) throw new Error(`Unknown phase: ${data.selectedPhase}`);
  await configurePhase({ campaignId, phase: apiPhase, config: configReq }).unwrap();

      toast({
        title: "Phase Configured",
        description: `${data.selectedPhase} phase configured successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Configuration Failed",
        description: error.data?.message || "Failed to configure phase",
        variant: "destructive",
      });
    }
  };

  const onStart = async () => {
    const selectedPhase = form.getValues('selectedPhase');
    if (!selectedPhase) {
      toast({
        title: "Error",
        description: "Please select a phase",
        variant: "destructive",
      });
      return;
    }

    try {
  const apiPhase = normalizeToApiPhase(selectedPhase);
  if (!apiPhase) throw new Error(`Unknown phase: ${selectedPhase}`);
  await startPhase({ campaignId, phase: apiPhase }).unwrap();

      toast({
        title: "Phase Started",
        description: `${selectedPhase} phase started successfully - campaign will transition automatically`,
      });
    } catch (error: any) {
      toast({
        title: "Start Failed",
        description: error.data?.message || "Failed to start phase",
        variant: "destructive",
      });
    }
  };

  const renderPhaseConfig = () => {
    const selectedPhase = form.watch('selectedPhase');
    if (!selectedPhase) return null;

    switch (selectedPhase) {
      case 'validation':
        return (
          <FormField
            control={form.control}
            name="dnsValidationConfig"
            render={() => (
              <DNSValidationConfig 
                control={form.control as any} 
                disabled={isConfiguring} 
              />
            )}
          />
        );
      case 'extraction':
        return (
          <FormField
            control={form.control}
            name="httpKeywordValidationConfig"
            render={() => (
              <HTTPKeywordValidationConfig 
                control={form.control as any} 
                disabled={isConfiguring} 
              />
            )}
          />
        );
      case 'discovery':
        return (
          <FormField
            control={form.control}
            name="domainGenerationConfig"
            render={() => (
              <DomainGenerationConfig 
                control={form.control as any} 
                disabled={isConfiguring} 
              />
            )}
          />
        );
      case 'analysis':
        return (
          <FormField
            control={form.control}
            name="analysisConfig"
            render={() => (
              <AnalysisConfig 
                control={form.control as any} 
                disabled={isConfiguring} 
              />
            )}
          />
        );
      default:
        return <div>Configuration for {selectedPhase} not implemented yet</div>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Campaign Phase Management</CardTitle>
        <CardDescription>
          Configure and execute campaign phases using proper backend types
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onConfigure)} className="space-y-6">
            {/* Phase Selection */}
            <FormField
              control={form.control}
              name="selectedPhase"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Phase</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                    }} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a phase to configure" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="discovery">Discovery</SelectItem>
                      <SelectItem value="validation">Validation</SelectItem>
                      <SelectItem value="extraction">Extraction</SelectItem>
                      <SelectItem value="analysis">Analysis</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phase-specific configuration */}
            {renderPhaseConfig()}
            
            {form.watch('selectedPhase') && (
              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button
                  type="submit"
                  disabled={isConfiguring}
                  className="min-w-[120px]"
                >
                  {isConfiguring ? 'Configuring...' : 'Configure Phase'}
                </Button>
                <Button
                  type="button"
                  onClick={onStart}
                  disabled={isStarting}
                  className="min-w-[120px]"
                  variant="secondary"
                >
                  {isStarting ? 'Starting...' : 'Start Phase'}
                </Button>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default CampaignPhaseManager;
