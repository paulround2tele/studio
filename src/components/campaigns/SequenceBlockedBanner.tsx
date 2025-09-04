"use client";
import React from 'react';
import { useAppSelector } from '@/store/hooks';

interface Props { campaignId: string; className?: string; }

export const SequenceBlockedBanner: React.FC<Props> = ({ campaignId, className }) => {
  const ui = useAppSelector(s => s.campaignUI?.byId?.[campaignId]);
  if (!ui?.blockedPhase) return null;
  return (
    <div className={"rounded-md border border-amber-400 bg-amber-50 text-amber-900 px-4 py-3 text-sm flex flex-col gap-1 " + (className||'')}>
      <strong className="font-medium">Sequence Paused</strong>
      <span>Automatic chaining halted at <code>{ui.blockedPhase}</code>. Complete configuration and start this phase to resume.</span>
    </div>
  );
};
