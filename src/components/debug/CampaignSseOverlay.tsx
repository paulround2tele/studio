'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CAMPAIGN_SSE_DEBUG_KEY, useCampaignSSE } from '@/hooks/useCampaignSSE';

const INITIAL_ENV_STATE = process.env.NEXT_PUBLIC_SSE_DEBUG_OVERLAY === 'true';

const EVENT_COLORS: Record<string, string> = {
  campaign_progress: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/60',
  phase_started: 'bg-sky-500/10 text-sky-100 border-sky-400/50',
  phase_completed: 'bg-green-500/10 text-green-100 border-green-400/50',
  phase_failed: 'bg-rose-500/10 text-rose-100 border-rose-400/50',
  keep_alive: 'bg-slate-500/10 text-slate-100 border-slate-400/40',
  error: 'bg-amber-500/10 text-amber-50 border-amber-400/50',
};

interface DebugEntry {
  timestamp?: string;
  campaignId?: string | null;
  label?: string;
  detail?: unknown;
}

interface CampaignSseOverlayProps {
  campaignId?: string;
  maxEntries?: number;
}

const isDebugEntry = (value: unknown): value is DebugEntry => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.timestamp === 'string' && typeof candidate.label === 'string';
};

const formatDetail = (detail: unknown): string => {
  if (detail == null) return '';
  if (typeof detail === 'string') return detail;
  if (typeof detail === 'number' || typeof detail === 'boolean') return String(detail);
  try {
    return JSON.stringify(detail, null, 2);
  } catch {
    return '[detail unavailable]';
  }
};

export function CampaignSseOverlay({ campaignId, maxEntries = 50 }: CampaignSseOverlayProps) {
  const [enabled, setEnabled] = useState(INITIAL_ENV_STATE);
  const [entries, setEntries] = useState<DebugEntry[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [hidden, setHidden] = useState(false);

  const normalizedCampaignId = campaignId?.trim() || undefined;
  const shouldStream = enabled;

  const {
    isConnected,
    readyState,
    error: sseError,
    reconnectAttempts,
  } = useCampaignSSE({
    campaignId: normalizedCampaignId,
    autoConnect: shouldStream,
  });

  useEffect(() => {
    if (INITIAL_ENV_STATE || typeof window === 'undefined') {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get('sseOverlay') === '1' || params.get('debug') === 'sse') {
      setEnabled(true);
    }
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }
    const readEntries = () => {
      const globalWindow = window as typeof window & Record<string, unknown>;
      const rawValue = globalWindow[CAMPAIGN_SSE_DEBUG_KEY];
      if (!Array.isArray(rawValue)) {
        return;
      }
      const typed = rawValue.filter(isDebugEntry) as DebugEntry[];
      setEntries(typed);
    };

    readEntries();
    const interval = window.setInterval(readEntries, 1200);
    return () => window.clearInterval(interval);
  }, [enabled]);

  const filteredEntries = useMemo(() => {
    const subset = campaignId
      ? entries.filter((entry) => !entry.campaignId || entry.campaignId === campaignId)
      : entries;
    return subset.slice(-maxEntries).reverse();
  }, [campaignId, entries, maxEntries]);

  const summary = useMemo(() => {
    const counts = filteredEntries.reduce<Record<string, number>>((acc, entry) => {
      const label = entry.label ?? 'event';
      acc[label] = (acc[label] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [filteredEntries]);

  const lastEvent = filteredEntries[0];
  const connectionSummary = useMemo(() => {
    if (!shouldStream) {
      return 'Idle';
    }
    if (sseError) {
      return 'Error connecting to SSE';
    }
    if (isConnected) {
      return 'Live connection';
    }
    if (reconnectAttempts > 0) {
      return `Reconnecting (${reconnectAttempts})`;
    }
    if (readyState === 0) {
      return 'Connecting…';
    }
    return 'Awaiting connection';
  }, [isConnected, readyState, reconnectAttempts, shouldStream, sseError]);

  if (!enabled) {
    return null;
  }

  if (hidden) {
    return (
      <button
        type="button"
        className="fixed bottom-5 right-5 z-[9999] rounded-full border border-cyan-400/60 bg-slate-900/90 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-cyan-100 shadow-xl"
        onClick={() => setHidden(false)}
      >
        Show SSE Feed
      </button>
    );
  }

  return (
    <div className="pointer-events-auto fixed right-4 top-4 z-[9999] w-[420px] max-w-[92vw] text-xs text-white">
      <div className="rounded-2xl border border-cyan-500/50 bg-[#040b1d]/95 shadow-[0_25px_60px_rgba(2,6,23,0.75)] backdrop-blur-md">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-300">Live SSE Feed</p>
            <p className="text-base font-semibold text-white">
              {campaignId ? `Campaign ${campaignId.slice(0, 8)}…` : 'All Campaigns'}
            </p>
            <p className="text-[11px] text-slate-300">
              {lastEvent ? `Last: ${lastEvent.label} @ ${new Date(lastEvent.timestamp ?? '').toLocaleTimeString()}` : 'Awaiting events'}
            </p>
            <p className="text-[11px] text-cyan-200">{connectionSummary}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white"
              onClick={() => setCollapsed((prev) => !prev)}
            >
              {collapsed ? 'Expand' : 'Collapse'}
            </button>
            <button
              type="button"
              className="rounded-full border border-red-400/40 bg-red-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-red-100"
              onClick={() => setHidden(true)}
            >
              Hide
            </button>
          </div>
        </div>

        {!collapsed && (
          <div className="px-5 pb-5 pt-4">
            {summary.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {summary.map(([label, count]) => (
                  <span
                    key={label}
                    className="rounded-full border border-cyan-400/30 bg-cyan-500/5 px-3 py-[3px] text-[11px] uppercase tracking-wide text-cyan-100"
                  >
                    {label}: {count}
                  </span>
                ))}
              </div>
            )}

            <div className="max-h-[45vh] space-y-3 overflow-y-auto pr-1">
              {filteredEntries.length === 0 && (
                <p className="text-[12px] text-slate-300">No events captured yet.</p>
              )}
              {filteredEntries.map((entry, index) => {
                const badgeStyle = EVENT_COLORS[entry.label ?? ''] ?? 'bg-slate-600/20 text-slate-100 border-white/10';
                const detailText = entry.detail == null ? null : formatDetail(entry.detail);
                return (
                  <div key={`${entry.timestamp}-${entry.label}-${index}`} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className={`rounded-full border px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide ${badgeStyle}`}>
                        {entry.label}
                      </span>
                      <span className="text-[11px] text-slate-200">
                        {entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : '—'}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {detailText && (
                        <pre className="whitespace-pre-wrap rounded-lg bg-black/30 p-2 text-[11px] text-slate-100">
                          {detailText}
                        </pre>
                      )}
                      {entry.campaignId && (
                        <p className="text-[11px] text-slate-400">campaign: {entry.campaignId}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CampaignSseOverlay;
