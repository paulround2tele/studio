// src/lib/utils/websocketMessageAdapter.ts
// Simplified WebSocket Message Type Adaptation
// Handles conversion between simple WebSocket messages and legacy message formats

import type { WebSocketMessage } from '@/lib/services/websocketService.simple';

// Define the legacy message format locally
interface CampaignProgressMessage {
  type: string;
  campaignId: string;
  data: Record<string, unknown>;
  message: string;
  timestamp: number;
}

// Helper function to convert string timestamp to number
function convertTimestamp(timestamp?: string): number {
  if (!timestamp) return Date.now();
  const parsed = new Date(timestamp).getTime();
  return isNaN(parsed) ? Date.now() : parsed;
}

// Helper function to extract campaign ID from message data
function extractCampaignIdFromData(data: unknown): string {
  if (data && typeof data === 'object' && 'campaignId' in data) {
    return String((data as Record<string, unknown>).campaignId);
  }
  return '00000000-0000-0000-0000-000000000000';
}

/**
 * Converts WebSocket message to legacy format for backward compatibility
 */
export function adaptWebSocketMessageToLegacy(message: WebSocketMessage): CampaignProgressMessage {
  // Helper function to safely extract progress data
  const extractProgressData = (data: unknown) => {
    if (!data || typeof data !== 'object') return { progressPercentage: 0, phase: '', status: '' };
    const obj = data as Record<string, unknown>;
    return {
      progressPercentage: typeof obj.progressPercentage === 'number' ? obj.progressPercentage : 0,
      phase: typeof obj.phase === 'string' ? obj.phase : '',
      status: typeof obj.status === 'string' ? obj.status : '',
    };
  };

  // Handle different message types and convert to legacy format
  switch (message.type) {
    case 'campaign_progress':
      const progressData = extractProgressData(message.data);
      return {
        type: 'progress',
        campaignId: extractCampaignIdFromData(message.data),
        data: {
          progress: progressData.progressPercentage,
          phase: progressData.phase,
          status: progressData.status,
        },
        message: `Campaign progress: ${progressData.progressPercentage}%`,
        timestamp: convertTimestamp(message.timestamp),
      };

    // DEPRECATED: Domain data message types - use REST APIs for domain data instead
    case 'domain_generated':
      console.warn('[DEPRECATED] domain_generated message received. Use REST API /campaigns/{id}/domains instead.');
      return {
        type: 'progress', // Convert to generic progress message
        campaignId: extractCampaignIdFromData(message.data),
        data: {
          progress: 0,
          phase: 'domain_generation',
          status: 'running',
        },
        message: 'Domain generation in progress - fetch latest data via REST API',
        timestamp: convertTimestamp(message.timestamp),
      };

    case 'dns_validation_result':
    case 'http_validation_result':
      console.warn(`[DEPRECATED] ${message.type} message received. Use REST API /campaigns/{id}/domains for validation status.`);
      return {
        type: 'progress', // Convert to generic progress message
        campaignId: extractCampaignIdFromData(message.data),
        data: {
          progress: 0,
          phase: 'validation',
          status: 'running',
        },
        message: 'Validation in progress - fetch latest data via REST API',
        timestamp: convertTimestamp(message.timestamp),
      };

    case 'campaign_phase_complete':
      const phaseData = extractProgressData(message.data);
      return {
        type: 'phase_complete',
        campaignId: extractCampaignIdFromData(message.data),
        data: {
          phase: phaseData.phase,
          status: 'completed',
        },
        message: `Phase ${phaseData.phase} completed`,
        timestamp: convertTimestamp(message.timestamp),
      };

    case 'campaign_complete':
      const finalStatus = message.data && typeof message.data === 'object' && 'finalStatus' in message.data 
        ? String((message.data as Record<string, unknown>).finalStatus)
        : 'completed';
      return {
        type: 'phase_complete',
        campaignId: extractCampaignIdFromData(message.data),
        data: {
          status: finalStatus,
        },
        message: `Campaign completed with status: ${finalStatus}`,
        timestamp: convertTimestamp(message.timestamp),
      };

    case 'campaign_error':
      const errorMessage = message.data && typeof message.data === 'object' && 'errorMessage' in message.data 
        ? String((message.data as Record<string, unknown>).errorMessage)
        : 'Unknown error';
      return {
        type: 'error',
        campaignId: extractCampaignIdFromData(message.data),
        data: {
          error: errorMessage,
        },
        message: errorMessage,
        timestamp: convertTimestamp(message.timestamp),
      };

    case 'connection_ack':
      return {
        type: 'subscription_confirmed',
        campaignId: '00000000-0000-0000-0000-000000000000',
        data: {},
        message: 'Connection acknowledged',
        timestamp: convertTimestamp(message.timestamp),
      };

    case 'system_notification':
    case 'user_notification':
      const notificationMessage = message.data && typeof message.data === 'object' && 'message' in message.data 
        ? String((message.data as Record<string, unknown>).message)
        : 'System notification';
      return {
        type: 'system_notification',
        campaignId: '00000000-0000-0000-0000-000000000000',
        data: {},
        message: notificationMessage,
        timestamp: convertTimestamp(message.timestamp),
      };

    default:
      console.warn('Unknown WebSocket message type:', message.type);
      return {
        type: 'subscription_confirmed',
        campaignId: '00000000-0000-0000-0000-000000000000',
        data: {},
        message: 'Unknown message type',
        timestamp: convertTimestamp(message.timestamp),
      };
  }
}

/**
 * Simple adapter function (alias for backward compatibility)
 */
export function adaptWebSocketMessage(message: WebSocketMessage): CampaignProgressMessage {
  return adaptWebSocketMessageToLegacy(message);
}

/**
 * Type guard to check if a message has campaign-specific data
 */
export function isMessageForCampaign(message: WebSocketMessage, campaignId: string): boolean {
  const messageCampaignId = extractCampaignIdFromData(message.data);
  if (messageCampaignId !== '00000000-0000-0000-0000-000000000000') {
    return messageCampaignId === campaignId;
  }
  
  // System-wide messages should be processed for all campaigns
  if (message.type === 'system_notification' || message.type === 'connection_ack') {
    return true;
  }
  
  return false;
}

/**
 * Extract campaign ID from various message formats
 */
export function extractCampaignId(message: WebSocketMessage): string | null {
  const campaignId = extractCampaignIdFromData(message.data);
  if (campaignId !== '00000000-0000-0000-0000-000000000000') {
    return campaignId;
  }
  
  return null;
}
