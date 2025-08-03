// File: src/hooks/useCampaignSSE.ts
import React, { useCallback, useEffect, useState } from 'react';
import { useSSE, type SSEEvent } from './useSSE';

export interface CampaignProgress {
  current_phase: string;
  progress_pct: number;
  items_processed: number;
  items_total: number;
  status: string;
  message?: string;
  timestamp: string;
}

export interface PhaseEvent {
  campaign_id: string;
  phase: string;
  message: string;
  results?: any;
  error?: string;
}

export interface CampaignSSEEvents {
  onProgress?: (campaignId: string, progress: CampaignProgress) => void;
  onPhaseStarted?: (campaignId: string, event: PhaseEvent) => void;
  onPhaseCompleted?: (campaignId: string, event: PhaseEvent) => void;
  onPhaseFailed?: (campaignId: string, event: PhaseEvent) => void;
  onDomainGenerated?: (campaignId: string, data: any) => void;
  onDomainValidated?: (campaignId: string, data: any) => void;
  onAnalysisCompleted?: (campaignId: string, data: any) => void;
  onError?: (campaignId: string, error: string) => void;
}

export interface UseCampaignSSEOptions {
  /**
   * Specific campaign ID to watch. If not provided, listens to all campaigns for the user.
   */
  campaignId?: string;
  
  /**
   * Whether to automatically connect on mount
   * @default true
   */
  autoConnect?: boolean;
  
  /**
   * Event handlers for different campaign events
   */
  events?: CampaignSSEEvents;
}

export interface UseCampaignSSEReturn {
  /**
   * Current connection state
   */
  isConnected: boolean;
  
  /**
   * Connection error if any
   */
  error: string | null;
  
  /**
   * Last received campaign progress (cached for easy access)
   */
  lastProgress: CampaignProgress | null;
  
  /**
   * Last received event
   */
  lastEvent: SSEEvent | null;
  
  /**
   * Manually reconnect
   */
  reconnect: () => void;
  
  /**
   * Close the connection
   */
  disconnect: () => void;
  
  /**
   * Number of reconnection attempts
   */
  reconnectAttempts: number;
}

/**
 * Specialized SSE hook for campaign events with typed event handlers
 * 
 * @param options - Campaign SSE configuration options
 * @returns Campaign SSE connection state and control functions
 */
export function useCampaignSSE(options: UseCampaignSSEOptions = {}): UseCampaignSSEReturn {
  const { campaignId, autoConnect = true, events = {} } = options;
  
  const [lastProgress, setLastProgress] = useState<CampaignProgress | null>(null);
  
  // Construct the SSE URL based on whether we're watching a specific campaign
  const sseUrl = autoConnect 
    ? campaignId 
      ? `/api/v2/sse/campaigns/${campaignId}/events`
      : '/api/v2/sse/events'
    : null;

  // Event handler for all SSE events
  const handleSSEEvent = useCallback((event: SSEEvent) => {
    const campaignIdFromEvent = event.campaign_id || event.data?.campaign_id;
    
    if (!campaignIdFromEvent) {
      console.warn('⚠️ Received SSE event without campaign_id:', event);
      return;
    }

    switch (event.event) {
      case 'campaign_progress':
        const progressData = event.data?.progress || event.data;
        if (progressData) {
          setLastProgress(progressData);
          events.onProgress?.(campaignIdFromEvent, progressData);
        }
        break;

      case 'phase_started':
        events.onPhaseStarted?.(campaignIdFromEvent, event.data);
        break;

      case 'phase_completed':
        events.onPhaseCompleted?.(campaignIdFromEvent, event.data);
        break;

      case 'phase_failed':
        events.onPhaseFailed?.(campaignIdFromEvent, event.data);
        break;

      case 'domain_generated':
        events.onDomainGenerated?.(campaignIdFromEvent, event.data);
        break;

      case 'domain_validated':
        events.onDomainValidated?.(campaignIdFromEvent, event.data);
        break;

      case 'analysis_completed':
        events.onAnalysisCompleted?.(campaignIdFromEvent, event.data);
        break;

      case 'error':
        const errorMessage = event.data?.error || event.data?.message || 'Unknown error';
        events.onError?.(campaignIdFromEvent, errorMessage);
        break;

      case 'keep_alive':
        // Keep-alive events don't need special handling
        break;

      default:
        console.log('📡 Received unknown SSE event type:', event.event, event.data);
    }
  }, [events]);

  // Use the generic SSE hook
  const sseConnection = useSSE(sseUrl, handleSSEEvent, {
    autoReconnect: true,
    maxReconnectAttempts: 5,
    reconnectDelay: 3000,
    withCredentials: true,
  });

  // Reset progress when campaign ID changes
  useEffect(() => {
    setLastProgress(null);
  }, [campaignId]);

  return {
    isConnected: sseConnection.isConnected,
    error: sseConnection.error,
    lastProgress,
    lastEvent: sseConnection.lastEvent,
    reconnect: sseConnection.reconnect,
    disconnect: sseConnection.close,
    reconnectAttempts: sseConnection.reconnectAttempts,
  };
}

/**
 * React component wrapper for campaign SSE events
 * Useful for declarative SSE event handling in components
 */
export function CampaignSSEProvider({ 
  children, 
  campaignId, 
  events 
}: { 
  children: React.ReactNode;
  campaignId?: string;
  events?: CampaignSSEEvents;
}) {
  useCampaignSSE({ campaignId, events });
  return React.createElement(React.Fragment, null, children);
}
