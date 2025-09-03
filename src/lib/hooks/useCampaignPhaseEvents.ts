import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useSSE } from '@/hooks/useSSE';
import { useToast } from '@/hooks/use-toast';
import { campaignApi } from '@/store/api/campaignApi';

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
          // Invalidate RTK Query caches for this campaign
          dispatch(
            campaignApi.util.invalidateTags([
              { type: 'Campaign', id: campaignId },
              { type: 'CampaignProgress', id: campaignId },
            ])
          );
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
