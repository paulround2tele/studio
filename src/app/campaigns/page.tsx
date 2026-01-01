"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import PageBreadcrumb from '@/components/ta/common/PageBreadCrumb';
import Badge from '@/components/ta/ui/badge/Badge';
import Button from "@/components/ta/ui/button/Button";
import { Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ta/ui/table';
import { PlusIcon, BoltIcon, BoxCubeIcon } from "@/icons";
import { useRTKCampaignsList } from "@/providers/RTKCampaignDataProvider";
import type { CampaignLite } from "@/providers/RTKCampaignDataProvider";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useGetPhaseStatusStandaloneQuery, usePausePhaseStandaloneMutation, useStopCampaignMutation } from "@/store/api/campaignApi";
import type { CampaignPhaseEnum } from "@/lib/api-client/models/campaign-phase-enum";
import type { ApiPhase } from "@/lib/utils/phaseNames";

// Frozen Layout Primitives
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardBody, 
  CardFooter,
  CardEmptyState,
  TABLE_HEADER_CLASSES,
  TABLE_HEADER_CELL_CLASSES,
  TABLE_BODY_CELL_CLASSES,
  TABLE_ROW_CLASSES,
  TableActionButton
} from '@/components/shared/Card';

// TailAdmin inline SVG icons
const RefreshIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14.167 5.83325C13.0004 4.66659 11.3337 3.83325 9.50039 3.83325C5.91706 3.83325 3.00039 6.74992 3.00039 10.3333C3.00039 13.9166 5.91706 16.8333 9.50039 16.8333C12.5004 16.8333 15.0004 14.7499 15.7504 11.9166M14.167 5.83325H10.8337M14.167 5.83325V2.49992" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const LoaderIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
  </svg>
);

const PauseIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 18.3333C14.6024 18.3333 18.3334 14.6023 18.3334 9.99992C18.3334 5.39755 14.6024 1.66659 10 1.66659C5.39765 1.66659 1.66669 5.39755 1.66669 9.99992C1.66669 14.6023 5.39765 18.3333 10 18.3333Z" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M8.33331 7.5V12.5M11.6666 7.5V12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const StopIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6.66669 6.66659H13.3334V13.3333H6.66669V6.66659Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 18.3333C14.6024 18.3333 18.3334 14.6023 18.3334 9.99992C18.3334 5.39755 14.6024 1.66659 10 1.66659C5.39765 1.66659 1.66669 5.39755 1.66669 9.99992C1.66669 14.6023 5.39765 18.3333 10 18.3333Z" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

const EyeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 4.37502C3.75002 4.37502 1.25002 10 1.25002 10C1.25002 10 3.75002 15.625 10 15.625C16.25 15.625 18.75 10 18.75 10C18.75 10 16.25 4.37502 10 4.37502Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 13.125C11.7259 13.125 13.125 11.7259 13.125 10C13.125 8.27411 11.7259 6.87502 10 6.87502C8.27413 6.87502 6.87502 8.27411 6.87502 10C6.87502 11.7259 8.27413 13.125 10 13.125Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const PencilIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14.0517 2.94741L17.0525 5.94824M15.3017 1.69741C15.6989 1.30024 16.2342 1.07715 16.7921 1.07715C17.35 1.07715 17.8853 1.30024 18.2825 1.69741C18.6797 2.09458 18.9028 2.62993 18.9028 3.18783C18.9028 3.74572 18.6797 4.28107 18.2825 4.67824L5.00002 17.9608L1.25002 18.7499L2.03919 14.9999L15.3017 1.69741Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

type CampaignStatus = CampaignLite['metadata']['status'];
type CampaignPhase = ApiPhase;

interface CampaignCardView {
  campaignId: string;
  name: string;
  currentPhase: CampaignPhase;
  status: CampaignStatus;
  totalDomains: number;
  processedDomains: number;
  successfulDomains: number;
  progressPercent: number;
}

const PHASE_LABELS: Record<CampaignPhase, string> = {
  discovery: "Discovery",
  validation: "Validation",
  extraction: "Extraction",
  analysis: "Analysis",
  enrichment: "Enrichment"
};

// TailAdmin Badge color mapping
type BadgeColor = "primary" | "success" | "error" | "warning" | "info" | "light" | "dark";
const STATUS_COLORS: Record<CampaignStatus, BadgeColor> = {
  draft: "light",
  running: "success",
  paused: "warning",
  completed: "info",
  failed: "error",
  cancelled: "error"
};

const formatLabel = (value: string) => value.replace(/_/g, ' ').replace(/(^|\s)([a-z])/g, (_, space, letter) => `${space}${letter.toUpperCase()}`);

const getMutationErrorMessage = (error: unknown): string => {
  if (!error) return 'Unable to complete the request. Please try again.';
  const dataMessage = typeof (error as { data?: { message?: unknown } })?.data?.message === 'string'
    ? ((error as { data: { message: string } }).data.message.trim())
    : '';
  if (dataMessage) return dataMessage;
  const errorText = typeof (error as { error?: unknown })?.error === 'string'
    ? ((error as { error: string }).error.trim())
    : '';
  if (errorText) return errorText;
  if (typeof (error as { message?: unknown })?.message === 'string') {
    const direct = (error as { message: string }).message.trim();
    if (direct) return direct;
  }
  return 'Unable to complete the request. Please try again.';
};

// ============================================================================
// METRIC CARD (TailAdmin eCommerce pattern)
// ============================================================================
interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: string; positive: boolean };
}

function MetricCard({ label, value, icon, trend }: MetricCardProps) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
            <h4 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</h4>
            {trend && (
              <p className={`mt-1 text-sm font-medium ${trend.positive ? 'text-success-600' : 'text-error-600'}`}>
                {trend.positive ? '↑' : '↓'} {trend.value}
              </p>
            )}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
            {icon}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

// ============================================================================
// TABLE SKELETON
// ============================================================================
function TableSkeleton() {
  return (
    <div className="space-y-4 p-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-14 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      ))}
    </div>
  );
}

// ============================================================================
// CAMPAIGN ROW ACTIONS (with pause/stop controls)
// ============================================================================
interface CampaignRowActionsProps {
  campaign: CampaignCardView;
  isMutating: boolean;
  activeAction: { type: 'pause' | 'stop'; campaignId: string } | null;
  onPause: (campaign: CampaignCardView) => void;
  onStop: (campaign: CampaignCardView) => void;
  isPausing: boolean;
  isStopping: boolean;
}

function CampaignRowActions({
  campaign,
  isMutating,
  activeAction,
  onPause,
  onStop,
  isPausing,
  isStopping,
}: CampaignRowActionsProps) {
  const phaseKey = campaign.currentPhase;
  const shouldFetchControls = Boolean(campaign.campaignId && phaseKey);
  const {
    data: phaseStatus,
    isLoading: isControlStatusLoading,
    isFetching: isControlStatusFetching,
  } = useGetPhaseStatusStandaloneQuery(
    { campaignId: campaign.campaignId, phase: phaseKey as CampaignPhaseEnum },
    { skip: !shouldFetchControls }
  );
  const runtimeControls = phaseStatus?.runtimeControls;
  const controlStatusBusy = isControlStatusLoading || isControlStatusFetching;
  const canPause = Boolean(runtimeControls?.canPause);
  const canStop = Boolean(runtimeControls?.canStop);
  const disablePause = controlStatusBusy || !canPause || isMutating;
  const disableStop = controlStatusBusy || !canStop || isMutating;
  const isPauseInFlight = Boolean(isPausing && activeAction?.type === 'pause' && activeAction.campaignId === campaign.campaignId);
  const isStopInFlight = Boolean(isStopping && activeAction?.type === 'stop' && activeAction.campaignId === campaign.campaignId);

  return (
    <div className="flex items-center justify-end gap-1">
      {/* View */}
      <Link href={`/campaigns/${campaign.campaignId}`}>
        <TableActionButton icon={<EyeIcon className="h-4 w-4" />} title="View" />
      </Link>
      {/* Edit */}
      <Link href={`/campaigns/${campaign.campaignId}/edit`}>
        <TableActionButton icon={<PencilIcon className="h-4 w-4" />} title="Edit" />
      </Link>
      {/* Pause */}
      <TableActionButton
        icon={isPauseInFlight ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <PauseIcon className="h-4 w-4" />}
        onClick={() => onPause(campaign)}
        disabled={disablePause}
        title="Pause Phase"
      />
      {/* Stop */}
      <TableActionButton
        icon={isStopInFlight ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <StopIcon className="h-4 w-4" />}
        onClick={() => onStop(campaign)}
        disabled={disableStop}
        variant="danger"
        title="Stop Campaign"
      />
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================
export default function CampaignsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { campaigns: enrichedCampaigns, loading, error, refetch } = useRTKCampaignsList();
  const [pausePhase, { isLoading: isPausing }] = usePausePhaseStandaloneMutation();
  const [stopCampaign, { isLoading: isStoppingCampaign }] = useStopCampaignMutation();
  const [activeAction, setActiveAction] = useState<{ type: 'pause' | 'stop'; campaignId: string } | null>(null);
  
  const campaigns: CampaignCardView[] = useMemo(() => {
    return enrichedCampaigns.map((campaign: CampaignLite): CampaignCardView => {
      const progress = campaign.metadata.progress ?? {};
      return {
        campaignId: campaign.id,
        name: campaign.name,
        currentPhase: campaign.currentPhase ?? 'discovery',
        status: campaign.metadata.status,
        totalDomains: progress.totalDomains ?? 0,
        processedDomains: progress.processedDomains ?? 0,
        successfulDomains: progress.successfulDomains ?? 0,
        progressPercent: progress.percentComplete ?? 0
      };
    });
  }, [enrichedCampaigns]);

  // Aggregate metrics
  const metrics = useMemo(() => {
    const total = campaigns.length;
    const running = campaigns.filter(c => c.status === 'running').length;
    const completed = campaigns.filter(c => c.status === 'completed').length;
    const totalDomains = campaigns.reduce((sum, c) => sum + c.totalDomains, 0);
    return { total, running, completed, totalDomains };
  }, [campaigns]);

  const isMutating = isPausing || isStoppingCampaign;

  const handlePauseCampaign = async (campaign: CampaignCardView) => {
    const phase = (campaign.currentPhase ?? 'discovery') as CampaignPhaseEnum;
    setActiveAction({ type: 'pause', campaignId: campaign.campaignId });
    try {
      await pausePhase({ campaignId: campaign.campaignId, phase }).unwrap();
      toast({
        title: `${campaign.name} pause requested`,
        description: `${formatLabel(PHASE_LABELS[phase] ?? phase)} phase will pause shortly.`
      });
      refetch();
    } catch (err) {
      toast({
        title: 'Unable to pause campaign',
        description: getMutationErrorMessage(err),
        variant: 'destructive'
      });
    } finally {
      setActiveAction(null);
    }
  };

  const handleStopCampaign = async (campaign: CampaignCardView) => {
    setActiveAction({ type: 'stop', campaignId: campaign.campaignId });
    try {
      await stopCampaign(campaign.campaignId).unwrap();
      toast({
        title: `${campaign.name} stop requested`,
        description: 'Active campaign phases will wind down safely.'
      });
      refetch();
    } catch (err) {
      toast({
        title: 'Unable to stop campaign',
        description: getMutationErrorMessage(err),
        variant: 'destructive'
      });
    } finally {
      setActiveAction(null);
    }
  };

  // Suppress router unused warning
  void router;

  // ===========================================================================
  // RENDER - TailAdmin eCommerce Dashboard Pattern
  // ===========================================================================
  return (
    <>
      {/* ===== BREADCRUMB ===== */}
      <PageBreadcrumb pageTitle="Campaigns" />
      
      {/* ===== MAIN CONTENT with space-y-6 ===== */}
      <div className="space-y-6">

        {/* ===== HEADER ACTIONS BAR ===== */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Enterprise-scale domain generation and validation campaigns
          </p>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={refetch}
              startIcon={loading ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <RefreshIcon className="h-4 w-4" />}
              disabled={loading}
            >
              Refresh
            </Button>
            <Link href="/campaigns/new">
              <Button startIcon={<PlusIcon className="h-4 w-4" />}>
                New Campaign
              </Button>
            </Link>
          </div>
        </div>

        {/* ===== METRICS GRID (TailAdmin eCommerce pattern) ===== */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Total Campaigns"
            value={metrics.total}
            icon={<BoltIcon className="h-6 w-6" />}
          />
          <MetricCard
            label="Running"
            value={metrics.running}
            icon={<LoaderIcon className="h-6 w-6" />}
          />
          <MetricCard
            label="Completed"
            value={metrics.completed}
            icon={<BoxCubeIcon className="h-6 w-6" />}
          />
          <MetricCard
            label="Total Domains"
            value={metrics.totalDomains.toLocaleString()}
            icon={<svg className="h-6 w-6" viewBox="0 0 20 20" fill="none"><path d="M10 18.3333C14.6024 18.3333 18.3334 14.6023 18.3334 9.99992C18.3334 5.39755 14.6024 1.66659 10 1.66659C5.39765 1.66659 1.66669 5.39755 1.66669 9.99992C1.66669 14.6023 5.39765 18.3333 10 18.3333Z" stroke="currentColor" strokeWidth="1.5"/><path d="M1.66669 10H18.3334M10 1.66659C12.0844 3.94855 13.269 6.91019 13.3334 9.99992C13.269 13.0897 12.0844 16.0513 10 18.3333C7.91562 16.0513 6.73104 13.0897 6.66669 9.99992C6.73104 6.91019 7.91562 3.94855 10 1.66659Z" stroke="currentColor" strokeWidth="1.5"/></svg>}
          />
        </div>

        {/* ===== CAMPAIGNS TABLE CARD ===== */}
        {loading ? (
          <Card>
            <CardBody noPadding>
              <TableSkeleton />
            </CardBody>
          </Card>
        ) : error ? (
          <Card>
            <CardBody>
              <div className="text-center py-8">
                <p className="text-error-600 dark:text-error-400 mb-4">{typeof error === 'string' ? error : 'Failed to load campaigns'}</p>
                <Button onClick={refetch}>Try Again</Button>
              </div>
            </CardBody>
          </Card>
        ) : campaigns.length === 0 ? (
          <Card>
            <CardBody>
              <CardEmptyState
                icon={<BoxCubeIcon className="h-12 w-12" />}
                title="No Campaigns Yet"
                description="Get started by creating your first domain generation campaign."
                action={
                  <Link href="/campaigns/new">
                    <Button startIcon={<PlusIcon className="h-4 w-4" />}>
                      Create First Campaign
                    </Button>
                  </Link>
                }
              />
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle icon={<BoltIcon className="h-5 w-5" />}>
                All Campaigns
              </CardTitle>
              <CardDescription>
                Monitor and manage your domain generation campaigns.
              </CardDescription>
            </CardHeader>
            <CardBody noPadding>
              <div className="overflow-x-auto">
                <Table className="w-full">
                  <TableHeader className={TABLE_HEADER_CLASSES}>
                    <TableRow>
                      <TableCell isHeader className={TABLE_HEADER_CELL_CLASSES}>
                        Name
                      </TableCell>
                      <TableCell isHeader className={`${TABLE_HEADER_CELL_CLASSES} text-center`}>
                        Phase
                      </TableCell>
                      <TableCell isHeader className={`${TABLE_HEADER_CELL_CLASSES} text-center`}>
                        Status
                      </TableCell>
                      <TableCell isHeader className={`${TABLE_HEADER_CELL_CLASSES} text-center`}>
                        Domains
                      </TableCell>
                      <TableCell isHeader className={`${TABLE_HEADER_CELL_CLASSES} text-center`}>
                        Progress
                      </TableCell>
                      <TableCell isHeader className={`${TABLE_HEADER_CELL_CLASSES} text-right`}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((campaign) => (
                      <TableRow key={campaign.campaignId} className={TABLE_ROW_CLASSES}>
                        <TableCell className={TABLE_BODY_CELL_CLASSES}>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                              <BoltIcon className="h-5 w-5" />
                            </div>
                            <div>
                              <span className="font-medium text-gray-900 dark:text-white">{campaign.name}</span>
                              <p className="text-xs text-gray-400">{campaign.campaignId.slice(0, 8)}...</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className={`${TABLE_BODY_CELL_CLASSES} text-center`}>
                          <Badge color="light">
                            {formatLabel(PHASE_LABELS[campaign.currentPhase] ?? campaign.currentPhase)}
                          </Badge>
                        </TableCell>
                        <TableCell className={`${TABLE_BODY_CELL_CLASSES} text-center`}>
                          <Badge color={STATUS_COLORS[campaign.status]}>
                            {formatLabel(campaign.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className={`${TABLE_BODY_CELL_CLASSES} text-center`}>
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {campaign.totalDomains.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className={`${TABLE_BODY_CELL_CLASSES} text-center`}>
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                              <div 
                                className="h-full bg-brand-500 rounded-full transition-all"
                                style={{ width: `${Math.min(campaign.progressPercent, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 w-10">
                              {Math.round(campaign.progressPercent)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className={`${TABLE_BODY_CELL_CLASSES} text-right`}>
                          <CampaignRowActions
                            campaign={campaign}
                            isMutating={isMutating}
                            activeAction={activeAction}
                            onPause={handlePauseCampaign}
                            onStop={handleStopCampaign}
                            isPausing={isPausing}
                            isStopping={isStoppingCampaign}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardBody>
            <CardFooter>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {campaigns.length} campaign{campaigns.length === 1 ? '' : 's'} total
              </p>
            </CardFooter>
          </Card>
        )}

      </div>
    </>
  );
}
