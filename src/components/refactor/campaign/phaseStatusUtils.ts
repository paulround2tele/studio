/**
 * Utilities for merging campaign phase data across backend snapshots,
 * funnel metrics and live SSE updates.
 */

import { DEFAULT_PHASES } from '@/hooks/useCampaignPhaseStream';
import type { PipelinePhase } from './PipelineBar';
import type { CampaignPhasesStatusResponse } from '@/lib/api-client/models/campaign-phases-status-response';
import type { CampaignPhasesStatusResponsePhasesInner } from '@/lib/api-client/models/campaign-phases-status-response-phases-inner';
import type { FunnelData } from './FunnelSnapshot';
import { normalizeToApiPhase } from '@/lib/utils/phaseNames';

export interface MergeCampaignPhasesOptions {
  basePhases?: PipelinePhase[];
  statusSnapshot?: CampaignPhasesStatusResponse | null | undefined;
  funnelData?: FunnelData | null | undefined;
  ssePhases?: PipelinePhase[] | null | undefined;
  sseLastUpdate?: number | null | undefined;
}

type PhaseKey = PipelinePhase['key'];

type MutablePhase = PipelinePhase & {
  status: PipelinePhase['status'];
  progressPercentage: number;
};

const assignIfPresent = <K extends keyof PipelinePhase>(
  target: MutablePhase,
  source: PipelinePhase,
  key: K
): void => {
  if (Object.prototype.hasOwnProperty.call(source, key)) {
    target[key] = source[key];
  }
};

const FUNNEL_FIELD_BY_PHASE: Partial<Record<PhaseKey, keyof FunnelData>> = {
  discovery: 'generated',
  validation: 'dnsValid',
  enrichment: 'httpValid',
  extraction: 'leads',
  analysis: 'analyzed',
};

const SAFE_PROGRESS_MAX = 100;

function cloneBasePhases(base: PipelinePhase[]): MutablePhase[] {
  return base.map((phase) => ({
    ...phase,
    status: phase.status ?? 'not_started',
    progressPercentage: phase.progressPercentage ?? 0
  }));
}

function applySnapshot(phases: Map<PhaseKey, MutablePhase>, snapshot?: CampaignPhasesStatusResponse | null) {
  if (!snapshot?.phases?.length) {
    return;
  }

  snapshot.phases.forEach((phaseSnapshot: CampaignPhasesStatusResponsePhasesInner) => {
    const normalized = normalizeToApiPhase(String(phaseSnapshot.phase || '').toLowerCase());
    if (!normalized) return;
    const phase = phases.get(normalized as PhaseKey);
    if (!phase) return;

    phase.status = phaseSnapshot.status;
    phase.progressPercentage = clampProgress(phaseSnapshot.progressPercentage ?? 0);
    phase.startedAt = phaseSnapshot.startedAt;
    phase.completedAt = phaseSnapshot.completedAt;
    const snapshotFailed = phaseSnapshot.status === 'failed';
    phase.failedAt = snapshotFailed ? phaseSnapshot.failedAt : undefined;
    phase.errorMessage = snapshotFailed ? phaseSnapshot.errorMessage : undefined;
  });
}

function applyFunnelFallback(phases: Map<PhaseKey, MutablePhase>, funnel?: FunnelData | null) {
  if (!funnel) return;

  const generated = funnel.generated ?? 0;

  phases.forEach((phase, key) => {
    if (phase.status !== 'not_started' || phase.progressPercentage > 0) {
      return;
    }

    const funnelField = FUNNEL_FIELD_BY_PHASE[key];
    if (!funnelField) return;

    const value = funnel[funnelField] ?? 0;
    if (value <= 0) return;

    // Special handling for generation where we only know produced domains
    if (key === 'discovery') {
      phase.status = 'completed';
      phase.progressPercentage = SAFE_PROGRESS_MAX;
      return;
    }

    const denominator = generated > 0 ? generated : value;
    const progress = denominator > 0 ? clampProgress((value / denominator) * SAFE_PROGRESS_MAX) : SAFE_PROGRESS_MAX;

    if (progress >= SAFE_PROGRESS_MAX) {
      phase.status = 'completed';
    } else {
      phase.status = 'in_progress';
    }
    phase.progressPercentage = progress;
  });
}

function applySseOverlay(phases: Map<PhaseKey, MutablePhase>, ssePhases?: PipelinePhase[] | null, lastUpdate?: number | null) {
  if (!isMeaningfulSseUpdate(ssePhases, lastUpdate)) return;

  ssePhases!.forEach((ssePhase) => {
    const normalized = normalizeToApiPhase(String(ssePhase.key || '').toLowerCase());
    if (!normalized) return;
    const target = phases.get(normalized as PhaseKey);
    if (!target) return;

    target.status = ssePhase.status;
    target.progressPercentage = clampProgress(ssePhase.progressPercentage ?? 0);
    target.startedAt = ssePhase.startedAt;
    target.completedAt = ssePhase.completedAt;
    if (ssePhase.status && ssePhase.status !== 'failed') {
      target.failedAt = undefined;
      target.errorMessage = undefined;
    }
    assignIfPresent(target, ssePhase, 'lastMessage');
    assignIfPresent(target, ssePhase, 'errorMessage');
    assignIfPresent(target, ssePhase, 'lastEventAt');
    assignIfPresent(target, ssePhase, 'failedAt');
  });
}

function isMeaningfulSseUpdate(phases?: PipelinePhase[] | null, lastUpdate?: number | null): phases is PipelinePhase[] {
  if (!phases || !Array.isArray(phases) || phases.length === 0) return false;
  if (!lastUpdate) return false;

  return phases.some((phase) => phase.status !== 'not_started' || (phase.progressPercentage ?? 0) > 0 || !!phase.startedAt || !!phase.completedAt);
}

function clampProgress(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  if (value > SAFE_PROGRESS_MAX) return SAFE_PROGRESS_MAX;
  return value;
}

export function mergeCampaignPhases({
  basePhases = DEFAULT_PHASES,
  statusSnapshot,
  funnelData,
  ssePhases,
  sseLastUpdate
}: MergeCampaignPhasesOptions): PipelinePhase[] {
  const cloned = cloneBasePhases(basePhases);
  const phaseMap = new Map<PhaseKey, MutablePhase>(cloned.map((phase) => [phase.key as PhaseKey, phase]));

  applySnapshot(phaseMap, statusSnapshot);
  applyFunnelFallback(phaseMap, funnelData);
  applySseOverlay(phaseMap, ssePhases, sseLastUpdate ?? null);

  return cloned.map((phase) => ({ ...phaseMap.get(phase.key as PhaseKey)! }));
}

export function deriveOverallProgress(phases: PipelinePhase[]): number {
  if (!phases.length) return 0;
  const total = phases.reduce((sum, phase) => sum + (phase.progressPercentage ?? 0), 0);
  return clampProgress(total / phases.length);
}
