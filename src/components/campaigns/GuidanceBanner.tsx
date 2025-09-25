"use client";
import React from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { pipelineSelectors } from '@/store/selectors/pipelineSelectors';
import { clearGuidance } from '@/store/ui/campaignUiSlice';
import { Button } from '@/components/ui/button';

export const GuidanceBanner: React.FC<{ campaignId: string }> = ({ campaignId }) => {
  const dispatch = useAppDispatch();
  const selectLatestGuidance = React.useMemo(()=>pipelineSelectors.latestGuidance(campaignId),[campaignId]);
  const guidance = useAppSelector(selectLatestGuidance) || undefined; // keep legacy single guidance logic
  if (!guidance) return null;
  const color = guidance.severity === 'warn' ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-blue-50 border-blue-300 text-blue-900';
  return (
    <div className={`rounded border p-3 text-sm flex items-start gap-3 ${color}`}>
      <div className="flex-1"><strong>{guidance.phase ? guidance.phase + ': ' : ''}</strong>{guidance.message}</div>
      <Button size="sm" variant="outline" onClick={()=>dispatch(clearGuidance({ campaignId }))}>Dismiss</Button>
    </div>
  );
};