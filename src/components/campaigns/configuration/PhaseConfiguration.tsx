import React, { useMemo } from 'react';
import { Control, useWatch } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { DNSValidationConfig } from './DNSValidationConfig';
import { HTTPKeywordValidationConfig } from './HTTPKeywordValidationConfig';
import { AnalysisConfig } from './AnalysisConfig';
import { DomainGenerationConfig } from './DomainGenerationConfig';

interface PhaseConfigurationProps {
  control: Control<any>;
  campaignStatus?: {
    hasGeneratedDomains: boolean;
    hasDNSValidation: boolean;
    hasHTTPValidation: boolean;
    completedPhases: string[];
  };
  disabled?: boolean;
}

const PHASE_ORDER = [
  { id: 'domain_generation', name: 'Domain Generation', isFoundation: true },
  { id: 'dns_validation', name: 'DNS Validation', isFoundation: false },
  { id: 'http_keyword_validation', name: 'HTTP Keyword Validation', isFoundation: false },
  { id: 'analysis', name: 'Analysis', isFoundation: false }
];

export const PhaseConfiguration: React.FC<PhaseConfigurationProps> = ({
  control,
  campaignStatus = {
    hasGeneratedDomains: false,
    hasDNSValidation: false,
    hasHTTPValidation: false,
    completedPhases: []
  },
  disabled = false
}) => {
  const selectedPhase = useWatch({
    control,
    name: 'selectedPhase'
  });

  // Calculate available phases based on campaign progress
  const availablePhases = useMemo(() => {
    const phases = [...PHASE_ORDER];
    
    return phases.map(phase => {
      let isAvailable = true;
      let isCompleted = campaignStatus.completedPhases.includes(phase.id);
      let canRerun = !phase.isFoundation; // Foundation phase (domain generation) can't be rerun
      let disabledReason = '';

      // Phase availability logic
      switch (phase.id) {
        case 'domain_generation':
          if (campaignStatus.hasGeneratedDomains) {
            isAvailable = false;
            disabledReason = 'Domain generation has already been completed for this campaign';
          }
          break;
        
        case 'dns_validation':
          if (!campaignStatus.hasGeneratedDomains) {
            isAvailable = false;
            disabledReason = 'Requires domain generation to be completed first';
          }
          break;
        
        case 'http_keyword_validation':
          if (!campaignStatus.hasGeneratedDomains) {
            isAvailable = false;
            disabledReason = 'Requires domain generation to be completed first';
          } else if (!campaignStatus.hasDNSValidation) {
            disabledReason = 'DNS validation recommended before HTTP validation';
          }
          break;
        
        case 'analysis':
          if (!campaignStatus.hasGeneratedDomains) {
            isAvailable = false;
            disabledReason = 'Requires domain generation to be completed first';
          } else if (!campaignStatus.hasDNSValidation && !campaignStatus.hasHTTPValidation) {
            disabledReason = 'Requires at least DNS or HTTP validation data';
          }
          break;
      }

      return {
        ...phase,
        isAvailable,
        isCompleted,
        canRerun,
        disabledReason
      };
    });
  }, [campaignStatus]);

  const selectedPhaseData = availablePhases.find(p => p.id === selectedPhase);

  const getPhaseIcon = (phase: any) => {
    if (!phase.isAvailable) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    if (phase.isCompleted && phase.canRerun) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (phase.isCompleted && !phase.canRerun) {
      return <CheckCircle className="h-4 w-4 text-gray-500" />;
    }
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  const getPhaseVariant = (phase: any) => {
    if (!phase.isAvailable) return "destructive";
    if (phase.isCompleted && phase.canRerun) return "default";
    if (phase.isCompleted && !phase.canRerun) return "secondary";
    return "outline";
  };

  const renderPhaseConfiguration = () => {
    if (!selectedPhase) return null;

    switch (selectedPhase) {
      case 'domain_generation':
        return <DomainGenerationConfig control={control} disabled={disabled} />;
      case 'dns_validation':
        return <DNSValidationConfig control={control} disabled={disabled} />;
      case 'http_keyword_validation':
        return <HTTPKeywordValidationConfig control={control} disabled={disabled} />;
      case 'analysis':
        return <AnalysisConfig control={control} disabled={disabled} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Phase Configuration</h2>
        <p className="text-sm text-gray-700">
          Configure and execute campaign phases in the correct order for optimal results
        </p>
      </div>

      {/* Phase Selection */}
      <div className="space-y-4">
        <FormField
          control={control}
          name="selectedPhase"
          rules={{ required: "Please select a phase to configure" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-semibold">Select Phase to Configure</FormLabel>
              <FormControl>
                <Select 
                  value={field.value} 
                  onValueChange={field.onChange}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-auto">
                    <SelectValue placeholder="Choose a campaign phase..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePhases.map((phase) => (
                      <SelectItem 
                        key={phase.id} 
                        value={phase.id}
                        disabled={!phase.isAvailable}
                        className="py-3"
                      >
                        <div className="flex items-center gap-3 w-full">
                          {getPhaseIcon(phase)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{phase.name}</span>
                              <Badge variant={getPhaseVariant(phase)} className="text-xs">
                                {phase.isFoundation ? 'Foundation' : 
                                 phase.isCompleted && phase.canRerun ? 'Can Rerun' :
                                 phase.isCompleted ? 'Complete' : 'Available'}
                              </Badge>
                            </div>
                            {phase.disabledReason && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {phase.disabledReason}
                              </p>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Phase Status Alert */}
        {selectedPhaseData && (
          <Alert className={
            selectedPhaseData.isCompleted && !selectedPhaseData.canRerun 
              ? "border-amber-200 bg-amber-50" 
              : selectedPhaseData.isCompleted 
                ? "border-green-200 bg-green-50"
                : "border-blue-200 bg-blue-50"
          }>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {selectedPhaseData.isCompleted && !selectedPhaseData.canRerun && (
                <span className="text-amber-800">
                  <strong>Foundation Phase:</strong> This phase has been completed and cannot be run again. 
                  Domain generation forms the foundation for all subsequent validation phases.
                </span>
              )}
              {selectedPhaseData.isCompleted && selectedPhaseData.canRerun && (
                <span className="text-green-800">
                  <strong>Re-executable Phase:</strong> This phase has been completed but can be run again 
                  with different configurations to gather additional data or insights.
                </span>
              )}
              {!selectedPhaseData.isCompleted && (
                <span className="text-blue-800">
                  <strong>Ready to Execute:</strong> This phase is ready to be configured and executed. 
                  All prerequisites have been met.
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Phase-Specific Configuration */}
      {selectedPhase && (
        <div className="border rounded-lg p-6 bg-white">
          {renderPhaseConfiguration()}
        </div>
      )}
    </div>
  );
};
