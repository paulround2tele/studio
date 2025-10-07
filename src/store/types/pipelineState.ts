import type { PipelinePhaseKey } from '@/store/selectors/pipelineSelectors';

// UI slice entry representing per-campaign UI state.
export interface CampaignUIEntry {
  id?: string; // optional: existing slice entries may omit explicit id field
  fullSequenceMode?: boolean;
  guidanceMessages?: Array<{ id: string; phase: PipelinePhaseKey; message: string; createdAt: string }>;
  lastFailedPhase?: PipelinePhaseKey;
  selectedPhase?: PipelinePhaseKey;
  preflightOpen?: boolean;
}

export interface CampaignUISliceState {
  byId: Record<string, CampaignUIEntry>;
}

export interface PipelineExecPhaseRuntime {
  startedAt?: number;
  completedAt?: number;
  status?: string;
}

export interface PipelineExecSliceState {
  byCampaign: Record<string, Record<PipelinePhaseKey, PipelineExecPhaseRuntime>>;
}

// Partial RootState augmentation consumed by selectors & hooks.
export interface PipelineRelatedRootState {
  campaignUI: CampaignUISliceState;
  pipelineExec?: PipelineExecSliceState;
}
