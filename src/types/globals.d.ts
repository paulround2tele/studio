/**
 * Global type declarations for window object extensions
 */

interface TelemetryService {
  emitTelemetry(eventName: string, data: Record<string, unknown>): void;
  emit(eventName: string, data: unknown): void; // legacy alias accepts unknown payload
}

declare global {
  interface Window {
    __telemetryService?: TelemetryService;
    telemetryService?: TelemetryService;
  }
}

export {};