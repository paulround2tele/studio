// Unified UI-facing proxy type composed from backend proxy response fields.
// The generated OpenAPI spec currently lacks a single rich proxy model containing
// all fields the UI expects (id, address, health metrics, operational stats).
// This interface normalizes what the UI components rely on so we can
// decouple presentation from raw generator output.
export interface UiProxy {
  id?: string;
  name?: string;
  description?: string;
  address?: string; // host:port or similar
  protocol?: string;
  country?: string;
  isEnabled?: boolean;
  isHealthy?: boolean;
  latencyMs?: number | string | null;
  lastCheckedAt?: string | Date | null;
  successCount?: number | string;
  failureCount?: number | string;
  lastError?: string | null;
}

// Type guard (lightweight) – can be expanded if needed
export function isUiProxy(obj: any): obj is UiProxy {
  return obj && typeof obj === 'object' && ('address' in obj || 'protocol' in obj || 'id' in obj);
}