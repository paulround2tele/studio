/**
 * WEBSOCKET TYPE CORRECTIONS - Aligned with Go Backend
 *
 * CRITICAL FIX: Frontend WebSocket message structure was completely misaligned
 * with backend format, causing parsing failures for real-time updates.
 *
 * Migration Guide:
 * 1. Replace all WebSocket message types with these corrected versions
 * 2. Remove non-existent fields (id, sequenceNumber, message, etc.)
 * 3. Update message handlers to use the correct payload structures
 */

// ============================================================================
// WEBSOCKET MESSAGE FORMAT - Matches Go Backend Exactly
// ============================================================================

/**
 * Base WebSocket message structure - matches Go backend
 * backend/internal/websocket/message_types.go
 */
export interface WebSocketMessage {
  type: string;       // Message type identifier
  timestamp: string;  // ISO 8601 timestamp string
  data: unknown;      // Payload specific to message type
}

// ============================================================================
// MESSAGE TYPE CONSTANTS
// ============================================================================

export const WebSocketMessageTypes = {
  // Campaign messages
  CAMPAIGN_PROGRESS: 'campaign.progress',
  CAMPAIGN_STATUS: 'campaign.status',
  
  // Domain messages
  DOMAIN_GENERATED: 'domain.generated',
  
  // Validation messages
  DNS_VALIDATION_RESULT: 'dns.validation.result',
  HTTP_VALIDATION_RESULT: 'http.validation.result',
  
  // System messages
  SYSTEM_NOTIFICATION: 'system.notification',
  
  // Proxy messages
  PROXY_STATUS: 'proxy.status',
  
  // Error messages
  ERROR: 'error'
} as const;

export type WebSocketMessageType = typeof WebSocketMessageTypes[keyof typeof WebSocketMessageTypes];

// ============================================================================
// MESSAGE PAYLOADS - Match Backend Structures
// ============================================================================

/**
 * Campaign progress update payload
 * CRITICAL: totalItems, processedItems, etc. are int64 - use number (OpenAPI compatible)
 */
export interface CampaignProgressPayload {
  campaignId: string;
  totalItems: number;        // int64 from backend - use number (OpenAPI compatible)
  processedItems: number;    // int64 from backend - use number (OpenAPI compatible)
  successfulItems: number;   // int64 from backend - use number (OpenAPI compatible)
  failedItems: number;       // int64 from backend - use number (OpenAPI compatible)
  progressPercent: number;       // float64 - safe as number
  phase: string;
  status: string;
}

/**
 * Campaign status change payload
 */
export interface CampaignStatusPayload {
  campaignId: string;
  status: string;
  phase?: string;
  message?: string;
  errorCode?: string;
}

/**
 * Domain generation payload
 * CRITICAL: offset and totalGenerated are int64 - use number (OpenAPI compatible)
 */
export interface DomainGenerationPayload {
  campaignId: string;
  domainId: string;
  domain: string;
  offset: number;         // int64 from backend - use number (OpenAPI compatible)
  batchSize: number;         // int32 - safe
  totalGenerated: number; // int64 from backend - use number (OpenAPI compatible)
}

/**
 * DNS validation result payload
 */
export interface DNSValidationPayload {
  campaignId: string;
  domainId: string;
  domain: string;
  validationStatus: string;
  dnsRecords?: Record<string, unknown>;
  attempts: number;
  processingTime: number; // milliseconds
  totalValidated: number; // int64 from backend - use number (OpenAPI compatible)
}

/**
 * HTTP validation result payload
 */
export interface HTTPValidationPayload {
  campaignId: string;
  domainId: string;
  domain: string;
  validationStatus: string;
  httpStatus?: number;
  keywords?: string[];
  content?: string;
  headers?: Record<string, unknown>;
  processingTime: number; // milliseconds
  totalValidated: number; // int64 from backend - use number (OpenAPI compatible)
}

/**
 * System notification payload
 */
export interface SystemNotificationPayload {
  level: 'info' | 'warning' | 'error';
  message: string;
  category?: string;
  actionable?: boolean;
}

/**
 * Proxy status payload
 */
export interface ProxyStatusPayload {
  proxyId: string;
  status: string;
  campaignId?: string;
  health?: string;
  responseTime?: number; // milliseconds
}

/**
 * Error payload
 */
export interface ErrorPayload {
  code: string;
  message: string;
  details?: unknown;
  campaignId?: string;
}

// ============================================================================
// TYPED MESSAGE INTERFACES
// ============================================================================

export interface CampaignProgressMessage extends WebSocketMessage {
  type: typeof WebSocketMessageTypes.CAMPAIGN_PROGRESS;
  data: CampaignProgressPayload;
}

export interface CampaignStatusMessage extends WebSocketMessage {
  type: typeof WebSocketMessageTypes.CAMPAIGN_STATUS;
  data: CampaignStatusPayload;
}

export interface DomainGeneratedMessage extends WebSocketMessage {
  type: typeof WebSocketMessageTypes.DOMAIN_GENERATED;
  data: DomainGenerationPayload;
}

export interface DNSValidationResultMessage extends WebSocketMessage {
  type: typeof WebSocketMessageTypes.DNS_VALIDATION_RESULT;
  data: DNSValidationPayload;
}

export interface HTTPValidationResultMessage extends WebSocketMessage {
  type: typeof WebSocketMessageTypes.HTTP_VALIDATION_RESULT;
  data: HTTPValidationPayload;
}

export interface SystemNotificationMessage extends WebSocketMessage {
  type: typeof WebSocketMessageTypes.SYSTEM_NOTIFICATION;
  data: SystemNotificationPayload;
}

export interface ProxyStatusMessage extends WebSocketMessage {
  type: typeof WebSocketMessageTypes.PROXY_STATUS;
  data: ProxyStatusPayload;
}

export interface ErrorMessage extends WebSocketMessage {
  type: typeof WebSocketMessageTypes.ERROR;
  data: ErrorPayload;
}

// Union type for all possible messages
export type TypedWebSocketMessage =
  | CampaignProgressMessage
  | CampaignStatusMessage
  | DomainGeneratedMessage
  | DNSValidationResultMessage
  | HTTPValidationResultMessage
  | SystemNotificationMessage
  | ProxyStatusMessage
  | ErrorMessage;

// ============================================================================
// MESSAGE PARSING AND VALIDATION
// ============================================================================

/**
 * Type guard to check if a message is a valid WebSocket message
 */
export function isWebSocketMessage(data: unknown): data is WebSocketMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    'timestamp' in data &&
    'data' in data &&
    typeof (data as Record<string, unknown>).type === 'string' &&
    typeof (data as Record<string, unknown>).timestamp === 'string'
  );
}

/**
 * Parse and transform raw WebSocket message
 * Handles int64 fields - now using number for OpenAPI compatibility
 */
export function parseWebSocketMessage(raw: string): TypedWebSocketMessage | null {
  try {
    const parsed = JSON.parse(raw);
    
    if (!isWebSocketMessage(parsed)) {
      console.error('Invalid WebSocket message format:', parsed);
      return null;
    }
    
    // Transform based on message type
    switch (parsed.type) {
      case WebSocketMessageTypes.CAMPAIGN_PROGRESS: {
        const data = parsed.data as Record<string, unknown>;
        return {
          ...parsed,
          type: WebSocketMessageTypes.CAMPAIGN_PROGRESS,
          data: {
            campaignId: data.campaignId,
            totalItems: Number(data.totalItems),
            processedItems: Number(data.processedItems),
            successfulItems: Number(data.successfulItems),
            failedItems: Number(data.failedItems),
            progressPercent: data.progressPercent,
            phase: data.phase,
            status: data.status
          }
        } as CampaignProgressMessage;
      }
        
      case WebSocketMessageTypes.DOMAIN_GENERATED: {
        const data = parsed.data as Record<string, unknown>;
        return {
          ...parsed,
          type: WebSocketMessageTypes.DOMAIN_GENERATED,
          data: {
            campaignId: data.campaignId,
            domainId: data.domainId,
            domain: data.domain,
            offset: Number(data.offset),
            batchSize: data.batchSize,
            totalGenerated: Number(data.totalGenerated)
          }
        } as DomainGeneratedMessage;
      }
        
      case WebSocketMessageTypes.DNS_VALIDATION_RESULT: {
        const data = parsed.data as Record<string, unknown>;
        return {
          ...parsed,
          type: WebSocketMessageTypes.DNS_VALIDATION_RESULT,
          data: {
            campaignId: data.campaignId,
            domainId: data.domainId,
            domain: data.domain,
            validationStatus: data.validationStatus,
            dnsRecords: data.dnsRecords,
            attempts: data.attempts,
            processingTime: data.processingTime,
            totalValidated: Number(data.totalValidated)
          }
        } as DNSValidationResultMessage;
      }
        
      case WebSocketMessageTypes.HTTP_VALIDATION_RESULT: {
        const data = parsed.data as Record<string, unknown>;
        return {
          ...parsed,
          type: WebSocketMessageTypes.HTTP_VALIDATION_RESULT,
          data: {
            campaignId: data.campaignId,
            domainId: data.domainId,
            domain: data.domain,
            validationStatus: data.validationStatus,
            httpStatus: data.httpStatus,
            keywords: data.keywords,
            content: data.content,
            headers: data.headers,
            processingTime: data.processingTime,
            totalValidated: Number(data.totalValidated)
          }
        } as HTTPValidationResultMessage;
      }
        
      default:
        // For other message types, no transformation needed
        return parsed as TypedWebSocketMessage;
    }
  } catch (error) {
    console.error('Failed to parse WebSocket message:', error);
    return null;
  }
}

// ============================================================================
// MESSAGE HANDLERS TYPE DEFINITIONS
// ============================================================================

export type WebSocketMessageHandler<T extends TypedWebSocketMessage> = (message: T) => void;

export interface WebSocketHandlers {
  onCampaignProgress?: WebSocketMessageHandler<CampaignProgressMessage>;
  onCampaignStatus?: WebSocketMessageHandler<CampaignStatusMessage>;
  onDomainGenerated?: WebSocketMessageHandler<DomainGeneratedMessage>;
  onDNSValidationResult?: WebSocketMessageHandler<DNSValidationResultMessage>;
  onHTTPValidationResult?: WebSocketMessageHandler<HTTPValidationResultMessage>;
  onSystemNotification?: WebSocketMessageHandler<SystemNotificationMessage>;
  onProxyStatus?: WebSocketMessageHandler<ProxyStatusMessage>;
  onError?: WebSocketMessageHandler<ErrorMessage>;
  onUnknownMessage?: (message: WebSocketMessage) => void;
}

/**
 * Route parsed message to appropriate handler
 */
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
    case WebSocketMessageTypes.DOMAIN_GENERATED:
      handlers.onDomainGenerated?.(message as DomainGeneratedMessage);
      break;
    case WebSocketMessageTypes.DNS_VALIDATION_RESULT:
      handlers.onDNSValidationResult?.(message as DNSValidationResultMessage);
      break;
    case WebSocketMessageTypes.HTTP_VALIDATION_RESULT:
      handlers.onHTTPValidationResult?.(message as HTTPValidationResultMessage);
      break;
    case WebSocketMessageTypes.SYSTEM_NOTIFICATION:
      handlers.onSystemNotification?.(message as SystemNotificationMessage);
      break;
    case WebSocketMessageTypes.PROXY_STATUS:
      handlers.onProxyStatus?.(message as ProxyStatusMessage);
      break;
    case WebSocketMessageTypes.ERROR:
      handlers.onError?.(message as ErrorMessage);
      break;
    default:
      handlers.onUnknownMessage?.(message);
  }
}

// ============================================================================
// MIGRATION GUIDE
// ============================================================================

/**
 * BEFORE (Incorrect):
 * ```typescript
 * interface WebSocketMessage {
 *   id: UUID;
 *   timestamp: ISODateString;
 *   type: string;
 *   sequenceNumber: number;
 *   data?: unknown;
 *   message?: string;
 *   campaignId?: UUID;
 *   phase?: string;
 *   status?: string;
 *   progress?: number;
 * }
 * ```
 * 
 * AFTER (Correct):
 * ```typescript
 * interface WebSocketMessage {
 *   type: string;
 *   timestamp: string;
 *   data: unknown;
 * }
 * ```
 * 
 * UPDATE YOUR CODE:
 * 
 * 1. Remove references to non-existent fields:
 *    - id, sequenceNumber, message, campaignId, phase, status, progress
 * 
 * 2. Access campaign data through the data payload:
 *    ```typescript
 *    // WRONG: if (message.campaignId === myCampaignId)
 *    // RIGHT: if (message.data.campaignId === myCampaignId)
 *    ```
 * 
 * 3. Use the parser for all incoming messages:
 *    ```typescript
 *    websocket.onmessage = (event) => {
 *      const message = parseWebSocketMessage(event.data);
 *      if (message) {
 *        routeWebSocketMessage(message, handlers);
 *      }
 *    };
 *    ```
 * 
 * 4. Handle numeric fields properly:
 *    ```typescript
 *    const progress = message.data as CampaignProgressPayload;
 *    console.log(`Processed: ${progress.processedItems}`);
 *    ```
 */