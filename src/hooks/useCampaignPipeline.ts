import { useMemo } from 'react';
import { 
  useGetCampaignProgressStandaloneQuery,
  useStartPhaseStandaloneMutation,
  useConfigurePhaseStandaloneMutation,
  useExportCampaignDomainsMutation,
  useUpdateCampaignModeMutation,
} from '@/store/api/campaignApi';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { pipelineSelectors } from '@/store/selectors/pipelineSelectors';
import type { PipelineRelatedRootState as _PipelineRelatedRootState } from '@/store/types/pipelineState';
import { CampaignModeEnum } from '@/lib/api-client';
import type { PhaseConfigurationRequest } from '@/lib/api-client/models/phase-configuration-request';
import { setFullSequenceMode } from '@/store/ui/campaignUiSlice';

/**
 * useCampaignPipeline
 * --------------------------------------
 * Central orchestrator hook for a single campaign pipeline. This is the
 * single integration point components should prefer for campaign execution
 * actions and progress state. It composes lower-level RTK Query hooks and
 * applies opinionated behaviors such as optimistic mode switching.
 *
 * Responsibilities:
 * 1. Provide authoritative progress state (sourced from backend via RTK Query)
 * 2. Expose phase control operations (configure / start)
 * 3. Expose campaign execution mode mutation with optimistic update + revert
 * 4. Provide a convenience export function for domains (full traversal)
 *
 * Explicitly NOT responsible for:
 * - Domain list pagination (use `useGetCampaignDomainsQuery` directly for each page)
 * - UI-specific formatting / derived display metrics (do that in components/selectors)
 * - Authentication concerns
 *
 * Optimistic Mode Switching:
 * The `updateMode` function will first update the UI slice (`fullSequenceMode`)
 * then attempt the network mutation. If the server rejects the update, the
 * previous value is restored and the error re-thrown.
 *
 * Error Handling:
 * - Mutations return RTK Query mutation promises; callers may `.unwrap()` if needed
 * - `updateMode` throws on failure after reverting optimistic state
 *
 * Example:
 * ```tsx
 * const pipeline = useCampaignPipeline(campaignId);
 * if (pipeline.progress?.phases?.discovery?.status === 'idle') {
 *   pipeline.startPhase('discovery');
 * }
 * <Button onClick={() => pipeline.updateMode(pipeline.fullSequenceMode ? 'step_by_step' : 'full_sequence')} />
 * <Button onClick={async () => {
 *   const text = await pipeline.exportDomains();
 *   downloadTextFile(text, 'domains.txt');
 * }} />
 * ```
 *
 * Return Contract:
 * {
 *   campaignId: string;
 *   progress: CampaignProgressResponse | undefined;
 *   progressQuery: QueryResult; // full RTK Query result for advanced control
 *   startPhase(phase: string): Promise<...>;
 *   configurePhase(phase: string, config: PhaseConfigurationRequest): Promise<...>;
 *   exportDomains(): Promise<string>; // newline-separated list
 *   updateMode(next: 'full_sequence' | 'step_by_step'): Promise<void>;
 *   fullSequenceMode: boolean | undefined; // UI slice cached view
 *   ...State objects: startPhaseState, configurePhaseState, exportDomainsState, updateModeState
 * }
 */
export function useCampaignPipeline(campaignId: string) {
  const dispatch = useAppDispatch();
  // Base queries
  const progressQuery = useGetCampaignProgressStandaloneQuery(campaignId);

  // Mutations
  const [startPhase, startPhaseState] = useStartPhaseStandaloneMutation();
  const [configurePhase, configurePhaseState] = useConfigurePhaseStandaloneMutation();
  const [exportDomains, exportDomainsState] = useExportCampaignDomainsMutation();
  const [updateMode, updateModeState] = useUpdateCampaignModeMutation();

  // Derived UI state (legacy UI slice still stores mode optimistically)
  const overviewSel = useMemo(() => pipelineSelectors.overview(campaignId), [campaignId]);
  const overview = useAppSelector(overviewSel as unknown as Parameters<typeof useAppSelector>[0]) as ReturnType<typeof overviewSel>;
  const fullSequenceMode: boolean | undefined = (overview as unknown as {mode?: {autoAdvance?: boolean}; ui?: {fullSequenceMode?: boolean}})?.mode?.autoAdvance ?? (overview as unknown as {mode?: {autoAdvance?: boolean}; ui?: {fullSequenceMode?: boolean}})?.ui?.fullSequenceMode;

  // Public API
  return {
    campaignId,
    progress: progressQuery.data,
    progressQuery,
    startPhase: (phase: string) => startPhase({ campaignId, phase }),
    configurePhase: (phase: string, configuration: PhaseConfigurationRequest['configuration']) =>
      configurePhase({ campaignId, phase, config: { configuration } as PhaseConfigurationRequest }),
    startPhaseState,
    configurePhaseState,
    exportDomains: () => exportDomains(campaignId).unwrap(),
    exportDomainsState,
    updateMode: async (next: 'full_sequence' | 'step_by_step') => {
      // optimistic
      dispatch(setFullSequenceMode({ campaignId, value: next === 'full_sequence' }));
      try {
  const result = await updateMode({ campaignId, mode: next as CampaignModeEnum }).unwrap();
        const authoritative = result.mode;
        if (authoritative === 'full_sequence' || authoritative === 'step_by_step') {
          dispatch(setFullSequenceMode({ campaignId, value: authoritative === 'full_sequence' }));
        }
      } catch (e) {
        // revert
        dispatch(setFullSequenceMode({ campaignId, value: fullSequenceMode || false }));
        throw e;
      }
    },
    updateModeState,
    fullSequenceMode,
  };
}
