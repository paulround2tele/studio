// Campaign Header Component - Displays campaign title, status, and basic info
// Part of the modular architecture replacing the monolithic campaign details page

"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Briefcase, RefreshCw, CheckCircle, AlertCircle, Clock, Pause, Play, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CampaignResponse } from '@/lib/api-client/models';
import type { CampaignState } from '@/lib/api-client/models/campaign-state';
import type { PhaseExecution } from '@/lib/api-client/models/phase-execution';

export interface CampaignHeaderProps {
  campaign: CampaignResponse;
  loading?: boolean;
  onRefresh?: () => void;
  totalDomains?: number;
  className?: string;
  state?: CampaignState;
  phaseExecutions?: PhaseExecution[];
}

type PhaseStatus = 'not_started' | 'in_progress' | 'completed' | 'failed' | 'paused';
const getStatusIcon = (status: PhaseStatus) => {
  switch (status) {
    case 'completed': return CheckCircle;
    case 'failed': return AlertCircle;
    case 'in_progress': return Play;
    case 'paused': return Pause;
    case 'not_started': return Clock;
    default: return XCircle;
  }
};

const getStatusVariant = (status: PhaseStatus): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'completed': return 'default' as any;
    case 'failed': return 'destructive' as any;
    case 'in_progress': return 'secondary' as any;
    case 'paused': return 'outline' as any;
    case 'not_started': return 'outline' as any;
    default: return 'outline' as any;
  }
};

const getStatusDisplayText = (status: PhaseStatus): string => {
  switch (status) {
    case 'completed': return 'Completed';
    case 'failed': return 'Failed';
    case 'in_progress': return 'In Progress';
    case 'paused': return 'Paused';
    case 'not_started': return 'Not Started';
    default: return 'Unknown';
  }
};

const getPhaseDisplayName = (phase: string): string => {
  switch (phase) {
  case 'discovery': return 'Discovery';
  case 'validation': return 'Validation';
  case 'extraction': return 'Extraction';
  case 'analysis': return 'Analysis';
    default: return phase.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
};

const formatDate = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return 'Invalid Date';
  }
};

export const CampaignHeader: React.FC<CampaignHeaderProps> = ({
  campaign,
  loading = false,
  onRefresh,
  totalDomains = 0,
  className,
  state,
  phaseExecutions
}) => {
  const campaignPhase = campaign.currentPhase || 'discovery';
  const campaignStatus: PhaseStatus = (() => {
    switch (campaign.status) {
      case 'completed': return 'completed';
      case 'failed': return 'failed';
      case 'paused': return 'paused';
      case 'running': return 'in_progress';
      case 'draft':
      default: return 'not_started';
    }
  })();
  
  // Determine actual status based on data
  const actualStatus = totalDomains > 0 && campaignPhase === 'discovery' 
    ? 'completed' as const 
    : campaignStatus;
  
  const StatusIcon = getStatusIcon(actualStatus);
  const statusVariant = getStatusVariant(actualStatus);
  const statusText = getStatusDisplayText(actualStatus);
  const phaseDisplayName = getPhaseDisplayName(campaignPhase);

  return (
    <Card className={cn("shadow-lg border-0 bg-gradient-to-r from-background to-secondary/20", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">{campaign.name || 'Unnamed Campaign'}</CardTitle>
              <CardDescription className="text-base">
                Campaign in {phaseDisplayName} Phase
                {campaign.createdAt && (
                  <span className="ml-2 text-xs opacity-70">
                    Created {formatDate(campaign.createdAt)}
                  </span>
                )}
                {state?.currentState && (
                  <span className="ml-2 text-xs opacity-70">
                    • State: {state.currentState}
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant={statusVariant} className="flex items-center gap-1.5 px-3 py-1">
              <StatusIcon className="h-3.5 w-3.5" />
              {statusText}
            </Badge>
            
            {onRefresh && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={onRefresh} 
                disabled={loading}
                className="flex items-center gap-2 hover:bg-primary/5"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                Refresh
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm">
          <div className="space-y-1">
            <div className="text-muted-foreground font-medium">Campaign ID</div>
            <div className="font-mono text-xs break-all bg-secondary/50 p-2 rounded">{campaign.id}</div>
          </div>
          
          <div className="space-y-1">
            <div className="text-muted-foreground font-medium">Current Phase</div>
            <div className="font-semibold text-base">{phaseDisplayName}</div>
          </div>
          
          <div className="space-y-1">
            <div className="text-muted-foreground font-medium">Generated Domains</div>
            <div className="font-bold text-2xl text-primary">
              {totalDomains.toLocaleString()}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-muted-foreground font-medium">Phase Progress</div>
            <div className="font-semibold text-base">
              {/* Calculate accurate progress based on actual data */}
              {typeof campaign.progress?.percentComplete === 'number' 
                ? `${Math.round(campaign.progress.percentComplete)}%`
                : <span className="text-muted-foreground">Initializing</span>}
            </div>
          </div>
        </div>
        
        {/* Real-time Status Bar */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between mb-3">
            <span className="text-base font-semibold">Overall Campaign Progress</span>
      <span className="text-sm text-muted-foreground font-medium">{`${Math.round(campaign.progress?.percentComplete || 0)}%`}</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-primary to-primary/80 h-3 rounded-full transition-all duration-500 ease-in-out" 
              style={{ 
        width: `${Math.max(0, Math.min(100, campaign.progress?.percentComplete || 0))}%`
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span className={cn("transition-colors", totalDomains > 0 ? 'text-primary font-semibold' : '')}>
              Domain Generation
            </span>
            <span>DNS Validation</span>
            <span>HTTP Validation</span>
            <span>Analysis</span>
          </div>
        </div>
        
  {/* Note: Campaign description not available in current schema */}
      </CardContent>
    </Card>
  );
};

export default CampaignHeader;