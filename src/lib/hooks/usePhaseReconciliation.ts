import { useEffect, useRef } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { campaignApi } from '@/store/api/campaignApi';
import { PIPELINE_PHASE_ORDER } from '@/store/selectors/pipelineSelectors';

interface UsePhaseReconciliationOptions {
  campaignId: string | null | undefined;
  intervalMs?: number;
  staleThresholdMs?: number; // if lastUpdate older than this, force refetch
}

// Lightweight in-memory last refetch timestamps per (campaign, phase)
const lastRefetch: Record<string, number> = {};

export function usePhaseReconciliation({ campaignId, intervalMs = 15000, staleThresholdMs = 30000 }: UsePhaseReconciliationOptions) {
  const dispatch = useAppDispatch();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!campaignId) return;
    const cid = campaignId; // non-null assertion for closure
    function tick() {
      const now = Date.now();
      PIPELINE_PHASE_ORDER.forEach(phase => {
        const key = `${campaignId}:${phase}`;
        const last = lastRefetch[key] || 0;
        if (now - last > staleThresholdMs) {
          // trigger a refetch of that phase status query cache entry if it exists
          dispatch(campaignApi.util.invalidateTags([
            { type: 'CampaignPhase', id: key },
            { type: 'CampaignProgress', id: cid },
          ]));
          lastRefetch[key] = now;
        }
      });
      timerRef.current = window.setTimeout(tick, intervalMs);
    }
    timerRef.current = window.setTimeout(tick, intervalMs);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [campaignId, intervalMs, staleThresholdMs, dispatch]);
}
