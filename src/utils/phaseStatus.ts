import type { PhaseStatusResponse } from '@/lib/api-client/models';

// These aliases stay in sync with the generated OpenAPI unions
export type PipelinePhase = PhaseStatusResponse['phase'];
export type PhaseRunStatus = PhaseStatusResponse['status'];

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
      if (status) d.status = status;
      return d;
    }
  }
  const normalizedStatus = (status ?? 'not_started') as PhaseStatusResponse['status'];
  const defaultStatus: PhaseStatusResponse = {
    phase,
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
