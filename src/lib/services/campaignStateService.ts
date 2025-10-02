import { apiConfiguration } from '@/lib/api/config';
import { CampaignsApi } from '@/lib/api-client/apis/campaigns-api';
import type { CampaignStateWithExecutions } from '@/lib/api-client/models/campaign-state-with-executions';
import type { PhaseExecution } from '@/lib/api-client/models/phase-execution';
import type { PhaseExecutionUpdate } from '@/lib/api-client/models/phase-execution-update';
import { CampaignsPhaseExecutionPutPhaseTypeEnum, CampaignsPhaseExecutionGetPhaseTypeEnum, CampaignsPhaseExecutionDeletePhaseTypeEnum } from '@/lib/api-client/apis/campaigns-api';

const api = new CampaignsApi(apiConfiguration);

export async function getCampaignStateWithExecutions(campaignId: string): Promise<CampaignStateWithExecutions> {
  const res = await api.campaignsPhaseExecutionsList(campaignId);
  return res.data as CampaignStateWithExecutions;
}

export async function getPhaseExecution(campaignId: string, phaseType: CampaignsPhaseExecutionGetPhaseTypeEnum): Promise<PhaseExecution> {
  const res = await api.campaignsPhaseExecutionGet(campaignId, phaseType);
  return res.data as PhaseExecution;
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
