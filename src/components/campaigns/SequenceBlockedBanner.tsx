"use client";
import React, { useEffect } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearBlockedPhase } from '@/store/ui/campaignUiSlice';
import { useGetPhaseStatusStandaloneQuery } from '@/store/api/campaignApi';
import { Button } from '@/components/ui/button';

interface Props { campaignId: string; className?: string; }

export const SequenceBlockedBanner: React.FC<Props> = ({ campaignId, className }) => {
  const dispatch = useAppDispatch();
  const ui = useAppSelector(s => s.campaignUI?.byId?.[campaignId]);
  const blocked = ui?.blockedPhase;
  const { data: blockedStatus } = useGetPhaseStatusStandaloneQuery(blocked ? { campaignId, phase: blocked } : skipToken as any, { skip: !blocked });

  // Auto-clear when phase becomes configured or running/completed
  useEffect(() => {
    if (!blocked) return;
    const st = blockedStatus?.status;
    if (st && (st === 'configured' || st === 'running' || st === 'completed')) {
      dispatch(clearBlockedPhase({ campaignId }));
    }
  }, [blocked, blockedStatus?.status, dispatch, campaignId]);

  if (!blocked) return null;
  return (
    <div className={"rounded-md border border-amber-400 bg-amber-50 text-amber-900 px-4 py-3 text-sm flex flex-col gap-1 " + (className||'')}>
      <strong className="font-medium">Sequence Paused</strong>
      <span>Automatic chaining halted at <code>{blocked}</code>. Complete configuration and start this phase to resume.</span>
      <div className="pt-1">
        <Button size="sm" variant="outline" onClick={() => dispatch(clearBlockedPhase({ campaignId }))}>Dismiss</Button>
      </div>
    </div>
  );
};
