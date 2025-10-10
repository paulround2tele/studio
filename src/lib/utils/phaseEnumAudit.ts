import { CampaignPhaseEnum } from '@/lib/api-client/models/campaign-phase-enum';
import { PIPELINE_PHASE_ORDER } from '@/store/selectors/pipelineSelectors';

/**
 * Audits drift between generated OpenAPI campaign phase enums and the locally maintained
 * PIPELINE_PHASE_ORDER array. Emits a console.warn with details if divergence is detected.
 * Intended to be called once at app bootstrap (lazy; lightweight comparison only).
 */
export function auditPhaseEnumDrift() {
  try {
  const enumValues: string[] = Object.values(CampaignPhaseEnum);
    // Normalize to lower-case for comparison resilience
    const enumSet = new Set(enumValues.map(v => v.toLowerCase()));
    const localSet = new Set(PIPELINE_PHASE_ORDER.map(v => v.toLowerCase()));

    const missingInLocal = enumValues.filter(v => !localSet.has(v.toLowerCase()));
    const extraneousLocal = PIPELINE_PHASE_ORDER.filter(v => !enumSet.has(v.toLowerCase()));

    if (missingInLocal.length || extraneousLocal.length) {
      // Structured warning for easy grep in logs
      // eslint-disable-next-line no-console
      console.warn('[PhaseEnumAudit] Drift detected', {
        generatedEnumValues: enumValues,
        localPhaseOrder: PIPELINE_PHASE_ORDER,
        missingInLocal,
        extraneousLocal,
      });
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[PhaseEnumAudit] audit failed', e);
  }
}
