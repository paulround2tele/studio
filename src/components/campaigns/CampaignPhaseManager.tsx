import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useConfigurePhaseStandaloneMutation, useStartPhaseStandaloneMutation } from '@/store/api/campaignApi';
import type { 
  PhaseConfigureRequest,
  DNSValidationPhaseConfig,
  HTTPKeywordValidationPhaseConfig,
  DomainGenerationPhaseConfig,
  AnalysisPhaseConfig,
  CampaignCurrentPhaseEnum
} from '@/lib/api-client/professional-types';

// Import the properly typed configuration components
import DNSValidationConfig from './configuration/DNSValidationConfig';
import HTTPKeywordValidationConfig from './configuration/HTTPKeywordValidationConfig';
import DomainGenerationConfig from './configuration/DomainGenerationConfig';
import AnalysisConfig from './configuration/AnalysisConfig';

interface CampaignPhaseManagerProps {
  campaignId: string;
}

// Form data for phase-centric campaign system
interface PhaseManagerFormData {
  selectedPhase: CampaignCurrentPhaseEnum;
  dnsValidationConfig?: DNSValidationPhaseConfig;
  httpKeywordValidationConfig?: HTTPKeywordValidationPhaseConfig;
  domainGenerationConfig?: DomainGenerationPhaseConfig;
  analysisConfig?: AnalysisPhaseConfig;
}

export const CampaignPhaseManager: React.FC<CampaignPhaseManagerProps> = ({ campaignId }) => {
  const { toast } = useToast();
  const [selectedPhase, setSelectedPhase] = useState<CampaignCurrentPhaseEnum | ''>('');
  
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
    let phaseType: 'dns_validation' | 'http_keyword_validation' | 'analysis';
    
    switch (data.selectedPhase) {
      case 'dns_validation':
        phaseConfig = data.dnsValidationConfig;
        phaseType = 'dns_validation';
        break;
      case 'http_keyword_validation':
        phaseConfig = data.httpKeywordValidationConfig;
        phaseType = 'http_keyword_validation';
        break;
      case 'analysis':
        phaseConfig = data.analysisConfig;
        phaseType = 'analysis';
        break;
      case 'generation':
      case 'setup':
        // These phases don't use the PhaseConfigureRequest - they might use different endpoints
        toast({
          title: "Info", 
          description: `${data.selectedPhase} phase uses a different configuration method`,
        });
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
      await configurePhase({
        campaignId,
        phase: data.selectedPhase,
        config: {
          phaseType,
          config: phaseConfig
        }
      }).unwrap();

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
      await startPhase({
        campaignId,
        phase: selectedPhase,
      }).unwrap();

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
      case 'dns_validation':
        return (
          <FormField
            control={form.control}
            name="dnsValidationConfig"
            render={({ field }) => (
              <DNSValidationConfig 
                control={form.control as any} 
                disabled={isConfiguring} 
              />
            )}
          />
        );
      case 'http_keyword_validation':
        return (
          <FormField
            control={form.control}
            name="httpKeywordValidationConfig"
            render={({ field }) => (
              <HTTPKeywordValidationConfig 
                control={form.control as any} 
                disabled={isConfiguring} 
              />
            )}
          />
        );
      case 'generation':
        return (
          <FormField
            control={form.control}
            name="domainGenerationConfig"
            render={({ field }) => (
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
            render={({ field }) => (
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
                      <SelectItem value="setup">Setup</SelectItem>
                      <SelectItem value="generation">Domain Generation</SelectItem>
                      <SelectItem value="dns_validation">DNS Validation</SelectItem>
                      <SelectItem value="http_keyword_validation">HTTP Keyword Validation</SelectItem>
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
