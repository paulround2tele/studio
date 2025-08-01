/**
 * WebSocket message handlers with proper typing and validation
 * Ensures type safety for all real-time updates
 * Updated to use OpenAPI types directly
 */

// WebSocket Message Types - REFACTORED: Domain data types removed, use REST APIs
export const WebSocketMessageTypes = {
  // Campaign progress and lifecycle events (KEEP - WebSocket appropriate)
  CAMPAIGN_PROGRESS: 'campaign_progress',
  CAMPAIGN_STATUS: 'campaign_status',
  CAMPAIGN_LIST_UPDATE: 'campaign_list_update', // Complete campaign list updates
  CAMPAIGN_CREATED: 'campaign_created',         // Single campaign added
  CAMPAIGN_DELETED: 'campaign_deleted',         // Single campaign removed
  PHASE_TRANSITION: 'phase_transition',         // Campaign phase transitions
  CAMPAIGN_PHASE_TRANSITION: 'campaign.phase.transition', // Enhanced phase transitions with data integrity
  
  // User-Driven Phase Lifecycle WebSocket events (KEEP - Single event notifications)
  PHASE_STATE_CHANGED: 'phase.state.changed',  // Phase state transitions (ready -> configured -> running -> completed)
  PHASE_CONFIGURATION_REQUIRED: 'phase.configuration.required', // Phase requires configuration before start
  
  // System and proxy events (KEEP - Appropriate for WebSocket)
  SYSTEM_NOTIFICATION: 'system_notification',
  PROXY_STATUS: 'proxy_status',
  PROXY_LIST_UPDATE: 'proxy_list_update',       // Proxy CRUD operations
  PROXY_STATUS_UPDATE: 'proxy_status_update',   // Proxy status changes
  
  // Error handling (KEEP)
  ERROR: 'error',
  
  // REMOVED: Domain data streaming (use REST APIs instead)
  // - DOMAIN_GENERATED: Use GET /campaigns/{id}/domains or bulk endpoints
  // - DNS_VALIDATION_RESULT: Use GET /campaigns/{id}/domains with polling
  // - HTTP_VALIDATION_RESULT: Use GET /campaigns/{id}/domains with polling  
  // - DASHBOARD_ACTIVITY: Use REST endpoints for domain activity data
} as const;

export type WebSocketMessageType = typeof WebSocketMessageTypes[keyof typeof WebSocketMessageTypes];

// Base WebSocket message structure
export interface BaseWebSocketMessage {
  type: WebSocketMessageType;
  timestamp: string;
  data: unknown;
}

// Specific message types
export interface CampaignProgressMessage extends BaseWebSocketMessage {
  type: typeof WebSocketMessageTypes.CAMPAIGN_PROGRESS;
  data: {
    campaignId: string;
    progressPercent: number;
    phase: string;
    status: string;
  };
}

export interface CampaignStatusMessage extends BaseWebSocketMessage {
  type: typeof WebSocketMessageTypes.CAMPAIGN_STATUS;
  data: {
    campaignId: string;
    status: string;
    phase?: string;
    errorCode?: string;
  };
}

export interface PhaseTransitionMessage extends BaseWebSocketMessage {
  type: typeof WebSocketMessageTypes.PHASE_TRANSITION;
  data: {
    campaignId: string;
    previousPhase: string;
    newPhase: string;
    newStatus: string;
    timestamp: string;
    transitionType: string;
  };
}

// Enhanced phase transition message with data integrity features
export interface EnhancedPhaseTransitionMessage extends BaseWebSocketMessage {
  type: typeof WebSocketMessageTypes.CAMPAIGN_PHASE_TRANSITION;
  data: {
    campaignId: string;
    previousPhase?: string;
    newPhase: string;
    newStatus: string;
    transitionType: string;
    triggerReason?: string;
    prerequisitesMet: boolean;
    dataIntegrityCheck: boolean;
    domainsCount: number;
    processedCount: number;
    successfulCount: number;
    failedItems: number;
    estimatedDuration?: number;
    transitionMetadata?: Record<string, unknown>;
    rollbackData?: Record<string, unknown>;
  };
  sequence?: {
    campaignId: string;
    eventId: string;
    sequenceNumber: number;
    eventHash: string;
    previousEventId?: string;
    checkpointData: boolean;
  };
}

export interface SystemNotificationMessage extends BaseWebSocketMessage {
  type: typeof WebSocketMessageTypes.SYSTEM_NOTIFICATION;
  data: {
    level: string;
    message: string;
    actionable?: boolean;
  };
}

export interface ErrorMessage extends BaseWebSocketMessage {
  type: typeof WebSocketMessageTypes.ERROR;
  data: {
    code: string;
    message: string;
    details?: string;
    campaignId?: string;
  };
}

// User-Driven Phase Lifecycle message types
export interface PhaseStateChangedMessage extends BaseWebSocketMessage {
  type: typeof WebSocketMessageTypes.PHASE_STATE_CHANGED;
  data: {
    campaign_id: string;
    phase: string;
    old_state: string;
    new_state: string;
    timestamp: string;
  };
}

export interface PhaseConfigurationRequiredMessage extends BaseWebSocketMessage {
  type: typeof WebSocketMessageTypes.PHASE_CONFIGURATION_REQUIRED;
  data: {
    campaign_id: string;
    phase: string;
    message: string;
  };
}

export type TypedWebSocketMessage =
  | CampaignProgressMessage
  | CampaignStatusMessage
  | PhaseTransitionMessage
  | EnhancedPhaseTransitionMessage
  | PhaseStateChangedMessage
  | PhaseConfigurationRequiredMessage
  | SystemNotificationMessage
  | ErrorMessage
  | BaseWebSocketMessage;

// WebSocket handlers interface - REFACTORED: Domain data handlers removed
export interface WebSocketHandlers {
  // Campaign progress and lifecycle (KEEP - appropriate for WebSocket)
  onCampaignProgress?: (message: CampaignProgressMessage) => void;
  onCampaignStatus?: (message: CampaignStatusMessage) => void;
  onPhaseTransition?: (message: PhaseTransitionMessage) => void;
  onEnhancedPhaseTransition?: (message: EnhancedPhaseTransitionMessage) => void;
  
  // User-Driven Phase Lifecycle handlers (KEEP - single event notifications)
  onPhaseStateChanged?: (message: PhaseStateChangedMessage) => void;
  onPhaseConfigurationRequired?: (message: PhaseConfigurationRequiredMessage) => void;
  
  // System notifications and proxy status (KEEP - appropriate for WebSocket)
  onSystemNotification?: (message: SystemNotificationMessage) => void;
  onProxyStatus?: (message: BaseWebSocketMessage) => void;
  onProxyListUpdate?: (message: BaseWebSocketMessage) => void;
  onProxyStatusUpdate?: (message: BaseWebSocketMessage) => void;
  
  // Error handling (KEEP)
  onError?: (message: ErrorMessage) => void;
  onUnknownMessage?: (message: BaseWebSocketMessage) => void;
  
  // REMOVED: Domain data handlers - use REST APIs instead
  // onDomainGenerated?: Use GET /campaigns/{id}/domains with polling or bulk endpoints
  // onDNSValidationResult?: Use GET /campaigns/{id}/domains with polling
  // onHTTPValidationResult?: Use GET /campaigns/{id}/domains with polling
  // onDashboardActivity?: Use REST endpoints for domain activity data
}

// Parse WebSocket message from raw string
export function parseWebSocketMessage(rawMessage: string): TypedWebSocketMessage | null {
  try {
    const parsed = JSON.parse(rawMessage);
    
    if (!parsed || typeof parsed !== 'object' || !parsed.type || !parsed.timestamp) {
      return null;
    }
    
    return parsed as TypedWebSocketMessage;
  } catch {
    return null;
  }
}

// Route message to appropriate handler - REFACTORED: Domain data handlers removed
export function routeWebSocketMessage(
  message: TypedWebSocketMessage,
  handlers: WebSocketHandlers
): void {
  switch (message.type) {
    case WebSocketMessageTypes.CAMPAIGN_PROGRESS:
      handlers.onCampaignProgress?.(message as CampaignProgressMessage);
      break;
    case WebSocketMessageTypes.CAMPAIGN_STATUS:
      handlers.onCampaignStatus?.(message as CampaignStatusMessage);
      break;
    case WebSocketMessageTypes.PHASE_TRANSITION:
      handlers.onPhaseTransition?.(message as PhaseTransitionMessage);
      break;
    case WebSocketMessageTypes.CAMPAIGN_PHASE_TRANSITION:
      handlers.onEnhancedPhaseTransition?.(message as EnhancedPhaseTransitionMessage);
      break;
    case WebSocketMessageTypes.PHASE_STATE_CHANGED:
      handlers.onPhaseStateChanged?.(message as PhaseStateChangedMessage);
      break;
    case WebSocketMessageTypes.PHASE_CONFIGURATION_REQUIRED:
      handlers.onPhaseConfigurationRequired?.(message as PhaseConfigurationRequiredMessage);
      break;
    // REMOVED: Domain data handlers - use REST APIs instead
    // case WebSocketMessageTypes.DOMAIN_GENERATED:
    // case WebSocketMessageTypes.DNS_VALIDATION_RESULT:
    // case WebSocketMessageTypes.HTTP_VALIDATION_RESULT:
    // case WebSocketMessageTypes.DASHBOARD_ACTIVITY:
    case WebSocketMessageTypes.SYSTEM_NOTIFICATION:
      handlers.onSystemNotification?.(message as SystemNotificationMessage);
      break;
    case WebSocketMessageTypes.PROXY_STATUS:
      handlers.onProxyStatus?.(message);
      break;
    case WebSocketMessageTypes.PROXY_LIST_UPDATE:
      handlers.onProxyListUpdate?.(message);
      break;
    case WebSocketMessageTypes.PROXY_STATUS_UPDATE:
      handlers.onProxyStatusUpdate?.(message);
      break;
    case WebSocketMessageTypes.ERROR:
      handlers.onError?.(message as ErrorMessage);
      break;
    default:
      handlers.onUnknownMessage?.(message);
      break;
  }
}

/**
 * Message handler registry
 */
interface MessageHandlerRegistry {
  campaignHandlers: Map<string, WebSocketHandlers>;
  globalHandlers: WebSocketHandlers;
}

/**
 * Create a message handler registry
 */
export function createMessageHandlerRegistry(): MessageHandlerRegistry {
  return {
    campaignHandlers: new Map(),
    globalHandlers: {}
  };
}

/**
 * Register handlers for a specific campaign
 */
export function registerCampaignHandlers(
  registry: MessageHandlerRegistry,
  campaignId: string,
  handlers: Partial<WebSocketHandlers>
): () => void {
  registry.campaignHandlers.set(campaignId, {
    ...registry.campaignHandlers.get(campaignId),
    ...handlers
  });

  // Return cleanup function
  return () => {
    registry.campaignHandlers.delete(campaignId);
  };
}

/**
 * Register global handlers
 */
export function registerGlobalHandlers(
  registry: MessageHandlerRegistry,
  handlers: Partial<WebSocketHandlers>
): void {
  registry.globalHandlers = {
    ...registry.globalHandlers,
    ...handlers
  };
}

/**
 * Process raw WebSocket message with validation and routing
 */
export function processWebSocketMessage(
  registry: MessageHandlerRegistry,
  rawMessage: string
): void {
  
  try {
    // DIAGNOSTIC: Enhanced message processing logging
    console.log(`🔍 [DIAGNOSTIC] Processing WebSocket message:`, {
      messageLength: rawMessage.length,
      messagePreview: rawMessage.substring(0, 100) + (rawMessage.length > 100 ? '...' : '')
    });
    
    // Parse and validate message
    const message = parseWebSocketMessage(rawMessage);
    
    if (!message) {
      console.error('❌ [DIAGNOSTIC] Invalid WebSocket message format', {
        rawMessage: rawMessage.substring(0, 200),
        parseError: 'parseWebSocketMessage returned null'
      });
      return;
    }

    // DIAGNOSTIC: Log parsed message details
    console.log(`✅ [DIAGNOSTIC] Successfully parsed WebSocket message:`, {
      type: message.type,
      hasData: !!message.data,
      dataKeys: message.data ? Object.keys(message.data as object) : [],
      timestamp: message.timestamp
    });

    // DIAGNOSTIC: Check for campaign ID in various formats
    const campaignId = extractCampaignId(message);
    if (campaignId) {
      console.log(`🎯 [DIAGNOSTIC] Campaign ID extracted: ${campaignId}`);
    } else {
      console.log(`⚠️ [DIAGNOSTIC] No campaign ID found in message type: ${message.type}`);
    }

    // Route to appropriate handlers
    handleTypedMessage(registry, message);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ [DIAGNOSTIC] WebSocket message processing error', {
      error: errorMessage,
      rawMessage: rawMessage.substring(0, 200)
    });
  }
}

/**
 * Handle typed WebSocket message
 */
function handleTypedMessage(
  registry: MessageHandlerRegistry,
  message: TypedWebSocketMessage
): void {
  // Route to global handlers
  if (registry.globalHandlers) {
    routeWebSocketMessage(message, registry.globalHandlers);
  }

  // Route to campaign-specific handlers if applicable
  const campaignId = extractCampaignId(message);
  if (campaignId) {
    const campaignHandlers = registry.campaignHandlers.get(campaignId);
    if (campaignHandlers) {
      routeWebSocketMessage(message, campaignHandlers);
    }
  }
}

/**
 * Extract campaign ID from message - REFACTORED: Domain message types removed
 */
function extractCampaignId(message: TypedWebSocketMessage): string | null {
  switch (message.type) {
    case WebSocketMessageTypes.CAMPAIGN_PROGRESS:
    case WebSocketMessageTypes.CAMPAIGN_STATUS:
      return (message.data as { campaignId: string }).campaignId;
    
    // REMOVED: Domain data message types - use REST APIs for domain data
    // case WebSocketMessageTypes.DOMAIN_GENERATED:
    // case WebSocketMessageTypes.DNS_VALIDATION_RESULT:
    // case WebSocketMessageTypes.HTTP_VALIDATION_RESULT:
    //   return (message.data as { campaignId: string }).campaignId;
    
    case WebSocketMessageTypes.PROXY_STATUS:
      const proxyData = message.data as { campaignId?: string };
      return proxyData.campaignId || null;
    
    default:
      return null;
  }
}

/**
 * Create default campaign progress handler
 */
export function createCampaignProgressHandler(
  onUpdate: (campaignId: string, progress: number, phase: string, status: string) => void
): WebSocketHandlers['onCampaignProgress'] {
  return (message: CampaignProgressMessage) => {
    const { campaignId, progressPercent, phase, status } = message.data;
    onUpdate(campaignId, progressPercent, phase, status);
  };
}

/**
 * Create default campaign status handler
 */
export function createCampaignStatusHandler(
  onStatusChange: (campaignId: string, status: string, phase?: string, error?: string) => void
): WebSocketHandlers['onCampaignStatus'] {
  return (message: CampaignStatusMessage) => {
    const { campaignId, status, phase, errorCode } = message.data;
    onStatusChange(campaignId, status, phase, errorCode);
  };
}

/**
 * Create default system notification handler
 */
export function createSystemNotificationHandler(
  onNotification: (level: string, message: string, actionable: boolean) => void
): WebSocketHandlers['onSystemNotification'] {
  return (message: SystemNotificationMessage) => {
    const { level, message: text, actionable = false } = message.data;
    onNotification(level, text, actionable);
  };
}

/**
 * Create error handler with automatic error tracking
 */
export function createErrorHandler(
  onError?: (error: ErrorMessage) => void
): WebSocketHandlers['onError'] {
  return (message: ErrorMessage) => {
    const { code, message: errorMessage, details, campaignId } = message.data;
    

    // Log error
    console.error('WebSocket error', { code, details, campaignId, errorMessage });

    // Call custom handler if provided
    onError?.(message);
  };
}

/**
 * Create comprehensive WebSocket handlers with validation
 */
export function createValidatedWebSocketHandlers(
  customHandlers: Partial<WebSocketHandlers> = {}
): WebSocketHandlers {
  return {
    // Campaign handlers
    onCampaignProgress: customHandlers.onCampaignProgress || ((message) => {
      console.log('[WebSocket] Campaign progress:', message.data);
    }),
    
    onCampaignStatus: customHandlers.onCampaignStatus || ((message) => {
      console.log('[WebSocket] Campaign status:', message.data);
    }),
    
    // REMOVED: Domain handlers - use REST APIs instead
    // Domain data should be fetched via polling or bulk endpoints
    
    // System handlers (KEEP - appropriate for WebSocket)
    onSystemNotification: customHandlers.onSystemNotification || ((message) => {
      console.log('[WebSocket] System notification:', message.data);
    }),
    
    onProxyStatus: customHandlers.onProxyStatus || ((message) => {
      console.log('[WebSocket] Proxy status:', message.data);
    }),
    
    onProxyListUpdate: customHandlers.onProxyListUpdate || ((message) => {
      console.log('[WebSocket] Proxy list update:', message.data);
    }),
    
    onProxyStatusUpdate: customHandlers.onProxyStatusUpdate || ((message) => {
      console.log('[WebSocket] Proxy status update:', message.data);
    }),
    
    // Error handler with automatic tracking
    onError: createErrorHandler(customHandlers.onError),
    
    // Unknown message handler
    onUnknownMessage: customHandlers.onUnknownMessage || ((message) => {
      console.warn('[WebSocket] Unknown message type:', message.type, message);
    })
  };
}

/**
 * WebSocket connection state manager
 */
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export class WebSocketStateManager {
  private connectionState: ConnectionState = 'disconnected';
  private lastError: Error | null = null;
  private reconnectAttempts = 0;
  private listeners: Set<(state: ConnectionState) => void> = new Set();

  setConnectionState(state: ConnectionState, error?: Error): void {
    this.connectionState = state;
    if (error) {
      this.lastError = error;
        console.error('WebSocket connection error', {
          error,
          state,
          reconnectAttempts: this.reconnectAttempts
        });
    }
    
    // Notify listeners
    this.listeners.forEach(listener => listener(state));
    

  }

  incrementReconnectAttempts(): void {
    this.reconnectAttempts++;
  }

  resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
  }

  getState(): {
    connectionState: ConnectionState;
    lastError: Error | null;
    reconnectAttempts: number;
  } {
    return {
      connectionState: this.connectionState,
      lastError: this.lastError,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  subscribe(listener: (state: typeof this.connectionState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

/**
 * Message validation statistics
 */
export class MessageValidationStats {
  private stats = {
    totalMessages: 0,
    validMessages: 0,
    invalidMessages: 0,
    messageTypes: new Map<string, number>(),
    lastReset: Date.now()
  };

  recordMessage(messageType: string, isValid: boolean): void {
    this.stats.totalMessages++;
    if (isValid) {
      this.stats.validMessages++;
      const count = this.stats.messageTypes.get(messageType) || 0;
      this.stats.messageTypes.set(messageType, count + 1);
    } else {
      this.stats.invalidMessages++;
    }
  }

  getStats(): {
    totalMessages: number;
    validMessages: number;
    invalidMessages: number;
    validationRate: number;
    messageTypeDistribution: Record<string, number>;
    uptime: number;
  } {
    const validationRate = this.stats.totalMessages > 0
      ? (this.stats.validMessages / this.stats.totalMessages) * 100
      : 100;

    const messageTypeDistribution: Record<string, number> = {};
    this.stats.messageTypes.forEach((count, type) => {
      messageTypeDistribution[type] = count;
    });

    return {
      totalMessages: this.stats.totalMessages,
      validMessages: this.stats.validMessages,
      invalidMessages: this.stats.invalidMessages,
      validationRate,
      messageTypeDistribution,
      uptime: Date.now() - this.stats.lastReset
    };
  }

  reset(): void {
    this.stats = {
      totalMessages: 0,
      validMessages: 0,
      invalidMessages: 0,
      messageTypes: new Map(),
      lastReset: Date.now()
    };
  }
}