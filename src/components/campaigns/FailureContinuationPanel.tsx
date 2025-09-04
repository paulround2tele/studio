"use client";
import React from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { Button } from '@/components/ui/button';
import { setLastFailedPhase } from '@/store/ui/campaignUiSlice';
import { useStartPhaseStandaloneMutation } from '@/store/api/campaignApi';

export const FailureContinuationPanel: React.FC<{ campaignId: string }> = ({ campaignId }) => {
  const ui = useAppSelector(s => s.campaignUI?.byId?.[campaignId]);
  const campaign = useAppSelector(s => (s as any).campaign?.entities?.[campaignId]); // fallback if normalized slice exists
  const dispatch = useAppDispatch();
  const failedPhase = ui?.lastFailedPhase;
  const [startPhase, { isLoading }] = useStartPhaseStandaloneMutation();
  if (!failedPhase) return null;
  const retry = async () => {
    await startPhase({ campaignId, phase: failedPhase as any });
  };
  return (
    <div className="border border-red-300 bg-red-50 text-red-900 rounded p-3 text-sm flex flex-col gap-2">
      <div><strong>Phase Failed:</strong> {failedPhase}. Adjust configuration (if needed) and retry.</div>
      <div className="flex gap-2">
        <Button size="sm" onClick={retry} isLoading={isLoading}>Retry {failedPhase}</Button>
        <Button size="sm" variant="outline" onClick={()=>dispatch(setLastFailedPhase({ campaignId, phase: undefined }))}>Dismiss</Button>
      </div>
    </div>
  );
};