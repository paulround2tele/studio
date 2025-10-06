import { useEffect } from 'react';
// Use typed dispatch to avoid TS2345 errors when dispatching RTK Query util thunks
import { useAppDispatch } from '@/store/hooks';
import { useSSE } from '@/hooks/useSSE';
import { useToast } from '@/hooks/use-toast';
import { campaignApi } from '@/store/api/campaignApi';
import type { CampaignProgressResponse } from '@/lib/api-client/models/campaign-progress-response';
import type { DomainListItem } from '@/lib/api-client/models/domain-list-item';
import type { CampaignSseEvent } from '@/lib/api-client/models/campaign-sse-event';
import type { AnalysisReuseEnrichmentEvent } from '@/lib/api-client/models/analysis-reuse-enrichment-event';
import type { AnalysisFailedEvent } from '@/lib/api-client/models/analysis-failed-event';
import type { DomainStatusEvent } from '@/lib/api-client/models/domain-status-event';
import type { PhaseTransitionEvent } from '@/lib/api-client/models/phase-transition-event';
import type { PhaseFailedEvent } from '@/lib/api-client/models/phase-failed-event';
import type { CampaignDomainsListResponse } from '@/lib/api-client/models/campaign-domains-list-response';

/**
 * Subscribes to campaign-specific SSE events and invalidates the campaign-state query
 * on relevant phase/campaign changes so UI auto-refreshes without polling.
 */
export function useCampaignPhaseEvents(campaignId: string | null | undefined) {
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  // Build SSE URL (Next.js rewrite proxies to backend localhost:8080)
  const url = campaignId ? `/api/v2/sse/campaigns/${campaignId}/events` : null;

  function isCampaignSseEvent(obj: unknown): obj is CampaignSseEvent {
    if (!obj || typeof obj !== 'object') return false;
    const t = (obj as { type?: unknown }).type;
    return typeof t === 'string'; // rely on generated union narrowing after guard
  }

  const { isConnected } = useSSE(
    url,
    (evt) => {
      if (!campaignId) return;
      const raw = evt.data as unknown;
      // Handle non-modeled event names (legacy / internal) by evt.event fallback
      if (!isCampaignSseEvent(raw)) {
        if (evt.event === 'counters_reconciled') {
          toast({ title: 'Counters reconciled', description: 'Campaign counters adjusted for consistency.' });
          dispatch(
            campaignApi.util.invalidateTags([
              { type: 'Campaign', id: campaignId },
              { type: 'CampaignProgress', id: campaignId },
              { type: 'CampaignDomains', id: campaignId },
            ])
          );
        }
        return;
      }
      const phaseFallback = 'phase';
      switch (raw.type) {
        case 'analysis_reuse_enrichment': {
          const reuse = raw.payload as AnalysisReuseEnrichmentEvent;
          const count = reuse.featureVectorCount;
          toast({ title: 'Analysis reuse', description: `Reusing ${count ?? 'existing'} feature vector(s) from HTTP phase.` });
          break;
        }
        case 'analysis_failed': {
          const failed = raw.payload as AnalysisFailedEvent;
          const err = failed.error || 'Analysis preflight failed';
          const code = failed.errorCode as string | undefined;
          const desc = code ? `${err} (${code})` : err;
          toast({ title: 'Analysis failed', description: desc, variant: 'destructive' });
          // Invalidate analysis phase status & progress for refresh
          dispatch(
            campaignApi.util.invalidateTags([
              { type: 'Campaign', id: campaignId },
              { type: 'CampaignProgress', id: campaignId },
              { type: 'CampaignPhase', id: `${campaignId}:analysis` },
            ])
          );
          break;
        }
        case 'campaign_progress': {
          // Optimistically merge progress payload into existing cache if present
          try {
            dispatch(
              // Cast to any because util.updateQueryData returns a typed thunk not widening to UnknownAction
              campaignApi.util.updateQueryData(
                'getCampaignProgressStandalone',
                campaignId,
                (draft) => {
                  // Only apply if shape matches (defensive)
                  const incoming = raw.payload as Partial<CampaignProgressResponse>;
                  if (draft && incoming) {
                    Object.assign(draft, incoming);
                  }
                }
              )
            );
          } catch (_e) {
            // Swallow – cache entry may not exist yet
          }
          // Also invalidate enriched campaign to refresh any aggregated fields
          dispatch(
            campaignApi.util.invalidateTags([
              { type: 'Campaign', id: campaignId },
              { type: 'CampaignProgress', id: campaignId },
            ])
          );
          break;
        }
        case 'domain_generated':
        case 'domain_validated': {
          // Dynamic optimistic domain status propagation across cached pages.
          // Improvements over previous heuristic:
          //  * Derive page count from cached total (if available) per limit.
          //  * Stop after last cached page even if total unknown.
          //  * Handle shrink scenarios (if total decreased) by clamping probing.
          //  * Preserve lightweight best-effort nature (no crashes on cache miss).
          const incomingPayload = raw.payload as DomainStatusEvent;
          const incoming = incomingPayload as unknown as Partial<DomainListItem> & { id?: string; domain?: string };
          if (incoming && (incoming.id || incoming.domain)) {
            const limits = [25, 50, 100];
            try {
              limits.forEach((limit) => {
                // Discover cached pages for this limit by probing sequentially until a miss.
                const discoveredOffsets: number[] = [];
                let pageIndex = 0;
                let total: number | undefined; // track latest observed total
                const MAX_PROBE_PAGES = 25; // hard safety cap
                while (pageIndex < MAX_PROBE_PAGES) {
                  const offset = pageIndex * limit;
                  let hit = false;
                  try {
                    dispatch(
                      campaignApi.util.updateQueryData(
                        'getCampaignDomains',
                        { campaignId, limit, offset },
                        (draft) => {
                          if (!draft) return;
                          hit = true;
                          const d = draft as CampaignDomainsListResponse;
                          if (typeof d.total === 'number') total = d.total;
                          const items = d.items as DomainListItem[] | undefined;
                          if (!items || !items.length) return;
                          const idx = items.findIndex(
                            (d) =>
                              (incoming.id && d.id === incoming.id) ||
                              (incoming.domain && d.domain === incoming.domain)
                          );
                          if (idx !== -1) {
                            items[idx] = { ...items[idx], ...incoming };
                          }
                        }
                      )
                    );
                  } catch (_inner) {
                    // Cache miss -> stop probing further pages for this limit.
                  }
                  if (!hit) break;
                  discoveredOffsets.push(offset);
                  pageIndex += 1;
                  // If total known and we've covered all pages, stop early.
                  if (typeof total === 'number') {
                    const pageCount = Math.ceil(total / limit);
                    if (pageIndex >= pageCount) break;
                  }
                }
              });
            } catch (_e) {
              // Ignore top-level failures – optimistic path.
            }
          }
          break;
        }
        case 'phase_started': {
          const trans = raw.payload as PhaseTransitionEvent;
          const p = trans.phase || phaseFallback;
          toast({ title: 'Phase started', description: `Phase ${p} has started.` });
          dispatch(
            campaignApi.util.invalidateTags([
              { type: 'Campaign', id: campaignId },
              { type: 'CampaignProgress', id: campaignId },
              { type: 'CampaignPhase', id: `${campaignId}:${p}` },
            ])
          );
          break;
        }
        case 'phase_completed': {
          const trans = raw.payload as PhaseTransitionEvent;
          const p = trans.phase || phaseFallback;
          toast({ title: 'Phase completed', description: `Phase ${p} completed successfully.` });
          dispatch(
            campaignApi.util.invalidateTags([
              { type: 'Campaign', id: campaignId },
              { type: 'CampaignProgress', id: campaignId },
              { type: 'CampaignDomains', id: campaignId },
              { type: 'CampaignPhase', id: `${campaignId}:${p}` },
            ])
          );
          break;
        }
        case 'phase_failed': {
          const failed = raw.payload as PhaseFailedEvent;
          const p = failed.phase || phaseFallback;
          const err = failed.error || 'Unknown error';
          toast({ title: 'Phase failed', description: `Phase ${p} failed: ${err}`, variant: 'destructive' });
          dispatch(
            campaignApi.util.invalidateTags([
              { type: 'Campaign', id: campaignId },
              { type: 'CampaignProgress', id: campaignId },
              { type: 'CampaignPhase', id: `${campaignId}:${p}` },
            ])
          );
          break;
        }
        case 'campaign_completed': {
          toast({ title: 'Campaign completed', description: 'Campaign finished successfully.' });
          dispatch(
            campaignApi.util.invalidateTags([
              { type: 'Campaign', id: campaignId },
              { type: 'CampaignProgress', id: campaignId },
              { type: 'CampaignDomains', id: campaignId },
            ])
          );
          break;
        }
        default: {
          break;
        }
      }
    },
    {
      autoReconnect: true,
      maxReconnectAttempts: 10,
      reconnectDelay: 2000,
      withCredentials: true,
    }
  );

  // Optional: trigger initial refetch when SSE becomes connected
  useEffect(() => {
    if (isConnected && campaignId) {
      dispatch(
        campaignApi.util.invalidateTags([
          { type: 'Campaign', id: campaignId },
          { type: 'CampaignProgress', id: campaignId },
        ])
      );
    }
  }, [isConnected, campaignId, dispatch]);
}
