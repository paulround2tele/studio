import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
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
  const dispatch = useDispatch();
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
        case 'campaign_progress': {
          // Optimistically merge progress payload into existing cache if present
          try {
            dispatch(
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
        case 'domain_generated':
        case 'domain_validated': {
          // Optimistic domain status update across ALL cached pages for common limits.
          // We don't have direct introspection into RTKQ's internal cache keys, so we
          // speculatively attempt updates for a bounded range of offsets for each limit.
          // This is lightweight because missing cache entries simply throw & are swallowed.
          const incoming = data as Partial<DomainListItem> & { id?: string; domain?: string };
          if (incoming && (incoming.id || incoming.domain)) {
            const limits = [25, 50, 100]; // include 25 in case smaller page sizes are used elsewhere
            const maxPagesToProbe = 10; // safety cap (e.g. up to 1000 items for limit=100)
            try {
              limits.forEach((limit) => {
                for (let pageIndex = 0; pageIndex < maxPagesToProbe; pageIndex++) {
                  const offset = pageIndex * limit;
                  try {
                    dispatch(
                      campaignApi.util.updateQueryData(
                        'getCampaignDomains',
                        { campaignId, limit, offset },
                        (draft: any) => {
                          const items: DomainListItem[] | undefined = draft?.items as any;
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
                    // Stop probing further pages for this limit once a cache miss occurs
                    break;
                  }
                }
              });
            } catch (_e) {
              // Ignore top-level failures
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
