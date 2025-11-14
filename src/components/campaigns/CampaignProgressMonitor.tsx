"use client";

import React, { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, Clock, Pause } from 'lucide-react';
import type { CampaignResponse as Campaign } from '@/lib/api-client/models';
type CampaignCurrentPhaseEnum = 'discovery' | 'validation' | 'extraction' | 'analysis' | 'enrichment';
type CampaignPhaseStatusEnum = 'not_started' | 'configured' | 'running' | 'paused' | 'completed' | 'failed';
import { normalizeStatus, getStatusColor } from '@/lib/utils/statusMapping';
import { normalizeToApiPhase } from '@/lib/utils/phaseNames';
import { getPhaseDisplayName as getCanonicalPhaseDisplayName } from '@/lib/utils/phaseMapping';

// Helper function to ensure valid badge variants
function getValidBadgeVariant(color: string): "default" | "secondary" | "destructive" | "outline" {
  const validVariants = ["default", "secondary", "destructive", "outline"] as const;
  type ValidVariant = typeof validVariants[number];
  return validVariants.includes(color as ValidVariant) ? color as ValidVariant : "default";
}

interface CampaignProgressMonitorProps {
  campaign: Campaign;
  onCampaignUpdate?: (updatedCampaign: Partial<Campaign>) => void;
  onDomainReceived?: (domain: string) => void;
}

// PhaseInfo reserved for future use

interface ProgressInfo {
  phase: CampaignCurrentPhaseEnum;
  status: CampaignPhaseStatusEnum;
  progress: number;
  icon: React.ReactNode;
  statusColor: string;
  normalizedStatus: string;
}

/**
 * Campaign Progress Monitor Component
 * 
 * Displays campaign progress and phase information.
 * Realtime via SSE: Server-Sent Events will power real-time updates (WebSocket removed).
 */
const CampaignProgressMonitor = memo(({
  campaign,
  onCampaignUpdate: _onCampaignUpdate,
  onDomainReceived: _onDomainReceived
}: CampaignProgressMonitorProps): React.ReactElement => {
  
  // Campaign key for tracking
  const campaignKey = useMemo(() => ({
    id: campaign?.id || '',
    currentPhase: (campaign?.currentPhase || 'discovery') as CampaignCurrentPhaseEnum,
    status: (campaign?.status || 'draft') as CampaignPhaseStatusEnum,
  }), [campaign?.id, campaign?.currentPhase, campaign?.status]);

  // Progress calculation logic
  const progressInfo = useMemo((): ProgressInfo => {
  const phase = campaignKey.currentPhase as CampaignCurrentPhaseEnum;
  const status = campaignKey.status as CampaignPhaseStatusEnum;
  const progress = campaign?.progress?.percentComplete || 0;
    
    const normalizedStatus = normalizeStatus(status);
    const statusColor = getStatusColor(normalizedStatus);
    
    // Status icons
    let icon: React.ReactNode;
    switch (normalizedStatus as 'completed' | 'failed' | 'in_progress' | 'paused' | 'draft' | 'running' | 'cancelled') {
      case 'completed':
        icon = <CheckCircle className="h-4 w-4" />;
        break;
      case 'failed':
        icon = <AlertCircle className="h-4 w-4" />;
        break;
      case 'in_progress':
        icon = <Clock className="h-4 w-4" />;
        break;
      case 'paused':
        icon = <Pause className="h-4 w-4" />;
        break;
      default:
        icon = <Clock className="h-4 w-4" />;
    }

    return {
      phase,
      status,
      progress,
      normalizedStatus,
      statusColor,
      icon
    };
  }, [campaignKey.currentPhase, campaignKey.status, campaign?.progress?.percentComplete]);

  // Phase display names
  const getPhaseDisplayName = (phase: CampaignCurrentPhaseEnum): string => {
    const normalized = normalizeToApiPhase(phase.toLowerCase());
    return normalized ? getCanonicalPhaseDisplayName(normalized) : String(phase);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          Campaign Progress
          <div className="flex items-center gap-2">
            {/* Connection status indicator - shows polling mode during RTK consolidation */}
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs text-muted-foreground">
              Polling
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Phase */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {progressInfo.icon}
            <span className="font-medium">
              {getPhaseDisplayName(progressInfo.phase)}
            </span>
          </div>
          <Badge 
            variant={getValidBadgeVariant(progressInfo.statusColor)}
            className="text-xs"
          >
            {progressInfo.normalizedStatus}
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progressInfo.progress.toFixed(1)}%</span>
          </div>
          <Progress 
            value={progressInfo.progress} 
            className="h-2"
          />
        </div>

        {/* Campaign Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Campaign ID</span>
            <p className="font-mono text-xs">{campaignKey.id.slice(-8)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Status</span>
            <p className="font-medium">{progressInfo.status}</p>
          </div>
        </div>

        {/* Real-time Notice */}
        <div className="text-xs text-muted-foreground border-t pt-3">
          📡 Real-time updates via Server-Sent Events coming soon.
          <br />
          Currently using periodic refresh for progress updates.
        </div>
      </CardContent>
    </Card>
  );
});

CampaignProgressMonitor.displayName = 'CampaignProgressMonitor';

export default CampaignProgressMonitor;
