/**
 * Deprecated: WebSocket config removed. SSE-only architecture.
 * This module exists only to avoid import-time breaks if any stray references remain.
 */

export type WebSocketConfig = never;

export const webSocketConfig = undefined as unknown as WebSocketConfig;
export function getWebSocketPerformanceConfig(): WebSocketConfig { return webSocketConfig; }
export function getWebSocketSessionConfig() { return {}; }
export const webSocketReconnectionConfig = {} as const;
export const webSocketAuthUtils = { isSessionValidForWebSocket: () => false } as const;
export default webSocketConfig;