
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
import { PipelineTimeline } from './PipelineTimeline';
import type { PipelinePhase } from './PipelineTimeline';
import { FunnelSnapshot } from './FunnelSnapshot';
import { RecommendationPanel } from './RecommendationPanel';
import { LeadResultsPanel } from './LeadResultsPanel';
// Phase 4: Progressive Disclosure Gates
import { FunnelGate, LeadsGate, KpiGate, MomentumGate, RecommendationsGate, WarningsGate } from './gates';
import { 
  FunnelPlaceholder, 
  KpiPlaceholder, 
  LeadsPlaceholder, 
  RecommendationsPlaceholder, 
  WarningsPlaceholder 
} from './placeholders';
import type { CampaignRecommendation } from '@/lib/api-client/models/campaign-recommendation';
import type { Recommendation } from '@/types/campaignMetrics';
import { ExecutionHeader } from './ExecutionHeader';
import { ConfigInspector } from './ConfigInspector';
import { WarningDistribution } from './WarningDistribution';
import { MoverList } from './MoverList';
import { Histogram } from './Histogram';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { useCampaignSSE } from '@/hooks/useCampaignSSE';
import { 
  useGetCampaignMetricsQuery,
  useGetCampaignFunnelQuery,
  useGetCampaignRecommendationsQuery,
  useGetCampaignDomainsQuery,
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
import type { CampaignPhasesStatusResponsePhasesInner } from '@/lib/api-client/models/campaign-phases-status-response-phases-inner';
import { useToast } from '@/hooks/use-toast';
import { useControlState } from '@/hooks/useControlState';

import type { CampaignKpi } from '../types';
import type { WarningData } from './WarningDistribution';

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

  const fetchLike = error as (FetchBaseQueryError & { data?: unknown }) | undefined;
  if (fetchLike && typeof fetchLike === 'object' && 'status' in fetchLike) {
    const data = fetchLike.data as
      | {
          message?: unknown;
          error?: { message?: unknown; code?: unknown };
          details?: Record<string, unknown>;
        }
      | undefined;

    const payloadMessage =
      (typeof data?.error?.message === 'string' ? data.error.message : null)
      ?? (typeof data?.message === 'string' ? data.message : null)
      ?? extractPhaseErrorDetailsMessage((data?.details as Record<string, unknown> | null) ?? null);

    const normalizedPayloadMessage = sanitizePhaseErrorText(payloadMessage);
    if (normalizedPayloadMessage) {
      return normalizedPayloadMessage;
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
  const [startPhaseMutation, { isLoading: _isStartPhaseLoading }] = useStartPhaseStandaloneMutation();
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

  const handlePhaseTerminalEvent = React.useCallback(() => {
    refreshRealtimeData({ force: true });
  }, [refreshRealtimeData]);
  const { data: recommendationsData, isLoading: recsLoading } = useGetCampaignRecommendationsQuery(campaignId);
  const { data: domainsList, isLoading: domainsLoading, isFetching: domainsFetching, error: domainsError } = useGetCampaignDomainsQuery(
    { campaignId, limit: leadResultLimit, offset: 0 },
    { skip: !campaignId }
  );
  const { data: momentumData } = useGetCampaignMomentumQuery(campaignId);

  const { isAuthenticated } = useAuth();

  // Real-time phase updates
  // Only gate on authentication; `isInitialized` has proven unreliable and can prevent the SSE URL from being set.
  const sseEnabled = Boolean(campaignId && isAuthenticated);

  const { isConnected, error: sseError } = useCampaignSSE({
    campaignId,
    autoConnect: sseEnabled,
    events: {
      onPhaseCompleted: handlePhaseTerminalEvent,
      onPhaseFailed: handlePhaseTerminalEvent,
      onAnalysisCompleted: handlePhaseTerminalEvent,
      onAnalysisFailed: handlePhaseTerminalEvent,
      onError: (message) => {
        console.error('SSE error:', message);
      },
    },
  });

  const [hasEverConnected, setHasEverConnected] = React.useState(false);
  React.useEffect(() => {
    if (isConnected) {
      setHasEverConnected(true);
    }
  }, [isConnected]);

  React.useEffect(() => {
    if (!hasEverConnected) {
      return;
    }
    refreshRealtimeData({ force: true });
  }, [hasEverConnected, refreshRealtimeData]);

  const { data: statusSnapshot, refetch: refetchStatusSnapshot } = useGetCampaignStatusQuery(campaignId);
  // Phase 5: phaseConfigsData now loaded lazily in ConfigInspector drawer

  // Phase 1 ExecutionHeader: Query runtime controls for the controlPhase (backend authority)
  const controlPhaseKey = statusSnapshot?.controlPhase 
    ? normalizeToApiPhase(statusSnapshot.controlPhase.toLowerCase()) as ApiPhase | null
    : null;
  
  const {
    data: controlPhaseStatusData,
    isFetching: isControlPhaseStatusFetching,
    isLoading: isControlPhaseStatusLoading,
  } = useGetPhaseStatusStandaloneQuery(
    { campaignId, phase: (controlPhaseKey ?? 'validation') as CampaignPhaseEnum },
    { skip: !campaignId || !controlPhaseKey }
  );

  // Derive unified control state for ExecutionHeader
  const executionControlState = useControlState(
    statusSnapshot,
    controlPhaseStatusData?.runtimeControls,
    isControlPhaseStatusLoading || isControlPhaseStatusFetching
  );

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

  const pipelinePhases = React.useMemo(() => {
    const byPhase = new Map<ApiPhase, CampaignPhasesStatusResponsePhasesInner>();

    const statusRank = (status?: string): number => {
      switch (status) {
        case 'failed':
          return 60;
        case 'paused':
          return 50;
        case 'in_progress':
        case 'running':
          return 40;
        case 'completed':
          return 30;
        case 'configured':
        case 'ready':
          return 20;
        case 'not_started':
          return 10;
        default:
          return 0;
      }
    };

    const shouldReplaceSnapshot = (
      existing: CampaignPhasesStatusResponsePhasesInner,
      incoming: CampaignPhasesStatusResponsePhasesInner
    ): boolean => {
      const existingRank = statusRank(existing.status);
      const incomingRank = statusRank(incoming.status);
      if (incomingRank !== existingRank) return incomingRank > existingRank;

      // Tie-breakers: prefer whichever has started/failed/completed timestamps or higher progress.
      const existingHasTimeline = Boolean(existing.startedAt || existing.completedAt || existing.failedAt);
      const incomingHasTimeline = Boolean(incoming.startedAt || incoming.completedAt || incoming.failedAt);
      if (incomingHasTimeline !== existingHasTimeline) return incomingHasTimeline;

      const existingProgress = typeof existing.progressPercentage === 'number' ? existing.progressPercentage : 0;
      const incomingProgress = typeof incoming.progressPercentage === 'number' ? incoming.progressPercentage : 0;
      return incomingProgress > existingProgress;
    };

    statusSnapshot?.phases?.forEach((phaseSnapshot) => {
      const normalized = normalizeToApiPhase(String(phaseSnapshot.phase).toLowerCase());
      if (!normalized) return;
      const key = normalized as ApiPhase;
      const existing = byPhase.get(key);
      if (!existing || shouldReplaceSnapshot(existing, phaseSnapshot)) {
        byPhase.set(key, phaseSnapshot);
      }
    });

    return API_PHASE_ORDER.map((phaseKey) => {
      const snap = byPhase.get(phaseKey);
      return {
        key: phaseKey,
        label: getPhaseDisplayName(phaseKey),
        status: (snap?.status as PipelinePhase['status']) ?? 'not_started',
        progressPercentage: snap?.progressPercentage ?? 0,
        startedAt: snap?.startedAt,
        completedAt: snap?.completedAt,
        failedAt: snap?.failedAt,
        errorMessage: snap?.errorMessage,
        errorDetails: snap?.errorDetails,
      } satisfies PipelinePhase;
    });
  }, [statusSnapshot]);

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

  // Phase selector control support (kept for potential future use but not shown in UI)
  const _canPauseSelectedPhase = resolvedControlSupport.canPause;
  // Stop is a campaign-level action (stops whichever phase is active), so it should not depend
  // on the currently selected phase's runtimeControls.
  const _canStopCampaign = React.useMemo(() => {
    return pipelinePhases.some((phase) => phase.status === 'in_progress' || phase.status === 'paused');
  }, [pipelinePhases]);
  const _canRunSelectedPhase = isSelectedPhasePaused
    ? resolvedControlSupport.canResume
    : resolvedControlSupport.canRestart;

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
    const pausedKeys = pipelinePhases
      .map((phase) => {
        if (phase.status !== 'paused') {
          return null;
        }
        return normalizeToApiPhase(String(phase.key).toLowerCase());
      })
      .filter((key): key is ApiPhase => Boolean(key));

    if (pausedKeys.length > 0) {
      const pausedSet = new Set<ApiPhase>(pausedKeys);
      const earliestPaused = API_PHASE_ORDER.find((phaseKey) => pausedSet.has(phaseKey));
      return earliestPaused ?? pausedKeys[0]!;
    }

    if (failedPhaseKeys.length > 0) {
      return failedPhaseKeys[0]!;
    }

    return phaseOptions[0]?.value ?? ('validation' as ApiPhase);
  }, [failedPhaseKeys, phaseOptions, pipelinePhases]);

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

  // Bulk action state
  const _isBulkActionRunning = bulkAction !== 'idle';
  const isRetryingFailed = bulkAction === 'retryFailed';
  const isRestartingCampaign = bulkAction === 'restartCampaign';

  // Phase selector control status (kept for internal phase operations)
  const _isControlStatusLoading = Boolean(selectedPhaseKey && (isPhaseStatusLoading || isPhaseStatusFetching));
  const _runtimeControlsUnavailable = Boolean(
    selectedPhaseKey && !selectedPhaseRuntimeControls && !_isControlStatusLoading
  );

  const startPhaseInternal = React.useCallback(
    async (phaseKey: ApiPhase) => {
      if (!campaignId) {
        throw new Error('Campaign not found');
      }
      await startPhaseMutation({
        campaignId,
        phase: phaseKey as CampaignPhaseEnum,
      }).unwrap();

      // Ensure the pipeline snapshot catches up immediately (SSE may lag or omit control-state transitions).
      refetchStatusSnapshot();
    },
    [campaignId, refetchStatusSnapshot, startPhaseMutation]
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

      // Ensure the pipeline snapshot catches up immediately (SSE may lag or omit control-state transitions).
      refetchStatusSnapshot();
    },
    [campaignId, refetchStatusSnapshot, resumePhaseMutation]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // DEPRECATED HANDLERS (Phase 2 cleanup)
  // These were for the per-phase selector UI. Kept as underscore-prefixed
  // for potential future use or gradual removal.
  // ═══════════════════════════════════════════════════════════════════════════
  const _handleRunSelectedPhase = React.useCallback(async () => {
    if (!selectedPhaseKey || !_canRunSelectedPhase) {
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
  }, [_canRunSelectedPhase, resumePhaseInternal, selectedPhaseKey, selectedPhaseStatus, startPhaseInternal, toast]);

  const _handlePauseSelectedPhase = React.useCallback(async () => {
    if (!selectedPhaseKey || !campaignId || !_canPauseSelectedPhase) {
      return;
    }
    try {
      await pausePhaseMutation({ campaignId, phase: selectedPhaseKey as CampaignPhaseEnum }).unwrap();

      // Ensure the pipeline snapshot catches up immediately (SSE may lag or omit control-state transitions).
      refetchStatusSnapshot();
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
  }, [campaignId, _canPauseSelectedPhase, pausePhaseMutation, refetchStatusSnapshot, selectedPhaseKey, toast]);

  const _handleStopCampaign = React.useCallback(async () => {
    if (!campaignId || !_canStopCampaign) {
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
  }, [campaignId, _canStopCampaign, stopCampaignMutation, toast]);

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

  // ============================================================================
  // Phase 1: ExecutionHeader Handlers (using controlPhase as authority)
  // These operate on the backend-designated controlPhase, not user selection
  // ============================================================================
  
  const handleExecutionPause = React.useCallback(async () => {
    if (!controlPhaseKey || !campaignId || !executionControlState.canPause) {
      return;
    }
    try {
      await pausePhaseMutation({ campaignId, phase: controlPhaseKey as CampaignPhaseEnum }).unwrap();
      refetchStatusSnapshot();
      toast({
        title: `${executionControlState.phaseLabel} pause requested`,
        description: 'Phase will pause at next checkpoint.',
      });
    } catch (error) {
      toast({
        title: 'Unable to pause',
        description: formatPhaseActionError(error),
        variant: 'destructive',
      });
    }
  }, [campaignId, controlPhaseKey, executionControlState.canPause, executionControlState.phaseLabel, pausePhaseMutation, refetchStatusSnapshot, toast]);

  const handleExecutionResume = React.useCallback(async () => {
    if (!controlPhaseKey || !campaignId || !executionControlState.canResume) {
      return;
    }
    try {
      await resumePhaseMutation({ campaignId, phase: controlPhaseKey as CampaignPhaseEnum }).unwrap();
      refetchStatusSnapshot();
      toast({
        title: `${executionControlState.phaseLabel} resumed`,
        description: 'Phase execution continuing.',
      });
    } catch (error) {
      toast({
        title: 'Unable to resume',
        description: formatPhaseActionError(error),
        variant: 'destructive',
      });
    }
  }, [campaignId, controlPhaseKey, executionControlState.canResume, executionControlState.phaseLabel, refetchStatusSnapshot, resumePhaseMutation, toast]);

  const handleExecutionStop = React.useCallback(async () => {
    if (!campaignId || !executionControlState.canStop) {
      return;
    }
    try {
      await stopCampaignMutation(campaignId).unwrap();
      refetchStatusSnapshot();
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
  }, [campaignId, executionControlState.canStop, refetchStatusSnapshot, stopCampaignMutation, toast]);

  // Track loading states for ExecutionHeader buttons
  const isExecutionPauseLoading = isPausePhaseLoading;
  const isExecutionResumeLoading = isResumePhaseLoading;
  const isExecutionStopLoading = isStopCampaignLoading;

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
      {/* ═══════════════════════════════════════════════════════════════════════
          EXECUTION HEADER (Phase 2 Refactor)
          Primary execution surface - "What's happening now?" + "What can I do?"
          Source of truth: controlPhase from statusSnapshot
          Controls via ControlDock pattern - contextual buttons only
          ═══════════════════════════════════════════════════════════════════════ */}
      <ExecutionHeader
        controlState={executionControlState}
        isConnected={isConnected}
        sseError={sseError}
        onPause={handleExecutionPause}
        onResume={handleExecutionResume}
        onStop={handleExecutionStop}
        onRestart={handleRestartCampaign}
        onRetryFailed={handleRetryFailedPhases}
        isPauseLoading={isExecutionPauseLoading}
        isResumeLoading={isExecutionResumeLoading}
        isStopLoading={isExecutionStopLoading}
        isRestartLoading={isRestartingCampaign}
        isRetryLoading={isRetryingFailed}
        configButton={
          <ConfigInspector 
            campaignId={campaignId} 
            funnelData={funnelData}
          />
        }
      />

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
        <PipelineTimeline phases={pipelinePhases} />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          KPI Grid (Phase 4 Gated)
          Shows only when totalAnalyzed > 0 to avoid empty/meaningless metrics
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Key Metrics</h2>
        <KpiGate 
          metricsData={metricsData} 
          currentPhase={executionControlState.controlPhase ?? undefined}
          placeholder={
            <KpiPlaceholder 
              currentPhase={executionControlState.controlPhase ?? undefined}
              isRunning={executionControlState.status === 'running'}
            />
          }
        >
          <KpiGrid kpis={kpis} loading={isLoading} />
        </KpiGate>
      </div>

      {/* Two-column layout for detailed views */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column: Funnel & Leads */}
        <div className="space-y-6">
          {/* ═══════════════════════════════════════════════════════════════════════
              Funnel Snapshot (Phase 4 Gated)
              Shows only when generated > 0 to avoid empty funnel visualization
              ═══════════════════════════════════════════════════════════════════════ */}
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border">
            {funnelLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <FunnelGate 
                funnelData={funnelData} 
                currentPhase={executionControlState.controlPhase ?? undefined}
                placeholder={
                  <FunnelPlaceholder 
                    currentPhase={executionControlState.controlPhase ?? undefined}
                    isRunning={executionControlState.status === 'running'}
                  />
                }
              >
                <FunnelSnapshot data={funnelData!} />
              </FunnelGate>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════
              Lead Results Panel (Phase 4 Gated)
              Shows only when httpValid > 0 to avoid empty lead tables
              ═══════════════════════════════════════════════════════════════════════ */}
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border">
            <LeadsGate 
              funnelData={funnelData} 
              currentPhase={executionControlState.controlPhase ?? undefined}
              placeholder={
                <LeadsPlaceholder 
                  currentPhase={executionControlState.controlPhase ?? undefined}
                  isRunning={executionControlState.status === 'running'}
                />
              }
            >
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
            </LeadsGate>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════
              Config panels moved to ConfigInspector drawer (Phase 5)
              Access via "Configuration" button in ExecutionHeader
              ═══════════════════════════════════════════════════════════════════════ */}
        </div>

        {/* Right column: Recommendations and other insights */}
        <div className="space-y-6">
          {/* ═══════════════════════════════════════════════════════════════════════
              Recommendations Panel (Phase 4 Gated)
              Shows only when recommendations exist, with positive messaging otherwise
              ═══════════════════════════════════════════════════════════════════════ */}
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border">
            {recsLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <RecommendationsGate 
                recommendationsData={recommendationsData} 
                currentPhase={executionControlState.controlPhase ?? undefined}
                placeholder={
                  <RecommendationsPlaceholder 
                    currentPhase={executionControlState.controlPhase ?? undefined}
                    isRunning={executionControlState.status === 'running'}
                  />
                }
              >
                <RecommendationPanel 
                  recommendations={recommendationsData!.recommendations!.map((r: CampaignRecommendation): Recommendation => ({
                    id: r.id ?? `${r.rationaleCode}-${r.message}`,
                    title: r.message,
                    detail: r.message,
                    rationale: r.rationaleCode,
                    severity: 'info'
                  }))}
                />
              </RecommendationsGate>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════
              Warning Distribution (Phase 4 Gated)
              Shows quality issues when they exist, positive messaging otherwise
              ═══════════════════════════════════════════════════════════════════════ */}
          <section aria-labelledby="insights-heading">
            <h3 id="insights-heading" className="sr-only">Additional Insights</h3>
            <WarningsGate 
              warningData={warningData} 
              currentPhase={executionControlState.controlPhase ?? undefined}
              placeholder={
                <WarningsPlaceholder 
                  currentPhase={executionControlState.controlPhase ?? undefined}
                />
              }
            >
              <WarningDistribution
                warnings={warningData}
                totalDomains={metricsData?.totalAnalyzed || 0}
                aria-label="Warning analysis and distribution"
              />
            </WarningsGate>
          </section>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          Momentum Analysis (Phase 4 Gated)
          Shows trend data when movers exist, hidden otherwise (no placeholder needed)
          Momentum is optional/advanced - don't clutter UI with placeholder
          ═══════════════════════════════════════════════════════════════════════ */}
      <MomentumGate momentumData={momentumData}>
        <section className="mt-8" aria-labelledby="momentum-full-heading">
          <h2 id="momentum-full-heading" className="text-lg font-semibold mb-4">Momentum Analysis</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <MoverList
              movers={momentumData?.moversUp || []}
              type="up"
              title="Top Gainers"
              maxItems={10}
              showScores={true}
              showRanks={true}
              aria-label="Detailed list of top gaining domains"
            />
            <MoverList
              movers={momentumData?.moversDown || []}
              type="down"
              title="Top Decliners"
              maxItems={10}
              showScores={true}
              showRanks={true}
              aria-label="Detailed list of top declining domains"
            />
          </div>
          
          {momentumData?.histogram && (
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
      </MomentumGate>

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