import { PhaseStatusResponse } from '@/lib/api-client/models';

// Fallback literal types when enum exports are not generated (OpenAPI may inline string enums)
export type PipelinePhase = 'discovery' | 'validation' | 'extraction' | 'enrichment' | 'analysis';
export type PhaseRunStatus =
  | 'not_started'
  | 'configured'
  | 'running'
  | 'completed'
  | 'failed'
  | 'paused';

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
  const defaultStatus: PhaseStatusResponse = {
    phase,
    status: status ?? 'not_started',
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
