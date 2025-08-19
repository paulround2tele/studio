
"use client";

import React, { memo, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { Campaign } from '@/lib/api-client/models';
import { ArrowRight, CalendarDays, CheckCircle, AlertTriangle, WorkflowIcon, Play, MoreVertical, FilePenLine, Trash2, PauseCircle, PlayCircle, StopCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { CAMPAIGN_PHASES_ORDERED, getNextPhase } from '@/lib/constants';

interface CampaignListItemProps {
  campaign: Campaign;
  // Action handlers
  onDeleteCampaign: (campaignId: string) => void;
  onPauseCampaign?: (campaignId: string) => void;
  onResumeCampaign?: (campaignId: string) => void;
  onStopCampaign?: (campaignId: string) => void;
  // Loading states
  isActionLoading?: Record<string, boolean>;
  // Bulk selection props
  isSelected?: boolean;
  onSelect?: (campaignId: string, selected: boolean) => void;
}

// Memoized utility functions for better performance
const formatDate = (dateString: string): string => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Invalid Date';
  }
};

// Memoized progress calculation function
const getOverallCampaignProgress = (campaign: Campaign): number => {
  // All campaigns follow the same phase progression in phases-based architecture
  const allPhases = ['generation', 'dns_validation', 'http_keyword_validation', 'analysis'];
  if (allPhases.length === 0) return 0;

  // Use backend-calculated progressPercentage (no frontend calculation needed)
  let progressValue = campaign.progressPercentage ?? 0;
  
  // If no direct progress, try to calculate from processed vs total items
  if (progressValue === 0 && campaign.totalItems && campaign.processedItems) {
    progressValue = Math.floor((campaign.processedItems / campaign.totalItems) * 100);
  }

  if ((campaign.currentPhase as any) === "completed" || (campaign.phaseStatus as any) === "completed") return 100;
  
  if ((campaign.phaseStatus as any) === "paused" || (campaign.phaseStatus as any) === "failed" || !campaign.currentPhase) {
    // For paused or failed, progress reflects where it stopped. For not started, it's 0.
    const currentPhaseIndexInType = campaign.currentPhase ? allPhases.indexOf(campaign.currentPhase) : -1;
     if(!campaign.currentPhase || currentPhaseIndexInType === -1) return Math.max(0, progressValue);

    const completedPhasesProgress = (currentPhaseIndexInType / allPhases.length) * 100;
    const currentPhaseProgressContribution = (progressValue / allPhases.length);
    return Math.min(100, Math.floor(completedPhasesProgress + currentPhaseProgressContribution));
  }

  const currentPhaseIndexInType = campaign.currentPhase ? allPhases.indexOf(campaign.currentPhase) : -1;
  if (currentPhaseIndexInType === -1) return Math.max(0, progressValue); // Fallback to direct progress value

  const completedPhasesProgress = (currentPhaseIndexInType / allPhases.length) * 100;
  const currentPhaseProgressContribution = (progressValue / allPhases.length);

  return Math.min(100, Math.floor(completedPhasesProgress + currentPhaseProgressContribution));
};

// Memoized status badge info generation
const getStatusBadgeInfo = (campaign: Campaign): { text: string, variant: "default" | "secondary" | "destructive" | "outline", icon: JSX.Element } => {
  // Check if campaign is fully completed (completed analysis phase = campaign done)
  if (campaign.phaseStatus === "completed" && campaign.currentPhase === "analysis") {
    return { text: "Campaign Completed", variant: "default", icon: <CheckCircle className="h-4 w-4 text-green-500" /> };
  }
  if (campaign.phaseStatus === "failed") return { text: `Failed: ${campaign.currentPhase || 'Unknown'}`, variant: "destructive", icon: <AlertTriangle className="h-4 w-4 text-destructive" /> };
  if (campaign.phaseStatus === "paused") return { text: `Paused: ${campaign.currentPhase || 'Unknown'}`, variant: "outline", icon: <PauseCircle className="h-4 w-4 text-muted-foreground" /> };
  if (campaign.phaseStatus === "in_progress") return { text: `Active: ${campaign.currentPhase || 'Unknown'}`, variant: "secondary", icon: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" /> };
  if (!campaign.currentPhase || campaign.phaseStatus === "not_started") return { text: "Pending Start", variant: "outline", icon: <Play className="h-4 w-4 text-muted-foreground" /> };
  if (campaign.phaseStatus === "completed") {
     // Determine next phase in unified workflow
     const getNextPhaseInWorkflow = (currentPhase: string): string | null => {
       const phaseOrder = ['generation', 'dns_validation', 'http_keyword_validation', 'analysis'];
       const currentIndex = phaseOrder.indexOf(currentPhase);
       if (currentIndex !== -1 && currentIndex < phaseOrder.length - 1) {
         const nextPhase = phaseOrder[currentIndex + 1];
         return nextPhase || null;
       }
       return null;
     };
     const nextPhase = campaign.currentPhase ? getNextPhaseInWorkflow(campaign.currentPhase) : null;
     return { text: `Next: ${nextPhase || 'Finalizing'}`, variant: "secondary", icon: <WorkflowIcon className="h-4 w-4 text-muted-foreground" /> };
  }
  return { text: campaign.currentPhase || 'Unknown', variant: "outline", icon: <WorkflowIcon className="h-4 w-4 text-muted-foreground" /> };
};


// Memoized main component with optimized performance
const CampaignListItem = memo(({ campaign, onDeleteCampaign, onPauseCampaign, onResumeCampaign, onStopCampaign, isActionLoading = {}, isSelected = false, onSelect }: CampaignListItemProps) => {
  // Memoize expensive calculations to prevent recalculation on every render
  const overallProgress = useMemo(() => getOverallCampaignProgress(campaign), [campaign]);
  const statusInfo = useMemo(() => getStatusBadgeInfo(campaign), [campaign]);
  const formattedDate = useMemo(() => formatDate(campaign.createdAt || ''), [campaign.createdAt]);

  // Memoize loading states to prevent object recreation
  const loadingStates = useMemo(() => ({
    isDeleting: !!isActionLoading[`delete-${campaign.id}`],
    isPausing: !!isActionLoading[`pause-${campaign.id}`],
    isResuming: !!isActionLoading[`resume-${campaign.id}`],
    isStopping: !!isActionLoading[`stop-${campaign.id}`]
  }), [isActionLoading, campaign.id]);

  // Memoize combined loading state
  const anyActionLoading = useMemo(() => {
    return loadingStates.isDeleting || loadingStates.isPausing || loadingStates.isResuming || loadingStates.isStopping;
  }, [loadingStates]);

  // Memoize action handlers to prevent re-creation on every render
  const handleDeleteCampaign = useCallback(() => {
    // Prevent multiple delete attempts if already loading
    if (loadingStates.isDeleting || anyActionLoading || !campaign.id) {
      return;
    }
    onDeleteCampaign(campaign.id);
  }, [onDeleteCampaign, campaign.id, loadingStates.isDeleting, anyActionLoading]);

  const handlePauseCampaign = useCallback(() => {
    if (campaign.id) onPauseCampaign?.(campaign.id);
  }, [onPauseCampaign, campaign.id]);

  const handleResumeCampaign = useCallback(() => {
    if (campaign.id) onResumeCampaign?.(campaign.id);
  }, [onResumeCampaign, campaign.id]);

  const handleStopCampaign = useCallback(() => {
    if (campaign.id) onStopCampaign?.(campaign.id);
  }, [onStopCampaign, campaign.id]);

  // Memoize selection handler
  const handleSelect = useCallback((checked: boolean) => {
    if (campaign.id && onSelect) {
      onSelect(campaign.id, checked);
    }
  }, [onSelect, campaign.id]);

  // Memoize conditional rendering flags
  const showActions = useMemo(() => ({
    showPause: campaign.phaseStatus === 'in_progress' && onPauseCampaign,
    showResume: campaign.phaseStatus === 'paused' && onResumeCampaign,
    showStop: (campaign.phaseStatus === 'in_progress' || campaign.phaseStatus === 'paused') && onStopCampaign
  }), [campaign.phaseStatus, onPauseCampaign, onResumeCampaign, onStopCampaign]);

  return (
    <AlertDialog>
      <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 flex flex-col h-full">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-3 flex-1">
              {onSelect && (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={handleSelect}
                  className="mt-1"
                  aria-label={`Select campaign ${campaign.name}`}
                />
              )}
              <CardTitle className="text-xl mb-1">{campaign.name}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant={statusInfo.variant} className="cursor-default">
                      {statusInfo.icon}
                      <span className="ml-1.5">{statusInfo.text}</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Phase: {campaign.currentPhase}</p>
                    <p>Status: {campaign.phaseStatus}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" disabled={anyActionLoading}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild disabled={anyActionLoading}>
                    <Link href={`/campaigns/${campaign.id}/edit`}>
                      <FilePenLine className="mr-2 h-4 w-4" /> Edit
                    </Link>
                  </DropdownMenuItem>

                  {showActions.showPause && (
                    <DropdownMenuItem onClick={handlePauseCampaign} disabled={anyActionLoading || loadingStates.isPausing}>
                      <PauseCircle className="mr-2 h-4 w-4" /> Pause
                      <span className="text-xs ml-1 text-muted-foreground">(API: /pause)</span>
                    </DropdownMenuItem>
                  )}
                  {showActions.showResume && (
                     <DropdownMenuItem onClick={handleResumeCampaign} disabled={anyActionLoading || loadingStates.isResuming}>
                       <PlayCircle className="mr-2 h-4 w-4" /> Resume
                       <span className="text-xs ml-1 text-muted-foreground">(API: /resume)</span>
                     </DropdownMenuItem>
                  )}
                  {showActions.showStop && (
                    <DropdownMenuItem onClick={handleStopCampaign} className="text-amber-600 focus:text-amber-100 focus:bg-amber-500" disabled={anyActionLoading || loadingStates.isStopping}>
                      <StopCircle className="mr-2 h-4 w-4" /> Stop
                      <span className="text-xs ml-1 text-muted-foreground">(API: /stop)</span>
                    </DropdownMenuItem>
                  )}
                  {(showActions.showPause || showActions.showResume || showActions.showStop) && <DropdownMenuSeparator />}

                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem className="text-destructive hover:!bg-destructive hover:!text-destructive-foreground focus:!bg-destructive focus:!text-destructive-foreground" disabled={anyActionLoading || loadingStates.isDeleting} onSelect={(e) => e.preventDefault()}>
                      {loadingStates.isDeleting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </>
                      )}
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <CardDescription className="line-clamp-2">{campaign.errorMessage || `Campaign ${campaign.currentPhase || 'in progress'}`}</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow space-y-3">
          <div>
            <div className="flex justify-between items-center mb-1 text-sm">
              <span className="font-medium text-muted-foreground">Overall Progress</span>
            </div>
            <Progress
              value={overallProgress}
              className="h-2"
              indicatorVariant={overallProgress >= 100 ? "success" : "default"}
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{overallProgress}% complete</p>
          </div>
          <div className="text-sm text-muted-foreground">
            <strong>Phase:</strong> {campaign.currentPhase}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-2 border-t pt-4">
          <div className="text-xs text-muted-foreground flex items-center">
            <CalendarDays className="mr-1.5 h-3.5 w-3.5" /> Created: {formattedDate}
          </div>
          <Button asChild size="sm" variant="outline" disabled={anyActionLoading}>
            <Link href={`/campaigns/${campaign.id}`} aria-disabled={anyActionLoading}>
              View Dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardFooter>
      </Card>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. Campaign &quot;{campaign.name}&quot; will be permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loadingStates.isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteCampaign}
            disabled={loadingStates.isDeleting || anyActionLoading}
            className={buttonVariants({ variant: "destructive" })}
          >
            {loadingStates.isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Campaign"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});

CampaignListItem.displayName = 'CampaignListItem';

export default CampaignListItem;
