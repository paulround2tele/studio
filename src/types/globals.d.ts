/**
 * Global type declarations for window object extensions
 */

interface TelemetryService {
  emitTelemetry(eventName: string, data: Record<string, unknown>): void;
}

declare global {
  interface Window {
    __telemetryService?: TelemetryService;
    telemetryService?: TelemetryService;
  }
}

export {};