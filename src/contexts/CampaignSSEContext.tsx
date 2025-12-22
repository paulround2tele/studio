/**
 * CampaignSSEContext - Singleton SSE connection for campaign events
 * 
 * Problem: Multiple components calling useCampaignSSE() create duplicate EventSource
 * connections, causing reconnection storms and progress flip-flop.
 * 
 * Solution: Single SSE connection at the page level, shared via context.
 */
import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useCampaignSSE, type UseCampaignSSEReturn, type CampaignSSEEvents } from '@/hooks/useCampaignSSE';

interface CampaignSSEContextValue extends UseCampaignSSEReturn {
  campaignId: string | undefined;
}

const CampaignSSEContext = createContext<CampaignSSEContextValue | null>(null);

interface CampaignSSEProviderProps {
  campaignId: string | undefined;
  autoConnect?: boolean;
  events?: CampaignSSEEvents;
  children: ReactNode;
}

/**
 * Provider that creates a single SSE connection for a campaign.
 * Place this at the page level to share the connection across all components.
 */
export function CampaignSSEProvider({
  campaignId,
  autoConnect = true,
  events,
  children,
}: CampaignSSEProviderProps): JSX.Element {
  const sse = useCampaignSSE({
    campaignId,
    autoConnect,
    events,
  });

  const value = useMemo<CampaignSSEContextValue>(
    () => ({
      ...sse,
      campaignId,
    }),
    [sse, campaignId]
  );

  return (
    <CampaignSSEContext.Provider value={value}>
      {children}
    </CampaignSSEContext.Provider>
  );
}

/**
 * Hook to access the shared SSE connection state.
 * Components should use this instead of calling useCampaignSSE directly.
 * 
 * Falls back to a disabled state if used outside of CampaignSSEProvider.
 */
export function useSharedCampaignSSE(): CampaignSSEContextValue {
  const context = useContext(CampaignSSEContext);
  
  // Return a disabled state if no provider (e.g., storybook, tests)
  if (!context) {
    return {
      campaignId: undefined,
      isConnected: false,
      hasEverConnected: false,
      readyState: 2, // ES_CLOSED
      connectedAt: null,
      error: null,
      lastProgress: null,
      lastEvent: null,
      reconnect: () => {},
      disconnect: () => {},
      reconnectAttempts: 0,
    };
  }
  
  return context;
}

/**
 * Hook that returns SSE state only if the campaignId matches.
 * This prevents child components from reacting to events for different campaigns.
 */
export function useCampaignSSEForId(targetCampaignId: string | undefined): CampaignSSEContextValue | null {
  const context = useContext(CampaignSSEContext);
  
  if (!context || !targetCampaignId || context.campaignId !== targetCampaignId) {
    return null;
  }
  
  return context;
}

export { CampaignSSEContext };
