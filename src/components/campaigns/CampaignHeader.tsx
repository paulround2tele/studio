// Campaign Header Component - Displays campaign title, status, and basic info
// Part of the modular architecture replacing the monolithic campaign details page

"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Briefcase, RefreshCw, CheckCircle, AlertCircle, Clock, Pause, Play, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CampaignViewModel, CampaignPhaseStatus } from '@/lib/types';

export interface CampaignHeaderProps {
  campaign: CampaignViewModel;
  loading?: boolean;
  onRefresh?: () => void;
  className?: string;
}

const getStatusIcon = (status: CampaignPhaseStatus) => {
  switch (status) {
    case 'completed': return CheckCircle;
    case 'failed': return AlertCircle;
    case 'in_progress': return Play;
    case 'paused': return Pause;
    case 'not_started': return Clock;
    default: return XCircle;
  }
};

const getStatusVariant = (status: CampaignPhaseStatus): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'completed': return 'default' as any;
    case 'failed': return 'destructive' as any;
    case 'in_progress': return 'secondary' as any;
    case 'paused': return 'outline' as any;
    case 'not_started': return 'outline' as any;
    default: return 'outline' as any;
  }
};

const getStatusDisplayText = (status: CampaignPhaseStatus): string => {
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
  className
}) => {
  const campaignStatus = campaign.phaseStatus || 'not_started';
  const campaignPhase = campaign.currentPhase || 'setup';
  
  const StatusIcon = getStatusIcon(campaignStatus);
  const statusVariant = getStatusVariant(campaignStatus);
  const statusText = getStatusDisplayText(campaignStatus);
  const phaseDisplayName = getPhaseDisplayName(campaignPhase);

  return (
    <Card className={cn("shadow-lg", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Briefcase className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-xl">{campaign.name || 'Unnamed Campaign'}</CardTitle>
              <CardDescription>
                Campaign in {phaseDisplayName} Phase
                {campaign.createdAt && (
                  <span className="ml-2 text-xs">
                    Created {formatDate(campaign.createdAt)}
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant={statusVariant} className="flex items-center gap-1.5">
              <StatusIcon className="h-3.5 w-3.5" />
              {statusText}
            </Badge>
            
            {onRefresh && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={onRefresh} 
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                Refresh
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="space-y-1">
            <div className="text-muted-foreground">Campaign ID</div>
            <div className="font-mono text-xs break-all">{campaign.id}</div>
          </div>
          
          <div className="space-y-1">
            <div className="text-muted-foreground">Current Phase</div>
            <div className="font-medium">{phaseDisplayName}</div>
          </div>
          
          <div className="space-y-1">
            <div className="text-muted-foreground">Progress</div>
            <div className="font-medium">
              {campaign.progressPercentage !== undefined 
                ? `${campaign.progressPercentage}%` 
                : 'N/A'
              }
            </div>
          </div>
        </div>
        
        {campaign.description && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm text-muted-foreground mb-1">Description</div>
            <div className="text-sm">{campaign.description}</div>
          </div>
        )}
        
        {campaign.errorMessage && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Error Details</span>
            </div>
            <div className="text-sm text-destructive mt-1">{campaign.errorMessage}</div>
          </div>
        )}
        
        {/* Campaign Configuration Summary */}
        <div className="mt-4 pt-4 border-t">
          <div className="text-sm text-muted-foreground mb-2">Configuration</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {campaign.totalItems && (
              <div className="flex justify-between">
                <span>Target Items:</span>
                <span className="font-mono">{campaign.totalItems}</span>
              </div>
            )}
            
            {campaign.domainGenerationParams?.numDomainsToGenerate && (
              <div className="flex justify-between">
                <span>Domains to Generate:</span>
                <span className="font-mono">{campaign.domainGenerationParams.numDomainsToGenerate}</span>
              </div>
            )}
            
            {campaign.domainGenerationParams?.constantString && (
              <div className="flex justify-between">
                <span>Constant String:</span>
                <span className="font-mono">{campaign.domainGenerationParams.constantString}</span>
              </div>
            )}
            
            {campaign.domainGenerationParams?.tld && (
              <div className="flex justify-between">
                <span>TLD:</span>
                <span className="font-mono">{campaign.domainGenerationParams.tld}</span>
              </div>
            )}
            
            {campaign.domainGenerationParams?.patternType && (
              <div className="flex justify-between">
                <span>Pattern Type:</span>
                <span className="font-mono">{campaign.domainGenerationParams.patternType}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CampaignHeader;