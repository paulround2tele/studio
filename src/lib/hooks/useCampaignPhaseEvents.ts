import { useEffect } from 'react';
// Use typed dispatch to avoid TS2345 errors when dispatching RTK Query util thunks
import { useAppDispatch } from '@/store/hooks';
import { useSSE } from '@/hooks/useSSE';
import { useToast } from '@/hooks/use-toast';
import { campaignApi } from '@/store/api/campaignApi';
import type { CampaignProgressResponse } from '@/lib/api-client/models/campaign-progress-response';
import type { DomainListItem } from '@/lib/api-client/models/domain-list-item';

/**
 * Subscribes to campaign-specific SSE events and invalidates the campaign-state query
 * on relevant phase/campaign changes so UI auto-refreshes without polling.
 */
export function useCampaignPhaseEvents(campaignId: string | null | undefined) {
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  // Build SSE URL (Next.js rewrite proxies to backend localhost:8080)
  const url = campaignId ? `/api/v2/sse/campaigns/${campaignId}/events` : null;

  const { isConnected } = useSSE(
    url,
    (evt) => {
      if (!campaignId) return;
      const type = evt.event || '';
      const data = (evt.data ?? {}) as Record<string, any>;
      const phase = (data.phase as string) || 'phase';
      switch (type) {
        case 'analysis_reuse_enrichment': {
          const count = data.featureVectorCount ?? data.feature_vector_count;
          toast({ title: 'Analysis reuse', description: `Reusing ${count ?? 'existing'} feature vector(s) from HTTP phase.` });
          break;
        }
        case 'analysis_failed': {
          const err = (data.error as string) || 'Analysis preflight failed';
          const code = data.errorCode as string | undefined;
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
                  const incoming = data as Partial<CampaignProgressResponse>;
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
        case 'counters_reconciled': {
          // Reconciliation job adjusted aggregate counters (e.g., validated counts, scoring totals)
          // Strategy: invalidate campaign-level aggregates & domains so UI refetches authoritative values.
          toast({ title: 'Counters reconciled', description: 'Campaign counters adjusted for consistency.' });
          dispatch(
            campaignApi.util.invalidateTags([
              { type: 'Campaign', id: campaignId },
              { type: 'CampaignProgress', id: campaignId },
              { type: 'CampaignDomains', id: campaignId },
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
          const incoming = data as Partial<DomainListItem> & { id?: string; domain?: string };
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
                        (draft: any) => {
                          if (!draft) return;
                          hit = true;
                          // Capture total if exposed
                          if (typeof draft.total === 'number') total = draft.total;
                          const items: DomainListItem[] | undefined = draft.items as any;
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
                      ) as any
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
          toast({ title: 'Phase started', description: `Phase ${phase} has started.` });
          dispatch(
            campaignApi.util.invalidateTags([
              { type: 'Campaign', id: campaignId },
              { type: 'CampaignProgress', id: campaignId },
              { type: 'CampaignPhase', id: `${campaignId}:${phase}` },
            ])
          );
          break;
        }
        case 'phase_completed': {
          toast({ title: 'Phase completed', description: `Phase ${phase} completed successfully.` });
          dispatch(
            campaignApi.util.invalidateTags([
              { type: 'Campaign', id: campaignId },
              { type: 'CampaignProgress', id: campaignId },
              { type: 'CampaignDomains', id: campaignId },
              { type: 'CampaignPhase', id: `${campaignId}:${phase}` },
            ])
          );
          break;
        }
        case 'phase_failed': {
          const err = (data.error as string) || 'Unknown error';
          toast({ title: 'Phase failed', description: `Phase ${phase} failed: ${err}`, variant: 'destructive' });
          dispatch(
            campaignApi.util.invalidateTags([
              { type: 'Campaign', id: campaignId },
              { type: 'CampaignProgress', id: campaignId },
              { type: 'CampaignPhase', id: `${campaignId}:${phase}` },
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
