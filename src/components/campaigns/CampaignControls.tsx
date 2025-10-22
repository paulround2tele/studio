"use client";

import React from 'react';
import type { CampaignResponse as Campaign } from '@/lib/api-client/models';
import type { PhaseExecution } from '@/lib/api-client/models/phase-execution';
import type { CampaignState } from '@/lib/api-client/models/campaign-state';
import { useCampaignSSE } from '@/hooks/useCampaignSSE';
import { useAppDispatch } from '@/store/hooks';
import { setFullSequenceMode, setLastFailedPhase, setGuidance } from '@/store/ui/campaignUiSlice';
import { FullSequencePreflightWizard } from './FullSequencePreflightWizard';
import { TimelineHistory } from './TimelineHistory';
import { ConversionCTA } from './ConversionCTA';
import { GuidanceBanner } from './GuidanceBanner';
import { PipelineWorkspace } from './PipelineWorkspace';

interface CampaignControlsProps {
  campaign: Campaign;
  phaseExecutions?: PhaseExecution[];
  state?: CampaignState;
}

const CampaignControls: React.FC<CampaignControlsProps> = ({ campaign }) => {
  const dispatch = useAppDispatch();
  // Live progress via SSE with extended callbacks
  useCampaignSSE({
    campaignId: campaign.id,
    events: {
      onModeChanged: (cid, mode) => {
        if (cid === campaign.id) dispatch(setFullSequenceMode({ campaignId: campaign.id, value: mode === 'full_sequence' }));
      },
      onPhaseFailed: (cid, ev) => {
        if (cid === campaign.id) {
          dispatch(setLastFailedPhase({ campaignId: campaign.id, phase: ev.phase }));
          dispatch(setGuidance({ campaignId: campaign.id, guidance: { message: `${ev.phase} failed: ${ev.error || ev.message}`, phase: ev.phase, severity: 'warn' } }));
        }
      }
    }
  });

  return (
    <div className="flex flex-col gap-4">
  {/* Blocked banner removed under strict model */}
  <GuidanceBanner campaignId={campaign.id} />
      <PipelineWorkspace campaignId={campaign.id} />
      <FullSequencePreflightWizard campaignId={campaign.id} />
  <ConversionCTA campaignId={campaign.id} />
  {/* Timeline provides passive event history; no legacy PhaseCards remain. */}
  <TimelineHistory campaignId={campaign.id} />
    </div>
  );
};

export default CampaignControls;
