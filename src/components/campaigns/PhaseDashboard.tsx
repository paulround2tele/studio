"use client";

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { sessionWebSocketClient } from '@/lib/websocket/client';
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
import type { LeadGenerationCampaignResponse } from '@/lib/api-client/models/lead-generation-campaign-response';
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
  campaign?: LeadGenerationCampaignResponse;
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

export default function PhaseDashboard({ campaignId, campaign, onCampaignUpdate }: PhaseDashboardProps) {
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

    // Create WebSocket handlers
    const wsHandlers = createValidatedWebSocketHandlers({
      onPhaseStateChanged: handlePhaseStateChanged,
      onPhaseConfigurationRequired: handlePhaseConfigurationRequired,
      onCampaignProgress: (message) => {
        if (message.data.campaignId === campaignId) {
          // Refresh phase statuses on progress updates
          loadPhaseStatuses();
        }
      },
      onCampaignStatus: (message) => {
        if (message.data.campaignId === campaignId) {
          // Refresh phase statuses on status changes
          loadPhaseStatuses();
          onCampaignUpdate?.();
        }
      }
    });

    // Subscribe to WebSocket messages
    const unsubscribeMessage = sessionWebSocketClient.on('message', (event: any) => {
      if (event && typeof event === 'object' && event.type && event.data) {
        // Route the message to appropriate handlers
        if (event.type === 'phase.state.changed') {
          handlePhaseStateChanged(event as PhaseStateChangedMessage);
        } else if (event.type === 'phase.configuration.required') {
          handlePhaseConfigurationRequired(event as PhaseConfigurationRequiredMessage);
        } else if (event.type === 'campaign_progress') {
          wsHandlers.onCampaignProgress?.(event);
        } else if (event.type === 'campaign_status') {
          wsHandlers.onCampaignStatus?.(event);
        }
      }
    });

    // Connect to WebSocket if not already connected
    if (!sessionWebSocketClient.isConnected()) {
      sessionWebSocketClient.connect().catch(error => {
        console.error('Failed to connect to WebSocket:', error);
      });
    }

    // Subscribe to campaign-specific topics
    sessionWebSocketClient.subscribe(`campaign.${campaignId}`);

    // Cleanup function
    return () => {
      unsubscribeMessage();
      sessionWebSocketClient.unsubscribe(`campaign.${campaignId}`);
    };
  }, [campaignId, campaign, toast, onCampaignUpdate]);

  // Helper functions to determine phase completion based on available data
  const isPhaseCompleted = (phaseKey: string): boolean => {
    if (!campaign) return false;
    
    switch (phaseKey) {
      case 'domain_generation':
        return !!(campaign.domainsData && Object.keys(campaign.domainsData).length > 0);
      case 'dns_validation':
        return !!(campaign.dnsResults && Object.keys(campaign.dnsResults).length > 0);
      case 'http_keyword_validation':
        return !!(campaign.httpResults && Object.keys(campaign.httpResults).length > 0);
      case 'analysis':
        return !!(campaign.analysisResults && Object.keys(campaign.analysisResults).length > 0);
      default:
        return false;
    }
  };

  const getCompletedPhaseCount = (): number => {
    if (!campaign) return 0;
    
    let count = 0;
    if (isPhaseCompleted('domain_generation')) count++;
    if (isPhaseCompleted('dns_validation')) count++;
    if (isPhaseCompleted('http_keyword_validation')) count++;
    if (isPhaseCompleted('analysis')) count++;
    return count;
  };

  const loadPhaseStatuses = async () => {
    try {
      setLoading(true);
      
      // Initialize phase statuses based on campaign data and logic
      const statuses: Record<string, PhaseStatus> = {};
      
      // Phase 1: Domain Generation
      const phase1Complete = isPhaseCompleted('domain_generation');
      statuses.domain_generation = {
        phase: 'domain_generation',
        status: campaign?.currentPhase === 'domain_generation' ? 'running' :
               phase1Complete ? 'completed' : 'ready',
        progress: campaign?.currentPhase === 'domain_generation' ? 50 :
                 phase1Complete ? 100 : 0,
        canConfigure: false, // Domain generation configured during campaign creation
        canStart: campaign?.currentPhase !== 'domain_generation' && !phase1Complete,
        configurationRequired: false
      };

      // Phase 2: DNS Validation
      const phase2Complete = isPhaseCompleted('dns_validation');
      statuses.dns_validation = {
        phase: 'dns_validation',
        status: campaign?.currentPhase === 'dns_validation' ? 'running' :
               phase2Complete ? 'completed' :
               phase1Complete ? 'ready' : 'pending',
        progress: campaign?.currentPhase === 'dns_validation' ? 50 :
                 phase2Complete ? 100 : 0,
        canConfigure: phase1Complete,
        canStart: false, // Will be enabled after configuration
        configurationRequired: true
      };

      // Phase 3: HTTP Validation
      const phase3Complete = isPhaseCompleted('http_keyword_validation');
      statuses.http_keyword_validation = {
        phase: 'http_keyword_validation',
        status: campaign?.currentPhase === 'http_keyword_validation' ? 'running' :
               phase3Complete ? 'completed' :
               phase2Complete ? 'ready' : 'pending',
        progress: campaign?.currentPhase === 'http_keyword_validation' ? 50 :
                 phase3Complete ? 100 : 0,
        canConfigure: phase2Complete,
        canStart: false, // Will be enabled after configuration
        configurationRequired: true
      };

      // Phase 4: Analysis
      const phase4Complete = isPhaseCompleted('analysis');
      statuses.analysis = {
        phase: 'analysis',
        status: campaign?.currentPhase === 'analysis' ? 'running' :
               phase4Complete ? 'completed' :
               phase3Complete ? 'ready' : 'pending',
        progress: campaign?.currentPhase === 'analysis' ? 50 :
                 phase4Complete ? 100 : 0,
        canConfigure: phase3Complete,
        canStart: false, // Will be enabled after configuration
        configurationRequired: true
      };

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
      
      // Use the start phase endpoint from our API
      await campaignsApi.startPhaseStandalone(campaignId, phaseKey);
      
      toast({
        title: "Phase started",
        description: `${PHASES.find(p => p.key === phaseKey)?.name} phase has been started.`,
      });

      // Refresh phase statuses and campaign data
      loadPhaseStatuses();
      onCampaignUpdate?.();
    } catch (error) {
      console.error('Failed to start phase:', error);
      toast({
        title: "Failed to start phase",
        description: "Please ensure the phase is properly configured before starting.",
        variant: "destructive",
      });
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
      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Campaign Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">
                {getCompletedPhaseCount()} of 4 phases completed
              </span>
            </div>
            <Progress value={(getCompletedPhaseCount() / 4) * 100} />
          </div>
        </CardContent>
      </Card>

      {/* User-Driven Phase Lifecycle Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>User-Driven Phase Lifecycle:</strong> Configure and start each phase when you're ready. 
          Each phase must be completed before the next one becomes available.
        </AlertDescription>
      </Alert>

      {/* Phase Cards */}
      <div className="grid gap-4">
        {PHASES.map((phase, index) => {
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