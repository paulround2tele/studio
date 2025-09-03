import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSSE } from '@/hooks/useSSE';
import { useToast } from '@/hooks/use-toast';

/**
 * Subscribes to campaign-specific SSE events and invalidates the campaign-state query
 * on relevant phase/campaign changes so UI auto-refreshes without polling.
 */
export function useCampaignPhaseEvents(campaignId: string | null | undefined) {
  const queryClient = useQueryClient();
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
          // Only invalidate on progress to keep UI up-to-date
          queryClient.invalidateQueries({ queryKey: ['campaign-state', campaignId] });
          break;
        }
        case 'phase_started': {
          toast({ title: 'Phase started', description: `Phase ${phase} has started.` });
          queryClient.invalidateQueries({ queryKey: ['campaign-state', campaignId] });
          break;
        }
        case 'phase_completed': {
          toast({ title: 'Phase completed', description: `Phase ${phase} completed successfully.` });
          queryClient.invalidateQueries({ queryKey: ['campaign-state', campaignId] });
          break;
        }
        case 'phase_failed': {
          const err = (data.error as string) || 'Unknown error';
          toast({ title: 'Phase failed', description: `Phase ${phase} failed: ${err}`, variant: 'destructive' });
          queryClient.invalidateQueries({ queryKey: ['campaign-state', campaignId] });
          break;
        }
        case 'campaign_completed': {
          toast({ title: 'Campaign completed', description: 'Campaign finished successfully.' });
          queryClient.invalidateQueries({ queryKey: ['campaign-state', campaignId] });
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
      queryClient.invalidateQueries({ queryKey: ['campaign-state', campaignId] });
    }
  }, [isConnected, campaignId, queryClient]);
}
