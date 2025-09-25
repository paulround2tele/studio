import { apiConfiguration } from '@/lib/api/config';
import { CampaignsApi } from '@/lib/api-client/apis/campaigns-api';
import type { CampaignsPhaseExecutionsList200Response, CampaignsPhaseExecutionGet200Response } from '@/lib/api-client/models';
import type { PhaseExecutionUpdate } from '@/lib/api-client/models/phase-execution-update';
import { CampaignsPhaseExecutionPutPhaseTypeEnum, CampaignsPhaseExecutionGetPhaseTypeEnum, CampaignsPhaseExecutionDeletePhaseTypeEnum } from '@/lib/api-client/apis/campaigns-api';

const api = new CampaignsApi(apiConfiguration);

export async function getCampaignStateWithExecutions(campaignId: string) {
  const res = await api.campaignsPhaseExecutionsList(campaignId);
  return res.data as CampaignsPhaseExecutionsList200Response;
}

export async function getPhaseExecution(campaignId: string, phaseType: CampaignsPhaseExecutionGetPhaseTypeEnum) {
  const res = await api.campaignsPhaseExecutionGet(campaignId, phaseType);
  return res.data as CampaignsPhaseExecutionGet200Response;
}

export async function updatePhaseExecution(
  campaignId: string,
  phaseType: CampaignsPhaseExecutionPutPhaseTypeEnum,
  payload: PhaseExecutionUpdate
) {
  const res = await api.campaignsPhaseExecutionPut(campaignId, phaseType, payload);
  return res.data;
}

export async function deletePhaseExecution(campaignId: string, phaseType: CampaignsPhaseExecutionDeletePhaseTypeEnum) {
  const res = await api.campaignsPhaseExecutionDelete(campaignId, phaseType);
  return res.status;
}
