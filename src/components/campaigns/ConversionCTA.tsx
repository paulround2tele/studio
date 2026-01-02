"use client";
import React, { useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import Button from '@/components/ta/ui/button/Button';
import { setFullSequenceMode } from '@/store/ui/campaignUiSlice';
import { pipelineSelectors } from '@/store/selectors/pipelineSelectors';

export const ConversionCTA: React.FC<{ campaignId: string }> = ({ campaignId }) => {
  const allConfiguredSel = React.useMemo(() => pipelineSelectors.allConfigured(campaignId), [campaignId]);
  const allConfigured = useAppSelector(allConfiguredSel);
  const dispatch = useAppDispatch();
  const fullSequence = useAppSelector(s => s.campaignUI?.byId?.[campaignId]?.fullSequenceMode);
  const show = useMemo(() => !fullSequence && allConfigured, [fullSequence, allConfigured]);
  if (!show) return null;
  return (
    <div className="border border-blue-200 bg-blue-50 text-blue-900 rounded p-3 flex flex-col gap-2 text-sm">
      <div>All phases are configured. Enable <strong>Full Sequence</strong> to auto-run the remaining workflow.</div>
      <div><Button size="sm" onClick={()=>dispatch(setFullSequenceMode({ campaignId, value: true }))}>Enable Full Sequence</Button></div>
    </div>
  );
};