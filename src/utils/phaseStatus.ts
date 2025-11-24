import { PhaseStatusResponse, PhaseStatusResponsePhaseEnum, PhaseStatusResponseStatusEnum } from '@/lib/api-client/models';

// Fallback literal types when enum exports are not generated (OpenAPI may inline string enums)
export type PipelinePhase = 'discovery' | 'validation' | 'extraction' | 'enrichment' | 'analysis';
export type PhaseRunStatus =
  | 'not_started'
  | 'configured'
  | 'running'
  | 'completed'
  | 'failed'
  | 'paused';

const toPhaseEnum = (phase: PipelinePhase): PhaseStatusResponsePhaseEnum =>
  phase as PhaseStatusResponsePhaseEnum;

const toStatusEnum = (status: PhaseRunStatus): PhaseStatusResponseStatusEnum =>
  status as PhaseStatusResponseStatusEnum;

/**
 * Ensure a PhaseStatusResponse object is initialized and optionally update its status.
 * Avoids object replacement when a draft already exists (immer friendly mutation).
 */
export function ensurePhaseStatus(
  draft: unknown,
  phase: PipelinePhase,
  status?: PhaseRunStatus
): PhaseStatusResponse {
  if (draft && typeof draft === 'object') {
    const d = draft as PhaseStatusResponse;
    if (d.phase && d.status && d.progress) {
      if (status) d.status = toStatusEnum(status);
      return d;
    }
  }
  const normalizedStatus = toStatusEnum(status ?? 'not_started');
  const defaultStatus: PhaseStatusResponse = {
    phase: toPhaseEnum(phase),
    status: normalizedStatus,
    progress: {
      totalItems: 0,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0,
      percentComplete: 0,
    },
    configuration: {},
  };

  return defaultStatus;
}
export function markConfigured(draft: unknown, phase: PipelinePhase): PhaseStatusResponse {
  return ensurePhaseStatus(draft, phase, 'configured');
}
