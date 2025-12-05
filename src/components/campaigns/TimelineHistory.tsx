"use client";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useCampaignSSE } from '@/hooks/useCampaignSSE';
import { useGetCampaignProgressStandaloneQuery } from '@/store/api/campaignApi';
import type { TimelineEvent } from '@/lib/api-client/models/timeline-event';

interface Entry { ts: string; type: string; phase?: string; message?: string; status?: string; }

// Normalize API timeline event into UI Entry
const timelineEventToEntry = (ev: TimelineEvent): Entry => ({
  ts: ev.timestamp,
  type: ev.type,
  phase: ev.phase || undefined,
  message: ev.description || undefined,
  status: ev.status || undefined,
});

export const TimelineHistory: React.FC<{ campaignId: string; max?: number }> = ({ campaignId, max = 100 }) => {
  const { data: progressData } = useGetCampaignProgressStandaloneQuery(campaignId, { pollingInterval: 15_000 });
  const [entries, setEntries] = useState<Entry[]>([]);
  const phaseStatusRef = useRef<Record<string, string | undefined>>({});

  // Seed entries from progress timeline (chronological -> we reverse for newest first)
  useEffect(() => {
    if (progressData?.timeline) {
      const mapped = progressData.timeline.map(timelineEventToEntry).sort((a,b)=> new Date(b.ts).getTime() - new Date(a.ts).getTime());
      setEntries(prev => {
        // Merge without duplicating existing (compare type+phase+ts)
        const existingKeys = new Set(prev.map(e => `${e.ts}|${e.type}|${e.phase||''}`));
        const merged = [...mapped.filter(e => !existingKeys.has(`${e.ts}|${e.type}|${e.phase||''}`)), ...prev];
        return merged.slice(0, max);
      });
    }
  }, [progressData?.timeline, max]);

  // SSE real-time enrichment
  useCampaignSSE({
    campaignId,
    events: {
      onPhaseStarted: (_cid, ev) => setEntries(e => [{ ts: new Date().toISOString(), type: 'phase_started', phase: ev.phase, message: ev.message }, ...e].slice(0, max)),
      onPhaseCompleted: (_cid, ev) => setEntries(e => [{ ts: new Date().toISOString(), type: 'phase_completed', phase: ev.phase, message: ev.message }, ...e].slice(0, max)),
      onPhaseFailed: (_cid, ev) => setEntries(e => [{ ts: new Date().toISOString(), type: 'phase_failed', phase: ev.phase, message: ev.error || ev.message }, ...e].slice(0, max)),
      onModeChanged: (_cid, mode) => setEntries(e => [{ ts: new Date().toISOString(), type: 'mode_changed', message: `Mode -> ${mode}` }, ...e].slice(0, max)),
      onAnalysisCompleted: () => {
        phaseStatusRef.current.analysis = 'completed';
        setEntries(e => [{ ts: new Date().toISOString(), type: 'analysis_completed', phase: 'analysis', message: 'Analysis completed' }, ...e].slice(0, max));
      },
      onAnalysisFailed: (_cid, payload) => {
        phaseStatusRef.current.analysis = 'failed';
        setEntries(e => [{ ts: new Date().toISOString(), type: 'analysis_failed', phase: 'analysis', message: (payload.error as string) || 'Analysis failed', status: 'failed' }, ...e].slice(0, max));
      },
      onAnalysisReuseEnrichment: (_cid, payload) => {
        const count = payload.featureVectorCount;
        const detail = typeof count === 'number' ? `${count} feature vectors reused` : 'Reused enrichment signals';
        setEntries(e => [{ ts: new Date().toISOString(), type: 'analysis_reuse_enrichment', phase: 'analysis', message: detail }, ...e].slice(0, max));
      },
      // Some SSE implementations may emit generic progress or analysis events; add guarded handling.
      onProgress: (_cid, raw) => {
        const anyRaw = raw as unknown as { overall?: { percent?: number; percentage?: number } };
        if (anyRaw?.overall) {
          const pct = anyRaw.overall.percent ?? anyRaw.overall.percentage;
          if (typeof pct === 'number') {
            setEntries(e => [{ ts: new Date().toISOString(), type: 'campaign_progress', message: `overall ${pct}%` }, ...e].slice(0,max));
          }
        }
      }
    }
  });

  const enrichmentStatus = progressData?.phases?.enrichment?.status;
  const analysisStatus = progressData?.phases?.analysis?.status;
  useEffect(() => {
    const updates: Entry[] = [];
    const nextStatuses: Array<{ phase: string; status?: string }> = [
      { phase: 'enrichment', status: enrichmentStatus },
      { phase: 'analysis', status: analysisStatus },
    ];
    nextStatuses.forEach(({ phase, status }) => {
      if (!status) return;
      if (phaseStatusRef.current[phase] === status) return;
      phaseStatusRef.current[phase] = status;
      const friendlyStatus = status.replace(/_/g, ' ');
      const label = phase.charAt(0).toUpperCase() + phase.slice(1);
      const statusMessage = status === 'configured'
        ? `${label} configured (defaults ready)`
        : `${label} status → ${friendlyStatus}`;
      updates.push({
        ts: new Date().toISOString(),
        type: `${phase}_status`,
        phase,
        status,
        message: statusMessage,
      });
    });
    if (updates.length) {
      setEntries(e => [...updates, ...e].slice(0, max));
    }
  }, [analysisStatus, enrichmentStatus, max]);

  const rendered = useMemo(() => entries.sort((a,b)=> new Date(b.ts).getTime() - new Date(a.ts).getTime()), [entries]);

  if (!rendered.length) return null;
  return (
    <div className="space-y-2 text-xs">
      <h4 className="font-semibold">Timeline</h4>
      <ul className="space-y-1 max-h-64 overflow-auto pr-1">
        {rendered.map((e, i) => (
          <li key={`${e.ts}|${e.type}|${e.phase||''}|${i}`} className="flex gap-2">
            <span className="text-gray-500 w-24 shrink-0">{new Date(e.ts).toLocaleTimeString()}</span>
            <span className="font-medium">{e.type}</span>
            {e.phase && <span className="capitalize">[{e.phase}]</span>}
            {e.status && <span className="text-gray-400">({e.status})</span>}
            <span className="truncate">{e.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};