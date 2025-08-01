"use client";

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { websocketService } from '@/lib/services/websocketService.simple';
import { createValidatedWebSocketHandlers } from '@/lib/websocket/message-handlers';
import type { PhaseStateChangedMessage, PhaseConfigurationRequiredMessage } from '@/lib/websocket/message-handlers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  Clock, 
  Settings, 
  Play, 
  AlertCircle, 
  Loader2,
  ChevronRight,
  Info
} from 'lucide-react';

// Import the phase configuration modals
import DNSValidationConfigModal from './modals/DNSValidationConfigModal';
import HTTPValidationConfigModal from './modals/HTTPValidationConfigModal';
import AnalysisConfigModal from './modals/AnalysisConfigModal';

// Import types and services
import { campaignsApi } from '@/lib/api-client/client';
import type { CampaignViewModel } from '@/lib/types';
import type { PhaseStartRequest } from '@/lib/api-client/models/phase-start-request';

interface PhaseStatus {
  phase: string;
  status: 'pending' | 'ready' | 'configured' | 'running' | 'completed' | 'failed';
  progress?: number;
  canConfigure: boolean;
  canStart: boolean;
  configurationRequired: boolean;
}

interface PhaseDashboardProps {
  campaignId: string;
  campaign?: CampaignViewModel;
  totalDomains?: number;
  onCampaignUpdate?: () => void;
}

// Phase definitions following the User-Driven Phase Lifecycle plan
const PHASES = [
  {
    key: 'domain_generation',
    name: 'Domain Generation',
    description: 'Generate domain names using configured patterns',
    order: 1
  },
  {
    key: 'dns_validation',
    name: 'DNS Validation',
    description: 'Validate generated domains using DNS queries',
    order: 2
  },
  {
    key: 'http_keyword_validation',
    name: 'HTTP Validation',
    description: 'Perform HTTP keyword validation on valid domains',
    order: 3
  },
  {
    key: 'analysis',
    name: 'Analysis',
    description: 'Analyze results and generate final reports',
    order: 4
  }
];

export default function PhaseDashboard({ campaignId, campaign, totalDomains = 0, onCampaignUpdate }: PhaseDashboardProps) {
  const { toast } = useToast();
  
  // Modal states
  const [showDNSModal, setShowDNSModal] = useState(false);
  const [showHTTPModal, setShowHTTPModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  
  // Phase status state
  const [phaseStatuses, setPhaseStatuses] = useState<Record<string, PhaseStatus>>({});
  const [loading, setLoading] = useState(true);
  const [startingPhase, setStartingPhase] = useState<string | null>(null);

  // Load phase status information and setup WebSocket handlers
  useEffect(() => {
    loadPhaseStatuses();

    // Setup WebSocket handlers for real-time phase updates
    const handlePhaseStateChanged = (message: PhaseStateChangedMessage) => {
      if (message.data.campaign_id === campaignId) {
        console.log(`Phase state changed: ${message.data.phase} from ${message.data.old_state} to ${message.data.new_state}`);
        
        // Refresh phase statuses when backend notifies of state changes
        loadPhaseStatuses();
        onCampaignUpdate?.();
        
        // Show user-friendly notification
        toast({
          title: "Phase Update",
          description: `${PHASES.find(p => p.key === message.data.phase)?.name || message.data.phase} is now ${message.data.new_state}`,
        });
      }
    };

    const handlePhaseConfigurationRequired = (message: PhaseConfigurationRequiredMessage) => {
      if (message.data.campaign_id === campaignId) {
        console.log(`Phase configuration required: ${message.data.phase} - ${message.data.message}`);
        
        // Refresh phase statuses
        loadPhaseStatuses();
        
        // Show configuration reminder to user
        toast({
          title: "Configuration Required",
          description: message.data.message,
          variant: "default",
        });
      }
    };

    // Handle campaign progress updates for real-time phase status updates
    const handleCampaignProgress = (message: any) => {
      if (message.data?.campaignId === campaignId || message.data?.campaign_id === campaignId) {
        console.log(`Campaign progress update: phase=${message.data.currentPhase}, status=${message.data.phaseStatus}, progress=${message.data.progressPercent}`);
        
        // Refresh phase statuses when progress updates come in
        loadPhaseStatuses();
        onCampaignUpdate?.();
      }
    };

    // 🚀 WEBSOCKET PUSH MODEL: Specialized phase management handlers
    // Campaign progress now handled at data layer, keep phase-specific handlers
    const wsHandlers = createValidatedWebSocketHandlers({
      onPhaseStateChanged: handlePhaseStateChanged,
      onPhaseConfigurationRequired: handlePhaseConfigurationRequired,
      onCampaignProgress: handleCampaignProgress, // Added back for real-time phase updates
      // Removed onCampaignStatus - now handled at data layer
    });

    // 🚀 FIXED: Use correct WebSocket service with proper backend protocol
    const unsubscribeFromWebSocket = websocketService.connect(`campaign-${campaignId}`, {
      onMessage: (message: any) => {
        if (message && typeof message === 'object' && message.type) {
          console.log(`🔍 [PhaseDashboard] Received WebSocket message type: ${message.type}`, message);
          
          // Route phase-specific messages
          if (message.type === 'phase.state.changed') {
            handlePhaseStateChanged(message as PhaseStateChangedMessage);
          } else if (message.type === 'phase.configuration.required') {
            handlePhaseConfigurationRequired(message as PhaseConfigurationRequiredMessage);
          } else if (message.type === 'campaign_progress') {
            // Handle campaign progress messages for real-time updates
            handleCampaignProgress(message);
          } else {
            console.log(`🔍 [PhaseDashboard] Unhandled message type: ${message.type}`);
          }
        }
      },
      onOpen: () => {
        console.log(`✅ [PhaseDashboard] Connected to WebSocket for campaign ${campaignId}`);
      },
      onError: (error) => {
        console.error(`❌ [PhaseDashboard] WebSocket error for campaign ${campaignId}:`, error);
        console.log('❌ [PhaseDashboard]  trying to display generated domains and phases data as table', campaign);
      },
      onClose: () => {
        console.log(`🔌 [PhaseDashboard] Disconnected from WebSocket for campaign ${campaignId}`);
      }
    });

    // Cleanup function
    return unsubscribeFromWebSocket;
  }, [campaignId]); // 🚨 CRITICAL FIX: Remove campaign from dependencies to prevent WebSocket reconnection on updates

  // Helper functions to determine phase completion based on available data
  const isPhaseCompleted = (phaseKey: string): boolean => {
    if (!campaign) return false;
    
    // For domain generation phase, check if domains were generated
    if (phaseKey === 'domain_generation' && totalDomains && totalDomains > 0) {
      return true;
    }
    
    // Check campaign phases data
    if (campaign.phases) {
      const phase = campaign.phases.find(p => p.phaseType === phaseKey);
      if (phase) {
        return !!(phase.status === 'completed' || (phase.successfulItems && phase.successfulItems > 0));
      }
    }
    
    return false;
  };

  const getCompletedPhaseCount = (): number => {
    if (!campaign) return 0;
    
    let completed = 0;
    const phaseOrder = ['domain_generation', 'dns_validation', 'http_keyword_validation', 'analysis'];
    
    for (const phaseKey of phaseOrder) {
      if (isPhaseCompleted(phaseKey)) {
        completed++;
      }
    }
    
    return completed;
  };

  const loadPhaseStatuses = async () => {
    try {
      setLoading(true);
      
      // Initialize phase statuses based on campaign phase data
      const statuses: Record<string, PhaseStatus> = {};
      
      // Define the expected phase order
      const phaseOrder: string[] = ['domain_generation', 'dns_validation', 'http_keyword_validation', 'analysis'];
      
      for (let i = 0; i < phaseOrder.length; i++) {
        const phaseType = phaseOrder[i]!; // Safe because we're within array bounds
        const phaseData = campaign?.phases?.find(p => p.phaseType === phaseType);
        const previousPhaseType = i > 0 ? phaseOrder[i - 1]! : null;
        const previousPhaseComplete = i === 0 || Boolean(previousPhaseType && isPhaseCompleted(previousPhaseType));
        
        // Determine phase status more accurately
        let phaseStatus: 'pending' | 'ready' | 'configured' | 'running' | 'completed' | 'failed' = 'pending';
        let progress = 0;
        let canConfigure = false;
        let canStart = false;
        let configurationRequired = phaseType !== 'domain_generation'; // Domain gen configured at creation
        
        // Check if this phase is completed based on actual data
        if (isPhaseCompleted(phaseType)) {
          phaseStatus = 'completed';
          progress = 100;
        } else if (phaseData) {
          // Use backend phase data if available
          switch (phaseData.status) {
            case 'completed':
              phaseStatus = 'completed';
              progress = 100;
              break;
            case 'in_progress':
              phaseStatus = 'running';
              progress = phaseData.progressPercentage || 50; // Use actual progress or fallback
              break;
            case 'failed':
              phaseStatus = 'failed';
              progress = 0;
              break;
            case 'ready':
              phaseStatus = 'ready';
              canConfigure = configurationRequired;
              canStart = !configurationRequired;
              progress = 0;
              break;
            case 'configured':
              phaseStatus = 'configured';
              canStart = true;
              progress = 0;
              break;
            default:
              phaseStatus = previousPhaseComplete ? 'ready' : 'pending';
              progress = 0;
          }
        } else {
          // No phase data available, determine from campaign state and prerequisites
          if (campaign?.currentPhase === phaseType) {
            // CRITICAL FIX: Check campaign.phaseStatus to determine if this phase is actually running
            const campaignPhaseStatus = campaign?.phaseStatus;
            
            if (campaignPhaseStatus === 'failed') {
              phaseStatus = 'failed';
              progress = 0;
              canStart = true; // Allow retry
            } else if (campaignPhaseStatus === 'ready') {
              phaseStatus = 'ready';
              canConfigure = configurationRequired;
              canStart = !configurationRequired;
              progress = 0;
            } else if (campaignPhaseStatus === 'in_progress') {
              phaseStatus = 'running';
              progress = campaign?.overallProgress ?? 0;
            } else {
              // For domain generation, if domains exist, it should be completed
              if (phaseType === 'domain_generation' && totalDomains && totalDomains > 0) {
                phaseStatus = 'completed';
                progress = 100;
              } else {
                phaseStatus = 'running';
                progress = campaign?.overallProgress ?? 0;
              }
            }
          } else if (previousPhaseComplete) {
            phaseStatus = 'ready';
            canConfigure = configurationRequired;
            canStart = !configurationRequired;
            progress = 0;
          } else {
            phaseStatus = 'pending';
            progress = 0;
          }
        }
        
        // Configure action availability based on campaign mode
        const isFullSequenceMode = campaign?.fullSequenceMode === true;
        
        if (phaseType === 'domain_generation') {
          // Domain generation is auto-started at campaign creation in BOTH modes
          canConfigure = false; // Configured during campaign creation
          canStart = false; // ❌ FIX: Never show start button - auto-started by backend
          configurationRequired = false;
        } else if (isFullSequenceMode) {
          // Full Auto Sequence Mode: All phases pre-configured during campaign creation
          canConfigure = false; // No runtime configuration - all done upfront during campaign setup
          canStart = false; // No manual start - backend auto-transitions through pre-configured phases
          configurationRequired = false; // Already configured during campaign setup
        } else {
          // Step-by-Step Mode: Runtime configure → start workflow
          if (phaseType === 'dns_validation') {
            canConfigure = previousPhaseComplete && (phaseStatus === 'pending' || phaseStatus === 'ready');
            canStart = previousPhaseComplete && phaseStatus === 'ready';
            configurationRequired = true; // Choose DNS personas at runtime
          } else if (phaseType === 'http_keyword_validation') {
            canConfigure = previousPhaseComplete && (phaseStatus === 'pending' || phaseStatus === 'ready');
            canStart = previousPhaseComplete && phaseStatus === 'ready';
            configurationRequired = true; // Choose HTTP personas + keywords at runtime
          } else if (phaseType === 'analysis') {
            canConfigure = previousPhaseComplete && (phaseStatus === 'pending' || phaseStatus === 'ready');
            canStart = previousPhaseComplete && phaseStatus === 'ready';
            configurationRequired = false; // Minimal config at runtime
          } else {
            // Fallback for any other phases
            canConfigure = previousPhaseComplete && phaseStatus !== 'completed';
            canStart = phaseStatus === 'ready';
          }
        }
        
        statuses[phaseType] = {
          phase: phaseType,
          status: phaseStatus,
          progress,
          canConfigure,
          canStart,
          configurationRequired
        };
      }

      setPhaseStatuses(statuses);
    } catch (error) {
      console.error('Failed to load phase statuses:', error);
      toast({
        title: "Error loading phase status",
        description: "Failed to load phase status information.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartPhase = async (phaseKey: string) => {
    try {
      setStartingPhase(phaseKey);
      
      // Use autonomous phase execution - backend determines the correct phase based on campaign state
      // The phaseKey parameter is maintained for UI consistency but backend ignores it
      await campaignsApi.startPhaseStandalone(campaignId, phaseKey);
      
      toast({
        title: "Phase started",
        description: "Next phase has been started autonomously based on campaign state.",
      });

      // Refresh phase statuses and campaign data
      loadPhaseStatuses();
      onCampaignUpdate?.();
    } catch (error) {
      console.error('Failed to start phase:', error);
      toast({
        title: "Failed to start phase",
        description: "Please ensure the campaign is properly configured before starting.",
        variant: "destructive",
      });
      
      // CRITICAL FIX: Refresh phase statuses after error to reflect any backend state changes
      // This ensures the UI shows the correct retry state even if backend reset the phase status
      loadPhaseStatuses();
      onCampaignUpdate?.();
    } finally {
      setStartingPhase(null);
    }
  };

  const handlePhaseConfigured = () => {
    // Refresh phase statuses after configuration
    loadPhaseStatuses();
    onCampaignUpdate?.();
  };

  const getStatusBadge = (status: PhaseStatus['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>;
      case 'ready':
        return <Badge variant="outline" className="flex items-center gap-1">
          <Settings className="h-3 w-3" />
          Ready
        </Badge>;
      case 'configured':
        return <Badge variant="default" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Configured
        </Badge>;
      case 'running':
        return <Badge variant="default" className="flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Running
        </Badge>;
      case 'completed':
        return <Badge variant="default" className="flex items-center gap-1 bg-green-600">
          <CheckCircle className="h-3 w-3" />
          Completed
        </Badge>;
      case 'failed':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Failed
        </Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getPhaseActions = (phase: typeof PHASES[0], status: PhaseStatus) => {
    const actions = [];

    // Configure button
    if (status.canConfigure && status.status !== 'completed') {
      actions.push(
        <Button
          key="configure"
          variant="outline"
          size="sm"
          onClick={() => {
            if (phase.key === 'dns_validation') setShowDNSModal(true);
            else if (phase.key === 'http_keyword_validation') setShowHTTPModal(true);
            else if (phase.key === 'analysis') setShowAnalysisModal(true);
          }}
        >
          <Settings className="h-4 w-4 mr-1" />
          Configure
        </Button>
      );
    }

    // Start button
    if (status.canStart && status.status !== 'running' && status.status !== 'completed') {
      actions.push(
        <Button
          key="start"
          size="sm"
          onClick={() => handleStartPhase(phase.key)}
          disabled={startingPhase === phase.key}
        >
          {startingPhase === phase.key ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-1" />
          )}
          Start
        </Button>
      );
    }

    return actions;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading phase information...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Phase Cards - Progressive Display */}
      <div className="grid gap-4">
        {PHASES.filter((phase, index) => {
          const status = phaseStatuses[phase.key];
          if (!status) return false;

          // Hide completed domain generation phase since progress is shown in header
          if (phase.key === 'domain_generation' && status.status === 'completed') {
            return false;
          }

          // Show phases progressively based on campaign state
          // Always show domain generation (first phase) if not completed
          if (index === 0) return true;

          // Show subsequent phases only if previous phase is completed or if current phase is active
          const previousPhase = PHASES[index - 1];
          const previousStatus = previousPhase ? phaseStatuses[previousPhase.key] : null;
          
          return previousStatus?.status === 'completed' || 
                 status.status === 'running' || 
                 status.status === 'completed';
        }).map((phase, index) => {
          const status = phaseStatuses[phase.key];
          if (!status) return null;

          return (
            <Card key={phase.key} className={status.status === 'running' ? 'border-primary' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-medium">
                      {phase.order}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{phase.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{phase.description}</p>
                    </div>
                  </div>
                  {getStatusBadge(status.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Progress Bar */}
                  {status.status === 'running' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Progress</span>
                        <span className="text-sm text-muted-foreground">{status.progress?.toFixed(1)}%</span>
                      </div>
                      <Progress value={status.progress} />
                    </div>
                  )}

                  {/* Configuration Required Alert */}
                  {status.configurationRequired && status.status === 'ready' && (
                    <Alert>
                      <Settings className="h-4 w-4" />
                      <AlertDescription>
                        This phase requires configuration before it can be started.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {getPhaseActions(phase, status)}
                  </div>

                  {/* Phase Connection Arrow */}
                  {index < PHASES.length - 1 && (
                    <div className="flex justify-center pt-2">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Configuration Modals */}
      <DNSValidationConfigModal
        isOpen={showDNSModal}
        onClose={() => setShowDNSModal(false)}
        campaignId={campaignId}
        onConfigured={handlePhaseConfigured}
      />

      <HTTPValidationConfigModal
        isOpen={showHTTPModal}
        onClose={() => setShowHTTPModal(false)}
        campaignId={campaignId}
        onConfigured={handlePhaseConfigured}
      />

      <AnalysisConfigModal
        isOpen={showAnalysisModal}
        onClose={() => setShowAnalysisModal(false)}
        campaignId={campaignId}
        onConfigured={handlePhaseConfigured}
      />
    </div>
  );
}