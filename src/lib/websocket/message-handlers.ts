/**
 * Simplified WebSocket message handlers - 3 core message types only
 * TASK-WS-007: Remove complex message validation and routing
 * TASK-WS-007: Simplify to 3 core message types with basic JSON structure
 */

// Simplified Message Types - exactly 3 as required by TASK-WS-007
export const WebSocketMessageTypes = {
  CAMPAIGN_PROGRESS: 'campaign_progress',    // Campaign status and progress updates
  PHASE_TRANSITION: 'phase_transition',      // Phase state changes
  SYSTEM_NOTIFICATION: 'system_notification' // System alerts and notifications
} as const;

export type WebSocketMessageType = typeof WebSocketMessageTypes[keyof typeof WebSocketMessageTypes];

// Simple WebSocket message structure - basic JSON as required
export interface WebSocketMessage {
  type: WebSocketMessageType;
  data?: Record<string, unknown>;
  timestamp?: string;
}

// Specific message data structures (simplified)
export interface CampaignProgressData {
  campaignId: string;
  status: string;
  progress?: number;
  message?: string;
}

export interface PhaseTransitionData {
  campaignId: string;
  phase: string;
  status: string;
  message?: string;
}

export interface SystemNotificationData {
  level: 'info' | 'warning' | 'error';
  message: string;
  details?: string;
}

// Message handler type - simplified
export type MessageHandler = (message: WebSocketMessage) => void;

// Simplified message processing - no complex validation or routing
export function processWebSocketMessage(message: WebSocketMessage, handler: MessageHandler): void {
  try {
    // Basic validation only
    if (!message.type || !Object.values(WebSocketMessageTypes).includes(message.type as WebSocketMessageType)) {
      console.warn('Unknown WebSocket message type:', message.type);
      return;
    }
    
    // Simple timestamp handling
    if (!message.timestamp) {
      message.timestamp = new Date().toISOString();
    }
    
    // Direct handling - no complex routing
    handler(message);
  } catch (error) {
    console.error('Error processing WebSocket message:', error);
  }
}

// Export for compatibility
export default {
  WebSocketMessageTypes,
  processWebSocketMessage
};