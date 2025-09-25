/**
 * Deprecated: WebSocket config removed; SSE-only architecture.
 * This module exists only to avoid import-time breaks if any stray references remain.
 */

export type WebSocketConfig = never;
export const webSocketConfig = undefined as unknown as WebSocketConfig;
export default webSocketConfig;