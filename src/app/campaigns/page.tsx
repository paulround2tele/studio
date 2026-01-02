"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import PageBreadcrumb from '@/components/ta/common/PageBreadCrumb';
import Badge from '@/components/ta/ui/badge/Badge';
import Button from "@/components/ta/ui/button/Button";
import { Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ta/ui/table';
import { PlusIcon, BoltIcon, BoxCubeIcon, RefreshIcon, LoaderIcon, PauseIcon, StopIcon, EyeIcon, PencilIcon } from "@/icons";
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
  TABLE_BODY_CLASSES,
  TABLE_BODY_CELL_CLASSES,
  TABLE_ROW_CLASSES,
  TableActionButton
} from '@/components/shared/Card';

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
// METRIC CARD (TailAdmin eCommerce pattern - exact match to metric-group-01.html)
// ============================================================================
interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: string; positive: boolean };
}

function MetricCard({ label, value, icon, trend }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      {/* Icon container - TailAdmin exact: h-12 w-12 rounded-xl bg-gray-100 */}
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
        <span className="text-gray-800 dark:text-white/90">{icon}</span>
      </div>

      {/* Value section with mt-5 gap like TailAdmin */}
      <div className="mt-5 flex items-end justify-between">
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
          <h4 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white/90">{value}</h4>
        </div>
        {trend && (
          <span className={`flex items-center gap-1 rounded-full py-0.5 pl-2 pr-2.5 text-sm font-medium ${
            trend.positive 
              ? 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500' 
              : 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500'
          }`}>
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
    </div>
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
                  <TableBody className={TABLE_BODY_CLASSES}>
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
                          {/* Progress bar - TailAdmin exact from map-01.html: h-2 rounded-sm, gap-3 to text */}
                          <div className="flex items-center justify-center gap-3">
                            <div className="relative block h-2 w-full max-w-[100px] rounded-sm bg-gray-200 dark:bg-gray-800">
                              <div 
                                className="absolute left-0 top-0 h-full rounded-sm bg-brand-500"
                                style={{ width: `${Math.min(campaign.progressPercent, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-800 dark:text-white/90">
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
