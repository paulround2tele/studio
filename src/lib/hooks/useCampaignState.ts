/**
 * @deprecated This hook uses polling which has been replaced by SSE-driven updates.
 * Use useCampaignPhaseEvents or the new campaign API endpoints with SSE for real-time updates.
 * 
 * Legacy Campaign State Hook with Polling (Phase 2)
 * This hook will be removed in a future version.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CampaignsApi } from '@/lib/api-client/apis/campaigns-api';
import { apiConfiguration } from '@/lib/api/config';
import type { CampaignStateWithExecutions } from '@/lib/api-client/models/campaign-state-with-executions';
import type { PhaseExecutionUpdate } from '@/lib/api-client/models/phase-execution-update';
import { CampaignsPhaseExecutionPutPhaseTypeEnum, CampaignsPhaseExecutionDeletePhaseTypeEnum, CampaignsPhaseExecutionGetPhaseTypeEnum } from '@/lib/api-client/apis/campaigns-api';

const api = new CampaignsApi(apiConfiguration);

/**
 * @deprecated Use useCampaignPhaseEvents with SSE instead
 */
export function useCampaignState(campaignId: string) {
  console.warn('useCampaignState is deprecated. Use useCampaignPhaseEvents with SSE instead.');
  
  const queryClient = useQueryClient();

  const stateQuery = useQuery({
    queryKey: ['campaign-state', campaignId],
    queryFn: async (): Promise<CampaignStateWithExecutions> => {
      const res = await api.campaignsPhaseExecutionsList(campaignId);
      return res.data as CampaignStateWithExecutions;
    },
    enabled: !!campaignId,
    staleTime: 30_000, // Increased stale time to reduce polling frequency
    refetchInterval: false, // Disable automatic polling - rely on manual triggers
  });

  const updatePhase = useMutation({
    mutationFn: async (params: { phase: CampaignsPhaseExecutionPutPhaseTypeEnum; data: PhaseExecutionUpdate }) => {
      const res = await api.campaignsPhaseExecutionPut(campaignId, params.phase, params.data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-state', campaignId] });
    },
  });

  const deletePhase = useMutation({
    mutationFn: async (phase: CampaignsPhaseExecutionDeletePhaseTypeEnum) => {
      const res = await api.campaignsPhaseExecutionDelete(campaignId, phase);
      return res.status;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-state', campaignId] });
    },
  });

  const getPhase = async (phase: CampaignsPhaseExecutionGetPhaseTypeEnum) => {
    const res = await api.campaignsPhaseExecutionGet(campaignId, phase);
    return res.data;
  };

  return { stateQuery, updatePhase, deletePhase, getPhase };
}
