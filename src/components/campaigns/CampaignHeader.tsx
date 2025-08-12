// Campaign Header Component - Displays campaign title, status, and basic info
// Part of the modular architecture replacing the monolithic campaign details page

"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Briefcase, RefreshCw, CheckCircle, AlertCircle, Clock, Pause, Play, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CampaignViewModel, CampaignPhaseStatusEnum } from '@/lib/api-client/types-bridge';

export interface CampaignHeaderProps {
  campaign: CampaignViewModel;
  loading?: boolean;
  onRefresh?: () => void;
  totalDomains?: number;
  className?: string;
}

const getStatusIcon = (status: CampaignPhaseStatusEnum) => {
  switch (status) {
    case 'completed': return CheckCircle;
    case 'failed': return AlertCircle;
    case 'in_progress': return Play;
    case 'paused': return Pause;
    case 'not_started': return Clock;
    default: return XCircle;
  }
};

const getStatusVariant = (status: CampaignPhaseStatusEnum): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'completed': return 'default' as any;
    case 'failed': return 'destructive' as any;
    case 'in_progress': return 'secondary' as any;
    case 'paused': return 'outline' as any;
    case 'not_started': return 'outline' as any;
    default: return 'outline' as any;
  }
};

const getStatusDisplayText = (status: CampaignPhaseStatusEnum): string => {
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
    case 'setup': return 'Campaign Setup';
    case 'generation': return 'Domain Generation';
    case 'dns_validation': return 'DNS Validation';
    case 'http_keyword_validation': return 'HTTP Validation';
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
  className
}) => {
  const campaignStatus = campaign.phaseStatus || 'not_started';
  const campaignPhase = campaign.currentPhase || 'setup';
  
  // Determine actual status based on data
  const actualStatus = totalDomains > 0 && campaignPhase === 'generation' 
    ? 'completed' as const 
    : campaignStatus;
  
  const StatusIcon = getStatusIcon(actualStatus);
  const statusVariant = getStatusVariant(actualStatus);
  const statusText = totalDomains > 0 && campaignPhase === 'generation' 
    ? 'Phase 1 Complete' 
    : getStatusDisplayText(actualStatus);
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
              {totalDomains > 0 && campaign.currentPhase === 'generation' 
                ? <span className="text-green-600 font-bold">100% Complete</span>
                : campaign.progressPercentage !== undefined 
                  ? `${campaign.progressPercentage}%` 
                  : <span className="text-muted-foreground">Initializing</span>
              }
            </div>
          </div>
        </div>
        
        {/* Real-time Status Bar */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between mb-3">
            <span className="text-base font-semibold">Overall Campaign Progress</span>
            <span className="text-sm text-muted-foreground font-medium">
              {totalDomains > 0 ? 'Phase 1 Complete' : 'Getting Started'}
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-primary to-primary/80 h-3 rounded-full transition-all duration-500 ease-in-out" 
              style={{ 
                width: `${totalDomains > 0 ? 25 : 0}%` // 25% = 1 phase out of 4 completed
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
        
        {campaign.errorMessage && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Error Details</span>
            </div>
            <div className="text-sm text-destructive mt-1">{campaign.errorMessage}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CampaignHeader;