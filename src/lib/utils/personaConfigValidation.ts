// CRITICAL SECURITY FIX: Type-safe persona configuration validation
// Addresses audit issue: "Persona Configuration Type Safety"

import { z } from 'zod';
import type { ConfigDNSValidatorConfigJSON } from '@/lib/api-client/models/config-dnsvalidator-config-json';
import type { ConfigHTTPValidatorConfigJSON } from '@/lib/api-client/models/config-httpvalidator-config-json';

type DnsPersonaConfig = ConfigDNSValidatorConfigJSON;
type HttpPersonaConfig = ConfigHTTPValidatorConfigJSON;

// Validation schemas that match backend DnsPersonaConfig and HttpPersonaConfig
export const dnsPersonaConfigSchema = z.object({
  // Generated model fields (all optional in spec; validate types and bounds)
  concurrentQueriesPerDomain: z.number().min(1).optional(),
  maxConcurrentGoroutines: z.number().min(1).optional(),
  maxDomainsPerRequest: z.number().min(1).optional(),
  queryDelayMaxMs: z.number().min(0).optional(),
  queryDelayMinMs: z.number().min(0).optional(),
  queryTimeoutSeconds: z.number().min(0).optional(),
  rateLimitBurst: z.number().min(0).optional(),
  rateLimitDps: z.number().min(0).optional(),
  resolverStrategy: z.string().optional(),
  resolvers: z.array(z.string().min(1)).optional(),
  resolversPreferredOrder: z.array(z.string()).optional(),
  resolversWeighted: z.record(z.string(), z.number()).optional(),
  useSystemResolvers: z.boolean().optional(),
});

export const httpPersonaConfigSchema = z.object({
  // Generated model fields (optional)
  allowInsecureTLS: z.boolean().optional(),
  defaultHeaders: z.record(z.string(), z.string()).optional(),
  defaultUserAgent: z.string().min(1).optional(),
  followRedirects: z.boolean().optional(),
  maxBodyReadBytes: z.number().min(0).optional(),
  maxConcurrentGoroutines: z.number().min(1).optional(),
  maxDomainsPerRequest: z.number().min(1).optional(),
  maxRedirects: z.number().min(0).optional(),
  rateLimitBurst: z.number().min(0).optional(),
  rateLimitDps: z.number().min(0).optional(),
  requestTimeoutSeconds: z.number().min(0).optional(),
  userAgents: z.array(z.string()).optional(),
});

/**
 * Safely validates and parses DNS persona configuration from backend JSON
 */
export function validateDnsPersonaConfig(rawConfig: unknown): DnsPersonaConfig {
  try {
    return dnsPersonaConfigSchema.parse(rawConfig);
  } catch (error) {
    console.error('DNS persona config validation failed:', error);
    throw new Error(`Invalid DNS persona configuration: ${error instanceof z.ZodError ? error.message : 'Unknown validation error'}`);
  }
}

/**
 * Safely validates and parses HTTP persona configuration from backend JSON
 */
export function validateHttpPersonaConfig(rawConfig: unknown): HttpPersonaConfig {
  try {
    return httpPersonaConfigSchema.parse(rawConfig);
  } catch (error) {
    console.error('HTTP persona config validation failed:', error);
    throw new Error(`Invalid HTTP persona configuration: ${error instanceof z.ZodError ? error.message : 'Unknown validation error'}`);
  }
}

/**
 * Safely serializes persona configuration for backend submission
 */
export function serializePersonaConfig(config: DnsPersonaConfig | HttpPersonaConfig): string {
  try {
    return JSON.stringify(config);
  } catch (error) {
    console.error('Persona config serialization failed:', error);
    throw new Error('Failed to serialize persona configuration');
  }
}

/**
 * Safely deserializes persona configuration from backend response
 */
export function deserializePersonaConfig(configJson: string | object, personaType: 'dns' | 'http'): DnsPersonaConfig | HttpPersonaConfig {
  try {
    const config = typeof configJson === 'string' ? JSON.parse(configJson) : configJson;
    
    if (personaType === 'dns') {
      return validateDnsPersonaConfig(config);
    } else {
      return validateHttpPersonaConfig(config);
    }
  } catch (error) {
    console.error('Persona config deserialization failed:', error);
    throw new Error(`Failed to deserialize ${personaType} persona configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
