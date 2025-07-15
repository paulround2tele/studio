/**
 * Frontend-Safe Type Definitions
 * 
 * These interfaces represent the transformed versions of swagger-generated types
 * where SQL null wrapper types (SqlNullInt32, SqlNullString, etc.) are converted
 * to simple frontend-safe types (number, string, etc.).
 */

import type { Proxy } from '@/lib/api-client/models/models-proxy';
import type { Campaign } from '@/lib/api-client/models/models-campaign';
import type { components } from '@/lib/api-client/types';

/**
 * Frontend-safe version of Proxy
 * All SqlNull wrapper types are transformed to simple types
 */
export interface FrontendProxy {
  /** Full proxy address (e.g., 'http://user:pass@host:port') */
  address: string;
  /** City location - transformed from SqlNullString */
  city?: string;
  /** Country code - transformed from SqlNullString */
  countryCode?: string;
  /** Creation timestamp */
  createdAt?: string;
  /** Proxy description - transformed from SqlNullString */
  description?: string;
  /** Failure count - transformed from SqlNullInt32 */
  failureCount?: number;
  /** Host address - transformed from SqlNullString */
  host?: string;
  /** Unique identifier */
  id?: string;
  /** Input password - transformed from SqlNullString */
  inputPassword?: string;
  /** Input username - transformed from SqlNullString */
  inputUsername?: string;
  /** Whether proxy is enabled */
  isEnabled?: boolean;
  /** Whether proxy is healthy */
  isHealthy?: boolean;
  /** Last health check time - transformed from SqlNullTime */
  lastCheckedAt?: string;
  /** Last error message - transformed from SqlNullString */
  lastError?: string;
  /** Last status - transformed from SqlNullString */
  lastStatus?: string;
  /** Last tested time - transformed from SqlNullTime */
  lastTested?: string;
  /** Latency in milliseconds - transformed from SqlNullInt32 */
  latencyMs?: number;
  /** Proxy name */
  name: string;
  /** Notes - transformed from SqlNullString */
  notes?: string;
  /** Port number - transformed from SqlNullInt32 */
  port?: number;
  /** Protocol (http, https, socks5, etc.) */
  protocol?: string;
  /** Provider name - transformed from SqlNullString */
  provider?: string;
  /** Frontend-specific status field */
  status?: string;
  /** Success count - transformed from SqlNullInt32 */
  successCount?: number;
  /** Update timestamp */
  updatedAt?: string;
  /** Username - transformed from SqlNullString */
  username?: string;
}

/**
 * Frontend-safe version of PersonaResponse
 * Uses the already-safe api.PersonaResponse type with proper typing
 */
export interface FrontendPersona {
  /** Persona configuration details */
  configDetails?: Record<string, any>;
  /** Creation timestamp */
  createdAt?: string;
  /** Persona description */
  description?: string;
  /** Unique identifier */
  id?: string;
  /** Whether persona is enabled */
  isEnabled?: boolean;
  /** Persona name */
  name?: string;
  /** Persona type (dns or http) */
  personaType?: components['schemas']['PersonaTypeEnum'];
  /** Update timestamp */
  updatedAt?: string;
}

/**
 * Frontend-safe version of Campaign
 * All SqlNull wrapper types are transformed to simple types
 */
export interface FrontendCampaign {
  /** Average processing rate */
  avgProcessingRate?: number;
  /** Business status */
  businessStatus?: string;
  /** Campaign type */
  campaignType: string;
  /** Completion timestamp */
  completedAt?: string;
  /** Creation timestamp */
  createdAt?: string;
  /** Current phase */
  currentPhase?: string;
  /** DNS validated domains count */
  dnsValidatedDomains?: number;
  /** DNS validation parameters */
  dnsValidationParams?: any;
  /** Domain generation parameters */
  domainGenerationParams?: any;
  /** Total domains count */
  domains?: number;
  /** Error message if any */
  errorMessage?: string;
  /** Estimated completion time */
  estimatedCompletionAt?: string;
  /** Extracted content items */
  extractedContent?: any[];
  /** Unique identifier */
  id?: string;
  /** Whether campaign is enabled */
  isEnabled?: boolean;
  /** Campaign name */
  name?: string;
  /** Campaign status */
  status?: string;
  /** Update timestamp */
  updatedAt?: string;
}

/**
 * Frontend-safe version of PersonaTestResponse
 */
export interface FrontendPersonaTestResult {
  /** Test result message */
  message?: string;
  /** Persona ID that was tested */
  personaId?: string;
  /** Persona name that was tested */
  personaName?: string;
  /** Persona type that was tested */
  personaType?: string;
  /** Test results data */
  results?: any;
  /** Whether test was successful */
  success?: boolean;
  /** Whether test passed */
  testPassed?: boolean;
  /** Detailed test results */
  testResults?: any;
  /** Test timestamp */
  timestamp?: string;
}

/**
 * Type transformation utility types
 */

/**
 * Utility type to transform SqlNull wrapper types to simple types
 */
export type TransformSqlNull<T> = T extends { int32?: number; valid?: boolean }
  ? number | undefined
  : T extends { string?: string; valid?: boolean }
  ? string | undefined
  : T extends { time?: string; valid?: boolean }
  ? string | undefined
  : T;

/**
 * Utility type to recursively transform all SqlNull fields in an object
 */
export type TransformSqlNullFields<T> = {
  [K in keyof T]: TransformSqlNull<T[K]>;
};

/**
 * Helper type to ensure backward compatibility
 */
export type FrontendSafeType<T> = T extends Proxy
  ? FrontendProxy
  : T extends Campaign
  ? FrontendCampaign
  : T extends components['schemas']['PersonaResponse']
  ? FrontendPersona
  : T;

/**
 * Re-export commonly used types for convenience
 */
export type { components } from '@/lib/api-client/types';

/**
 * Type aliases for cleaner imports
 */
export type FrontendSafeProxy = FrontendProxy;
export type FrontendSafePersona = FrontendPersona;
export type FrontendSafeCampaign = FrontendCampaign;
export type FrontendSafePersonaTestResult = FrontendPersonaTestResult;