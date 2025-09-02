import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSSE } from '@/hooks/useSSE';

/**
 * Subscribes to campaign-specific SSE events and invalidates the campaign-state query
 * on relevant phase/campaign changes so UI auto-refreshes without polling.
 */
export function useCampaignPhaseEvents(campaignId: string | null | undefined) {
  const queryClient = useQueryClient();

  // Build SSE URL (Next.js rewrite proxies to backend localhost:8080)
  const url = campaignId ? `/api/v2/sse/campaigns/${campaignId}/events` : null;

  const { isConnected } = useSSE(
    url,
    (evt) => {
      if (!campaignId) return;
      const type = evt.event || '';
      switch (type) {
        case 'campaign_progress':
        case 'phase_started':
        case 'phase_completed':
        case 'phase_failed':
        case 'campaign_completed':
          // Invalidate composite campaign-state to fetch fresh executions/state
          queryClient.invalidateQueries({ queryKey: ['campaign-state', campaignId] });
          break;
        default:
          break;
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
      queryClient.invalidateQueries({ queryKey: ['campaign-state', campaignId] });
    }
  }, [isConnected, campaignId, queryClient]);
}
