import { PhaseStatusResponse, PhaseStatusResponsePhaseEnum, PhaseStatusResponseStatusEnum } from '@/lib/api-client/models';

/**
 * Ensure a PhaseStatusResponse object is initialized and optionally update its status.
 * Avoids object replacement when a draft already exists (immer friendly mutation).
 */
export function ensurePhaseStatus(
  draft: unknown,
  phase: PhaseStatusResponsePhaseEnum,
  status?: PhaseStatusResponseStatusEnum
): PhaseStatusResponse {
  if (draft && typeof draft === 'object') {
    const d = draft as PhaseStatusResponse;
    if (d.phase && d.status && d.progress) {
      if (status) d.status = status;
      return d;
    }
  }
  return {
    phase,
    status: status || PhaseStatusResponseStatusEnum.not_started,
    progress: {
      totalItems: 0,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0,
      percentComplete: 0,
    },
    configuration: {},
  };
}

export function markConfigured(draft: unknown, phase: PhaseStatusResponsePhaseEnum): PhaseStatusResponse {
  return ensurePhaseStatus(draft, phase, PhaseStatusResponseStatusEnum.configured);
}
