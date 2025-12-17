
'use client';

/**
 * Campaign Experience Page Layout (Phase D)
 * Main campaign experience page integration with all refactor components
 */

import React from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useParams } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { SerializedError } from '@reduxjs/toolkit';

import { KpiGrid } from './KpiGrid';
import { PipelineBar } from './PipelineBar';
import type { PipelinePhase } from './PipelineBar';
import { FunnelSnapshot } from './FunnelSnapshot';
import { RecommendationPanel } from './RecommendationPanel';
import { LeadResultsPanel } from './LeadResultsPanel';
import type { CampaignRecommendation } from '@/lib/api-client/models/campaign-recommendation';
import type { Recommendation } from '@/types/campaignMetrics';
import { ConfigSummary } from './ConfigSummary';
import { ConfigSummaryPanel as _ConfigSummaryPanel } from './ConfigSummaryPanel';
import { MomentumPanel as _MomentumPanel } from './MomentumPanel';
import { ClassificationBuckets as _ClassificationBuckets } from './ClassificationBuckets';
import { WarningDistribution } from './WarningDistribution';
import { WarningBar as _WarningBar } from './WarningBar';
import { WarningPills as _WarningPills } from './WarningPills';
import { MoverList } from './MoverList';
import { Histogram } from './Histogram';
import { mergeCampaignPhases } from './phaseStatusUtils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useCampaignPhaseStream } from '@/hooks/useCampaignPhaseStream';
import type { PhaseUpdateEvent } from '@/hooks/useCampaignPhaseStream';
import { 
  useGetCampaignMetricsQuery,
  useGetCampaignFunnelQuery,
  useGetCampaignRecommendationsQuery,
  useGetCampaignEnrichedQuery,
  useGetCampaignDomainsQuery,
  useGetCampaignClassificationsQuery,
  useGetCampaignMomentumQuery,
  useGetCampaignStatusQuery,
  useRestartCampaignMutation,
  useStartPhaseStandaloneMutation,
  useGetPhaseStatusStandaloneQuery,
  usePausePhaseStandaloneMutation,
  useResumePhaseStandaloneMutation,
  useStopCampaignMutation
} from '@/store/api/campaignApi';
import { getPhaseDisplayName } from '@/lib/utils/phaseMapping';
import { API_PHASE_ORDER, normalizeToApiPhase } from '@/lib/utils/phaseNames';
import type { ApiPhase } from '@/lib/utils/phaseNames';
import type { CampaignPhaseEnum } from '@/lib/api-client/models/campaign-phase-enum';
import { useToast } from '@/hooks/use-toast';

import type { CampaignKpi } from '../types';
import type { WarningData } from './WarningDistribution';
import type { WarningBarData } from './WarningBar';
import type { WarningPillData } from './WarningPills';

interface CampaignExperiencePageProps {
  className?: string;
  role?: string;
}

function extractErrorMessage(error?: FetchBaseQueryError | SerializedError | undefined): string | null {
  if (!error) return null;

  if ('message' in error && typeof error.message === 'string' && error.message.length > 0) {
    return error.message;
  }

  if ('status' in (error as FetchBaseQueryError)) {
    const fetchLike = error as FetchBaseQueryError;

    if (typeof fetchLike.status === 'number') {
      const payload = (fetchLike as { data?: unknown }).data;
      if (payload && typeof (payload as { message?: unknown }).message === 'string') {
        return (payload as { message: string }).message;
      }
      return `Request failed (${fetchLike.status})`;
    }

    if (typeof fetchLike.status === 'string') {
      const errorText = (fetchLike as { error?: string }).error;
      return errorText && errorText.length > 0
        ? errorText
        : `Request failed (${fetchLike.status})`;
    }
  }

  return 'Failed to load lead details';
}

const LEAD_DOMAIN_DEFAULT_LIMIT = 200;
const LEAD_DOMAIN_INCREMENT = 200;
const LEAD_DOMAIN_MAX = 1000;
const REALTIME_REFRESH_INTERVAL_MS = 10_000;

function formatPhaseLabelFromSnapshot(phase?: string): string {
  const normalizedInput = typeof phase === 'string' ? phase.toLowerCase() : '';
  const normalized = normalizedInput ? normalizeToApiPhase(normalizedInput) : null;
  if (normalized) {
    return getPhaseDisplayName(normalized);
  }
  const fallback = typeof phase === 'string' && phase.length > 0 ? phase : 'Unknown Phase';
  return fallback
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatFailureTimestamp(value?: string): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function sanitizePhaseErrorText(message?: string | null): string | null {
  if (typeof message !== 'string') {
    return null;
  }

  const trimmed = message.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function extractPhaseErrorDetailsMessage(details?: Record<string, unknown> | null): string | null {
  if (!details || typeof details !== 'object') {
    return null;
  }

  const candidate = (details as Record<string, unknown>).message
    ?? (details as Record<string, unknown>).error
    ?? (details as Record<string, unknown>).reason;

  if (typeof candidate !== 'string') {
    return null;
  }

  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatPhaseActionError(error: unknown): string {
  if (!error) {
    return 'Unable to complete the request. Please try again.';
  }

  const fetchLike = error as (FetchBaseQueryError & { data?: { message?: unknown } }) | undefined;
  if (fetchLike && typeof fetchLike === 'object' && 'status' in fetchLike) {
    const payloadMessage = typeof fetchLike.data?.message === 'string' ? fetchLike.data!.message.trim() : '';
    if (payloadMessage) {
      return payloadMessage;
    }
    if (typeof fetchLike.status === 'number') {
      return `Request failed (${fetchLike.status})`;
    }
    if (typeof fetchLike.status === 'string') {
      return `Request failed (${fetchLike.status})`;
    }
  }

  if (typeof (error as { message?: unknown })?.message === 'string') {
    const direct = (error as { message: string }).message.trim();
    if (direct) {
      return direct;
    }
  }

  return 'Unable to complete the request. Please try again.';
}

export function CampaignExperiencePage({ className: _className, role: _role = "region" }: CampaignExperiencePageProps) {
  const params = useParams();
  const campaignId = params?.id as string;
  const { toast } = useToast();
  const [startPhaseMutation, { isLoading: isStartPhaseLoading }] = useStartPhaseStandaloneMutation();
  const [pausePhaseMutation, { isLoading: isPausePhaseLoading }] = usePausePhaseStandaloneMutation();
  const [resumePhaseMutation, { isLoading: isResumePhaseLoading }] = useResumePhaseStandaloneMutation();
  const [stopCampaignMutation, { isLoading: isStopCampaignLoading }] = useStopCampaignMutation();
  const [restartCampaignMutation] = useRestartCampaignMutation();
  const [selectedPhaseKey, setSelectedPhaseKey] = React.useState<ApiPhase>('validation');
  const [phaseSelectTouched, setPhaseSelectTouched] = React.useState(false);
  const [bulkAction, setBulkAction] = React.useState<'idle' | 'retryFailed' | 'restartCampaign'>('idle');

  const [leadResultLimit, setLeadResultLimit] = React.useState(LEAD_DOMAIN_DEFAULT_LIMIT);

  React.useEffect(() => {
    setLeadResultLimit(LEAD_DOMAIN_DEFAULT_LIMIT);
    setPhaseSelectTouched(false);
  }, [campaignId]);

  // Fetch campaign data with caching optimizations
  const { data: metricsData, isLoading: metricsLoading, error: metricsError, refetch: refetchMetrics } = useGetCampaignMetricsQuery(campaignId);
  const { data: funnelData, isLoading: funnelLoading, error: funnelError, refetch: refetchFunnel } = useGetCampaignFunnelQuery(campaignId);
  const realtimeRefreshTimestampsRef = React.useRef({ funnel: 0, metrics: 0 });

  React.useEffect(() => {
    realtimeRefreshTimestampsRef.current = { funnel: 0, metrics: 0 };
  }, [campaignId]);

  const refreshRealtimeData = React.useCallback((options?: { force?: boolean }) => {
    const now = Date.now();
    const force = options?.force ?? false;

    if (force || now - realtimeRefreshTimestampsRef.current.funnel >= REALTIME_REFRESH_INTERVAL_MS) {
      realtimeRefreshTimestampsRef.current.funnel = now;
      refetchFunnel();
    }

    if (force || now - realtimeRefreshTimestampsRef.current.metrics >= REALTIME_REFRESH_INTERVAL_MS) {
      realtimeRefreshTimestampsRef.current.metrics = now;
      refetchMetrics();
    }
  }, [refetchFunnel, refetchMetrics]);

  const handlePhaseUpdate = React.useCallback((event: PhaseUpdateEvent) => {
    console.log('Phase update:', event);
    const terminalStatus = event.status === 'completed' || event.status === 'failed';
    const force = terminalStatus || (event.progressPercentage ?? 0) >= 100;
    refreshRealtimeData({ force });
  }, [refreshRealtimeData]);
  const { data: recommendationsData, isLoading: recsLoading } = useGetCampaignRecommendationsQuery(campaignId);
  const { data: enrichedData } = useGetCampaignEnrichedQuery(campaignId);
  const { data: domainsList, isLoading: domainsLoading, isFetching: domainsFetching, error: domainsError } = useGetCampaignDomainsQuery(
    { campaignId, limit: leadResultLimit, offset: 0 },
    { skip: !campaignId }
  );
  const { data: _classificationsData } = useGetCampaignClassificationsQuery({ campaignId });
  const { data: momentumData } = useGetCampaignMomentumQuery(campaignId);

  const { isAuthenticated } = useAuth();

  // Real-time phase updates
  // Only gate on authentication; `isInitialized` has proven unreliable and can prevent the SSE URL from being set.
  const sseEnabled = Boolean(campaignId && isAuthenticated);

  const { phases, isConnected, hasEverConnected, error: sseError, lastUpdate } = useCampaignPhaseStream(campaignId, {
    enabled: sseEnabled,
    onPhaseUpdate: handlePhaseUpdate,
    onError: (error) => {
      console.error('SSE error:', error);
    }
  });

  React.useEffect(() => {
    if (!hasEverConnected) {
      return;
    }
    refreshRealtimeData({ force: true });
  }, [hasEverConnected, refreshRealtimeData]);

  const { data: statusSnapshot } = useGetCampaignStatusQuery(campaignId);
  const domainItems = React.useMemo(() => domainsList?.items ?? [], [domainsList]);
  const leadAggregates = domainsList?.aggregates?.lead;
  const leadPanelError = React.useMemo(
    () => extractErrorMessage(domainsError),
    [domainsError]
  );
  const totalLeadDomains = domainsList?.total ?? 0;
  const pageInfoHasNext = domainsList?.pageInfo?.hasNextPage;
  const hasMoreLeadData = React.useMemo(() => {
    if (typeof pageInfoHasNext === 'boolean') {
      if (pageInfoHasNext) {
        return true;
      }
      if (totalLeadDomains > 0) {
        return domainItems.length < totalLeadDomains;
      }
      return false;
    }
    if (totalLeadDomains === 0) {
      return false;
    }
    return domainItems.length < totalLeadDomains;
  }, [pageInfoHasNext, totalLeadDomains, domainItems.length]);

  const canLoadMoreLeadData = hasMoreLeadData && leadResultLimit < LEAD_DOMAIN_MAX;

  const handleLoadMoreLeads = React.useCallback(() => {
    setLeadResultLimit((prev) => {
      if (prev >= LEAD_DOMAIN_MAX) return prev;
      return Math.min(prev + LEAD_DOMAIN_INCREMENT, LEAD_DOMAIN_MAX);
    });
  }, []);

  const pipelinePhases = React.useMemo(() => mergeCampaignPhases({
    statusSnapshot,
    funnelData,
    ssePhases: phases,
    sseLastUpdate: lastUpdate
  }), [statusSnapshot, funnelData, phases, lastUpdate]);

  const activePhaseKey = React.useMemo(() => {
    const runningPhase = pipelinePhases.find((phase) => phase.status === 'in_progress');
    if (!runningPhase) {
      return null;
    }
    return normalizeToApiPhase(String(runningPhase.key).toLowerCase());
  }, [pipelinePhases]);

  const selectedPhaseMeta = React.useMemo(() => {
    if (!selectedPhaseKey) {
      return null;
    }
    return pipelinePhases.find((phase) => normalizeToApiPhase(String(phase.key).toLowerCase()) === selectedPhaseKey) ?? null;
  }, [pipelinePhases, selectedPhaseKey]);

  const selectedPhaseStatus = selectedPhaseMeta?.status ?? 'not_started';
  const isSelectedPhasePaused = selectedPhaseStatus === 'paused';

  const {
    data: selectedPhaseStatusData,
    isFetching: isPhaseStatusFetching,
    isLoading: isPhaseStatusLoading,
  } = useGetPhaseStatusStandaloneQuery(
    { campaignId, phase: selectedPhaseKey as CampaignPhaseEnum },
    { skip: !campaignId || !selectedPhaseKey }
  );

  const selectedPhaseRuntimeControls = selectedPhaseStatusData?.runtimeControls;

  const resolvedControlSupport = React.useMemo(() => {
    if (!selectedPhaseRuntimeControls) {
      return {
        canPause: false,
        canResume: false,
        canStop: false,
        canRestart: false,
      } as const;
    }

    return {
      canPause: Boolean(selectedPhaseRuntimeControls.canPause),
      canResume: Boolean(selectedPhaseRuntimeControls.canResume),
      canStop: Boolean(selectedPhaseRuntimeControls.canStop),
      canRestart: Boolean(selectedPhaseRuntimeControls.canRestart),
    } as const;
  }, [selectedPhaseRuntimeControls]);

  const canPauseSelectedPhase = resolvedControlSupport.canPause;
  const canStopCampaign = resolvedControlSupport.canStop;
  const canRunSelectedPhase = selectedPhaseStatus === 'paused'
    ? resolvedControlSupport.canResume
    : resolvedControlSupport.canRestart;

  const runButtonLabel = isSelectedPhasePaused ? 'Resume Selected Phase' : 'Run Selected Phase';
  const runButtonBusyLabel = isSelectedPhasePaused ? 'Resuming…' : 'Starting…';

  const phaseOptions = React.useMemo(() => {
    return pipelinePhases
      .map((phase) => {
        const normalized = normalizeToApiPhase(String(phase.key).toLowerCase());
        if (!normalized) {
          return null;
        }
        return {
          value: normalized as ApiPhase,
          label: phase.label ?? getPhaseDisplayName(normalized as ApiPhase),
          status: phase.status,
        };
      })
      .filter((option): option is { value: ApiPhase; label: string; status: PipelinePhase['status'] } => Boolean(option));
  }, [pipelinePhases]);

  const failedPhaseKeys = React.useMemo(() => {
    return pipelinePhases.reduce<ApiPhase[]>((acc, phase) => {
      if (phase.status !== 'failed') {
        return acc;
      }
      const normalized = normalizeToApiPhase(String(phase.key).toLowerCase());
      if (normalized && !acc.includes(normalized as ApiPhase)) {
        acc.push(normalized as ApiPhase);
      }
      return acc;
    }, []);
  }, [pipelinePhases]);

  const orderedPhaseKeys = React.useMemo(() => {
    const available = new Set<ApiPhase>(phaseOptions.map((option) => option.value));
    return API_PHASE_ORDER.filter((phase) => available.has(phase));
  }, [phaseOptions]);

  const preferredPhaseSelection = React.useMemo<ApiPhase>(() => {
    if (failedPhaseKeys.length > 0) {
      return failedPhaseKeys[0]!;
    }
    return phaseOptions[0]?.value ?? ('validation' as ApiPhase);
  }, [failedPhaseKeys, phaseOptions]);

  const isSelectedPhaseAvailable = React.useMemo(() => {
    return phaseOptions.some((option) => option.value === selectedPhaseKey);
  }, [phaseOptions, selectedPhaseKey]);

  React.useEffect(() => {
    if (!activePhaseKey) {
      return;
    }
    const shouldSyncToActive = !phaseSelectTouched || !isSelectedPhaseAvailable;
    if (!shouldSyncToActive) {
      return;
    }
    if (selectedPhaseKey !== activePhaseKey) {
      setSelectedPhaseKey(activePhaseKey as ApiPhase);
    }
  }, [activePhaseKey, selectedPhaseKey, phaseSelectTouched, isSelectedPhaseAvailable]);

  React.useEffect(() => {
    if (activePhaseKey) {
      return;
    }
    const shouldSyncToPreferred = !phaseSelectTouched || !isSelectedPhaseAvailable;
    if (!shouldSyncToPreferred) {
      return;
    }
    if (selectedPhaseKey !== preferredPhaseSelection) {
      setSelectedPhaseKey(preferredPhaseSelection);
    }
  }, [activePhaseKey, preferredPhaseSelection, selectedPhaseKey, phaseSelectTouched, isSelectedPhaseAvailable]);

  const hasFailedPhases = failedPhaseKeys.length > 0;
  const isBulkActionRunning = bulkAction !== 'idle';
  const isRetryingFailed = bulkAction === 'retryFailed';
  const isRestartingCampaign = bulkAction === 'restartCampaign';
  const isControlStatusLoading = Boolean(
    selectedPhaseKey && (isPhaseStatusLoading || isPhaseStatusFetching)
  );
  const runtimeControlsUnavailable = Boolean(
    selectedPhaseKey && !selectedPhaseRuntimeControls && !isControlStatusLoading
  );
  const runtimeControlStatusMessage = React.useMemo(() => {
    if (!selectedPhaseKey) {
      return null;
    }
    if (isControlStatusLoading) {
      return 'Syncing runtime controls from backend…';
    }
    if (runtimeControlsUnavailable) {
      return 'Runtime controls unavailable—actions remain disabled until the backend exposes updated capabilities.';
    }
    return null;
  }, [isControlStatusLoading, runtimeControlsUnavailable, selectedPhaseKey]);
  const isActionDisabled = isStartPhaseLoading || isPausePhaseLoading || isResumePhaseLoading || isStopCampaignLoading || isBulkActionRunning || isControlStatusLoading;

  const startPhaseInternal = React.useCallback(
    async (phaseKey: ApiPhase) => {
      if (!campaignId) {
        throw new Error('Campaign not found');
      }
      await startPhaseMutation({
        campaignId,
        phase: phaseKey as CampaignPhaseEnum,
      }).unwrap();
    },
    [campaignId, startPhaseMutation]
  );

  const resumePhaseInternal = React.useCallback(
    async (phaseKey: ApiPhase) => {
      if (!campaignId) {
        throw new Error('Campaign not found');
      }
      await resumePhaseMutation({
        campaignId,
        phase: phaseKey as CampaignPhaseEnum,
      }).unwrap();
    },
    [campaignId, resumePhaseMutation]
  );

  const handleRunSelectedPhase = React.useCallback(async () => {
    if (!selectedPhaseKey || !canRunSelectedPhase) {
      return;
    }
    try {
      const isResume = selectedPhaseStatus === 'paused';
      if (isResume) {
        await resumePhaseInternal(selectedPhaseKey);
      } else {
        await startPhaseInternal(selectedPhaseKey);
      }
      toast({
        title: isResume
          ? `${getPhaseDisplayName(selectedPhaseKey)} resume requested`
          : `${getPhaseDisplayName(selectedPhaseKey)} queued`,
        description: isResume
          ? 'Phase resume requested successfully.'
          : 'Phase restart requested successfully.',
      });
    } catch (error) {
      toast({
        title: `Failed to start ${getPhaseDisplayName(selectedPhaseKey)}`,
        description: formatPhaseActionError(error),
        variant: 'destructive',
      });
    }
  }, [canRunSelectedPhase, resumePhaseInternal, selectedPhaseKey, selectedPhaseStatus, startPhaseInternal, toast]);

  const handlePauseSelectedPhase = React.useCallback(async () => {
    if (!selectedPhaseKey || !campaignId || !canPauseSelectedPhase) {
      return;
    }
    try {
      await pausePhaseMutation({ campaignId, phase: selectedPhaseKey as CampaignPhaseEnum }).unwrap();
      toast({
        title: `${getPhaseDisplayName(selectedPhaseKey)} pause requested`,
        description: 'Phase pause signal sent successfully.',
      });
    } catch (error) {
      toast({
        title: 'Unable to pause phase',
        description: formatPhaseActionError(error),
        variant: 'destructive',
      });
    }
  }, [campaignId, canPauseSelectedPhase, pausePhaseMutation, selectedPhaseKey, toast]);

  const handleStopCampaign = React.useCallback(async () => {
    if (!campaignId || !canStopCampaign) {
      return;
    }
    try {
      await stopCampaignMutation(campaignId).unwrap();
      toast({
        title: 'Campaign stop requested',
        description: 'Active phase will wind down safely.',
      });
    } catch (error) {
      toast({
        title: 'Unable to stop campaign',
        description: formatPhaseActionError(error),
        variant: 'destructive',
      });
    }
  }, [campaignId, canStopCampaign, stopCampaignMutation, toast]);

  const handleRetryFailedPhases = React.useCallback(async () => {
    if (!failedPhaseKeys.length) {
      return;
    }
    setBulkAction('retryFailed');
    try {
      for (const phaseKey of failedPhaseKeys) {
        await startPhaseInternal(phaseKey);
      }
      toast({
        title: 'Retry queued',
        description: `Restarted ${failedPhaseKeys.length} failed phase${failedPhaseKeys.length > 1 ? 's' : ''}.`,
      });
    } catch (error) {
      toast({
        title: 'Unable to retry failed phases',
        description: formatPhaseActionError(error),
        variant: 'destructive',
      });
    } finally {
      setBulkAction('idle');
    }
  }, [failedPhaseKeys, startPhaseInternal, toast]);

  const handleRestartCampaign = React.useCallback(async () => {
    if (!orderedPhaseKeys.length || !campaignId) {
      return;
    }
    setBulkAction('restartCampaign');
    try {
      const response = await restartCampaignMutation(campaignId).unwrap();
      const restartedCount = response?.phasesRestarted?.length ?? 0;
      const errorCount = response?.restartErrors?.length ?? 0;
      const baseDescription = restartedCount
        ? `Restarted ${restartedCount} phase${restartedCount === 1 ? '' : 's'} in order`
        : 'No eligible phases were restarted';
      const description = errorCount > 0 ? `${baseDescription}, but some phases reported errors.` : `${baseDescription}.`;
      toast({
        title: errorCount > 0 ? 'Campaign restart partially queued' : 'Campaign restart queued',
        description,
        variant: errorCount > 0 ? 'destructive' : undefined,
      });
    } catch (error) {
      toast({
        title: 'Unable to restart campaign',
        description: formatPhaseActionError(error),
        variant: 'destructive',
      });
    } finally {
      setBulkAction('idle');
    }
  }, [campaignId, orderedPhaseKeys.length, restartCampaignMutation, toast]);

  const campaignErrorMessage = React.useMemo(() => {
    const firstFailedPhaseErrorDetails = statusSnapshot?.phases?.find((phase) => phase.status === 'failed')?.errorDetails;
    const detailsMessage = extractPhaseErrorDetailsMessage(firstFailedPhaseErrorDetails);
    if (detailsMessage) {
      return detailsMessage;
    }
    return sanitizePhaseErrorText(statusSnapshot?.errorMessage);
  }, [statusSnapshot]);

  const failedPhaseSummaries = React.useMemo(() => {
    if (!statusSnapshot?.phases?.length) {
      return [] as Array<{ key: string; label: string; description: string; failedAtLabel: string | null }>;
    }

    return statusSnapshot.phases
      .filter((phase) => phase.status === 'failed')
      .map((phase, index) => ({
        key: `${phase.phase}-${phase.failedAt ?? index}`,
        label: formatPhaseLabelFromSnapshot(phase.phase),
        description: extractPhaseErrorDetailsMessage(phase.errorDetails)
          ?? sanitizePhaseErrorText(phase.errorMessage)
          ?? 'Phase failed',
        failedAtLabel: formatFailureTimestamp(phase.failedAt),
      }));
  }, [statusSnapshot]);

  const shouldShowFailureSummary = Boolean(campaignErrorMessage || failedPhaseSummaries.length > 0);

  // Transform metrics data to KPI format
  const kpis: CampaignKpi[] = React.useMemo(() => {
    if (!metricsData) return [];

    return [
      {
        label: 'High Potential',
        value: metricsData.highPotential || 0,
        format: 'number'
      },
      {
        label: 'Leads Generated',
        value: metricsData.leads || 0,
        format: 'number'
      },
      {
        label: 'Keyword Coverage',
        value: metricsData.keywordCoveragePct || 0,
        format: 'percentage'
      },
      {
        label: 'Avg Richness',
        value: metricsData.avgRichness || 0,
        format: 'number'
      },
      {
        label: 'Warning Rate',
        value: metricsData.warningRatePct || 0,
        format: 'percentage'
      },
      {
        label: 'Total Analyzed',
        value: metricsData.totalAnalyzed || 0,
        format: 'number'
      }
    ];
  }, [metricsData]);

  // Transform metrics data to warning format
  const warningData: WarningData[] = React.useMemo(() => {
    if (!metricsData) return [];
    
    const warnings: WarningData[] = [];
    const totalDomains = metricsData.totalAnalyzed || 1;
    
    if (metricsData.stuffing && metricsData.stuffing > 0) {
      warnings.push({
        type: 'stuffing',
        count: metricsData.stuffing,
        rate: (metricsData.stuffing / totalDomains) * 100,
        severity: metricsData.stuffing > totalDomains * 0.2 ? 'critical' : 
                 metricsData.stuffing > totalDomains * 0.1 ? 'high' : 
                 metricsData.stuffing > totalDomains * 0.05 ? 'medium' : 'low'
      });
    }
    
    if (metricsData.repetition && metricsData.repetition > 0) {
      warnings.push({
        type: 'repetition',
        count: metricsData.repetition,
        rate: (metricsData.repetition / totalDomains) * 100,
        severity: metricsData.repetition > totalDomains * 0.15 ? 'critical' : 
                 metricsData.repetition > totalDomains * 0.08 ? 'high' : 
                 metricsData.repetition > totalDomains * 0.03 ? 'medium' : 'low'
      });
    }
    
    if (metricsData.anchor && metricsData.anchor > 0) {
      warnings.push({
        type: 'anchor',
        count: metricsData.anchor,
        rate: (metricsData.anchor / totalDomains) * 100,
        severity: metricsData.anchor > totalDomains * 0.3 ? 'critical' : 
                 metricsData.anchor > totalDomains * 0.2 ? 'high' : 
                 metricsData.anchor > totalDomains * 0.1 ? 'medium' : 'low'
      });
    }
    
    return warnings;
  }, [metricsData]);

  // Transform for warning bar and pills
  const _warningBarData: WarningBarData[] = warningData.map(w => ({
    type: w.type,
    count: w.count,
    rate: w.rate,
    severity: w.severity
  }));

  const _warningPillData: WarningPillData[] = warningData.map(w => ({
    type: w.type,
    count: w.count,
    severity: w.severity
  }));

  // Configuration items for ConfigSummaryPanel
  const configItems = React.useMemo(() => {
    if (!enrichedData?.campaign) return [];
    
    const campaign = enrichedData.campaign;
    
    // Extract target domains from funnel data or progress
    const targetDomains = funnelData?.generated || campaign.progress?.totalDomains || 0;
    
    // Map backend status to display format
    const statusDisplay = campaign.status === 'draft' ? 'Draft' :
                          campaign.status === 'running' ? 'Running' :
                          campaign.status === 'paused' ? 'Paused' :
                          campaign.status === 'completed' ? 'Completed' :
                          campaign.status === 'failed' ? 'Failed' :
                          campaign.status === 'cancelled' ? 'Cancelled' : 'Unknown';
    
    return [
      { label: 'Campaign Type', value: 'Lead Generation', type: 'badge' as const },
      { label: 'Target Domains', value: targetDomains, type: 'number' as const },
      { label: 'Created', value: campaign.createdAt ? new Date(campaign.createdAt).toLocaleDateString() : 'Unknown', type: 'date' as const },
      { label: 'Status', value: statusDisplay, type: 'badge' as const },
      { label: 'Name', value: campaign.name || 'N/A', type: 'text' as const }
    ];
  }, [enrichedData, funnelData]);

  // Handle loading states
  if (!campaignId) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <h2 className="text-lg font-semibold">Invalid Campaign</h2>
          <p className="text-gray-600">Campaign ID is required</p>
        </div>
      </div>
    );
  }

  const isLoading = metricsLoading || funnelLoading;
  const hasError = metricsError || funnelError;
  const sseStatusLabel = (() => {
    if (!sseEnabled) {
      return isAuthenticated ? 'Disconnected' : 'Login required';
    }
    if (sseError) return `Disconnected (${sseError})`;
    if (isConnected) return 'Live';
    if (hasEverConnected) return 'Reconnecting…';
    return 'Connecting…';
  })();

  if (hasError) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <h2 className="text-lg font-semibold">Error Loading Campaign</h2>
          <p className="text-gray-600">
            {typeof metricsError === 'string'
              ? metricsError
              : typeof funnelError === 'string'
                ? funnelError
                : 'Unknown error occurred'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={_className}>
      {/* Header with SSE connection status */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Campaign Dashboard
        </h1>
        <div className="flex items-center gap-2 text-sm">
          <div
            className={`w-2 h-2 rounded-full ${
              !sseEnabled
                ? 'bg-gray-400'
                :
              isConnected && !sseError
                ? 'bg-green-500'
                : sseError
                ? 'bg-red-500'
                : hasEverConnected
                ? 'bg-yellow-400'
                : 'bg-yellow-400'
            }`}
            aria-hidden="true"
          />
          <span className="text-gray-600 dark:text-gray-400">
            {sseStatusLabel}
          </span>
        </div>
      </div>

      {/* Pipeline Status Bar */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Pipeline Status</h2>
        {shouldShowFailureSummary && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Campaign requires attention</AlertTitle>
            <AlertDescription>
              <div className="space-y-3">
                {campaignErrorMessage && (
                  <p>{campaignErrorMessage}</p>
                )}
                {failedPhaseSummaries.length > 0 && (
                  <ul className="space-y-2">
                    {failedPhaseSummaries.map((phase) => (
                      <li key={phase.key} className="text-sm">
                        <p className="font-medium text-red-900 dark:text-red-100">{phase.label}</p>
                        <p className="text-red-900/90 dark:text-red-200">{phase.description}</p>
                        {phase.failedAtLabel && (
                          <p className="text-xs text-muted-foreground">Failed at {phase.failedAtLabel}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
        <PipelineBar phases={pipelinePhases} />
        <div className="mt-4 rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-900/40">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex-1 min-w-[220px]">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Select phase
              </p>
              <Select
                value={selectedPhaseKey}
                onValueChange={(value) => {
                  setPhaseSelectTouched(true);
                  setSelectedPhaseKey(value as ApiPhase);
                }}
              >
                <SelectTrigger className="w-full min-w-[220px]">
                  <SelectValue placeholder="Choose a phase" />
                </SelectTrigger>
                <SelectContent>
                  {phaseOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-2 text-xs text-muted-foreground">
                Phases can be rerun even after completion for troubleshooting or updated data.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleRunSelectedPhase}
                disabled={!selectedPhaseKey || isActionDisabled || !canRunSelectedPhase}
                className="min-w-[150px]"
              >
                {isStartPhaseLoading && !isBulkActionRunning && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isStartPhaseLoading && !isBulkActionRunning ? runButtonBusyLabel : runButtonLabel}
              </Button>
              <Button
                variant="outline"
                onClick={handlePauseSelectedPhase}
                disabled={!selectedPhaseKey || isActionDisabled || !canPauseSelectedPhase}
                className="min-w-[150px]"
              >
                {isPausePhaseLoading && !isBulkActionRunning && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Pause Phase
              </Button>
              <Button
                variant="destructive"
                onClick={handleStopCampaign}
                disabled={!selectedPhaseKey || isActionDisabled || !canStopCampaign}
                className="min-w-[150px]"
              >
                {isStopCampaignLoading && !isBulkActionRunning && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Stop Campaign
              </Button>
              <Button
                variant="secondary"
                onClick={handleRetryFailedPhases}
                disabled={!hasFailedPhases || isActionDisabled}
                className="min-w-[150px]"
              >
                {isRetryingFailed && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Retry Failed Phases
              </Button>
              <Button
                variant="outline"
                onClick={handleRestartCampaign}
                disabled={isActionDisabled}
                className="min-w-[150px]"
              >
                {isRestartingCampaign && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Restart Campaign
              </Button>
            </div>
            {runtimeControlStatusMessage && (
              <p className="text-xs text-muted-foreground max-w-md" role="status">
                {runtimeControlStatusMessage}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Key Metrics</h2>
        <KpiGrid kpis={kpis} loading={isLoading} />
      </div>

      {/* Two-column layout for detailed views */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column: Funnel */}
        <div className="space-y-6">
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border">
            {funnelLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : funnelData ? (
              <FunnelSnapshot data={funnelData} />
            ) : (
              <div className="text-center p-8 text-gray-500">
                <p>Funnel data not available</p>
              </div>
            )}
          </div>

          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border">
            <LeadResultsPanel
              domains={domainItems}
              aggregates={leadAggregates}
              isLoading={domainsLoading}
              isUpdating={domainsFetching}
              loadedCount={domainItems.length}
              totalAvailable={totalLeadDomains}
              canLoadMore={canLoadMoreLeadData}
              onLoadMore={canLoadMoreLeadData ? handleLoadMoreLeads : undefined}
              error={leadPanelError}
            />
          </div>

          {/* Config Summary */}
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border">
            <ConfigSummary 
              config={configItems}
              title="Campaign Configuration"
            />
          </div>
        </div>

        {/* Right column: Recommendations and other insights */}
        <div className="space-y-6">
          {/* Recommendations */}
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border">
            {recsLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : recommendationsData?.recommendations ? (
              <RecommendationPanel 
                recommendations={recommendationsData.recommendations.map((r: CampaignRecommendation): Recommendation => ({
                  id: r.id ?? `${r.rationaleCode}-${r.message}`,
                  title: r.message,
                  detail: r.message,
                  rationale: r.rationaleCode,
                  severity: 'info'
                }))}
              />
            ) : (
              <div className="text-center p-8 text-gray-500">
                <h3 className="text-lg font-medium mb-2">No Recommendations</h3>
                <p>Recommendations will appear based on campaign performance</p>
              </div>
            )}
          </div>

          {/* Additional insights panels - now implemented */}
          <section aria-labelledby="insights-heading">
            <h3 id="insights-heading" className="sr-only">Additional Insights</h3>
            {warningData.length > 0 ? (
              <WarningDistribution
                warnings={warningData}
                totalDomains={metricsData?.totalAnalyzed || 0}
                aria-label="Warning analysis and distribution"
              />
            ) : (
              <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border text-center text-gray-500">
                <h3 className="text-lg font-medium mb-2">No Quality Issues</h3>
                <p>All domains are passing quality checks</p>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Full-width momentum panel at bottom if data exists */}
      {momentumData && (momentumData.moversUp?.length > 0 || momentumData.moversDown?.length > 0) && (
        <section className="mt-8" aria-labelledby="momentum-full-heading">
          <h2 id="momentum-full-heading" className="text-lg font-semibold mb-4">Momentum Analysis</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <MoverList
              movers={momentumData.moversUp || []}
              type="up"
              title="Top Gainers"
              maxItems={10}
              showScores={true}
              showRanks={true}
              aria-label="Detailed list of top gaining domains"
            />
            <MoverList
              movers={momentumData.moversDown || []}
              type="down"
              title="Top Decliners"
              maxItems={10}
              showScores={true}
              showRanks={true}
              aria-label="Detailed list of top declining domains"
            />
          </div>
          
          {momentumData.histogram && (
            <div className="mt-6">
              <Histogram
                bins={momentumData.histogram.map((count: number, idx: number) => ({
                  bucket: `bin_${idx}`,
                  count
                }))}
                title="Score Delta Distribution"
                orientation="horizontal"
                colorScheme="diverging"
                showStats={true}
                aria-label="Comprehensive score change distribution"
              />
            </div>
          )}
        </section>
      )}

      {/* Loading overlay for initial load */}
      {isLoading && !metricsData && (
        <div 
          className="fixed inset-0 bg-black/10 flex items-center justify-center z-50"
          role="progressbar"
          aria-label="Loading campaign data"
        >
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Loading unified campaign experience...</p>
          </div>
        </div>
      )}
    </div>
  );
}