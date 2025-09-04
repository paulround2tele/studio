"use client";
import React, { useEffect, useState } from 'react';
import { useCampaignSSE } from '@/hooks/useCampaignSSE';

interface Entry { ts: string; type: string; phase?: string; message?: string; }

export const TimelineHistory: React.FC<{ campaignId: string; max?: number }> = ({ campaignId, max=100 }) => {
  const [entries, setEntries] = useState<Entry[]>([]);
  useCampaignSSE({ campaignId, events: {
    onPhaseStarted: (_cid, ev) => setEntries(e => [{ ts: new Date().toISOString(), type: 'phase_started', phase: ev.phase, message: ev.message }, ...e].slice(0,max)),
    onPhaseCompleted: (_cid, ev) => setEntries(e => [{ ts: new Date().toISOString(), type: 'phase_completed', phase: ev.phase, message: ev.message }, ...e].slice(0,max)),
    onPhaseFailed: (_cid, ev) => setEntries(e => [{ ts: new Date().toISOString(), type: 'phase_failed', phase: ev.phase, message: ev.error || ev.message }, ...e].slice(0,max)),
    onModeChanged: (_cid, mode) => setEntries(e => [{ ts: new Date().toISOString(), type: 'mode_changed', message: `Mode -> ${mode}` }, ...e].slice(0,max)),
    onChainBlocked: (_cid, data) => setEntries(e => [{ ts: new Date().toISOString(), type: 'chain_blocked', phase: (data as any)?.missing_phase, message: (data as any)?.message }, ...e].slice(0,max)),
  }});
  useEffect(()=>{},[]);
  if(!entries.length) return null;
  return (
    <div className="space-y-2 text-xs">
      <h4 className="font-semibold">Timeline</h4>
      <ul className="space-y-1 max-h-64 overflow-auto pr-1">
        {entries.map((e,i)=>(
          <li key={i} className="flex gap-2"><span className="text-gray-500 w-24 shrink-0">{new Date(e.ts).toLocaleTimeString()}</span><span className="font-medium">{e.type}</span>{e.phase && <span className="capitalize">[{e.phase}]</span>}<span className="truncate">{e.message}</span></li>
        ))}
      </ul>
    </div>
  );
};