import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CampaignsApi } from '@/lib/api-client/apis/campaigns-api';
import { apiConfiguration } from '@/lib/api/config';
import type { CampaignsPhaseExecutionsList200Response } from '@/lib/api-client/models';
import type { PhaseExecutionUpdate } from '@/lib/api-client/models/phase-execution-update';
import { CampaignsPhaseExecutionPutPhaseTypeEnum, CampaignsPhaseExecutionDeletePhaseTypeEnum, CampaignsPhaseExecutionGetPhaseTypeEnum } from '@/lib/api-client/apis/campaigns-api';

const api = new CampaignsApi(apiConfiguration);

export function useCampaignState(campaignId: string) {
  const queryClient = useQueryClient();

  const stateQuery = useQuery({
    queryKey: ['campaign-state', campaignId],
    queryFn: async (): Promise<CampaignsPhaseExecutionsList200Response> => {
      const res = await api.campaignsPhaseExecutionsList(campaignId);
      return res.data;
    },
    enabled: !!campaignId,
    staleTime: 5_000,
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
