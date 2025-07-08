// CRITICAL SECURITY FIX: Type-safe persona configuration validation
// Addresses audit issue: "Persona Configuration Type Safety"

import { z } from 'zod';
import type { components } from '@/lib/api-client/types';

type DnsPersonaConfig = components['schemas']['DnsPersonaConfig'];
type HttpPersonaConfig = components['schemas']['HttpPersonaConfig'];

// Validation schemas that match backend DnsPersonaConfig and HttpPersonaConfig
export const dnsPersonaConfigSchema = z.object({
  // Required fields
  maxDomainsPerRequest: z.number().min(1),
  queryTimeoutSeconds: z.number().min(0),
  resolverStrategy: z.enum(['round_robin', 'random', 'weighted', 'priority']),
  resolvers: z.array(z.string().min(1)),
  // Optional fields
  concurrentQueriesPerDomain: z.number().min(1).optional(),
  maxConcurrentGoroutines: z.number().min(1).optional(),
  queryDelayMaxMs: z.number().min(0).optional(),
  queryDelayMinMs: z.number().min(0).optional(),
  rateLimitBurst: z.number().min(0).optional(),
  rateLimitDps: z.number().min(0).optional(),
  resolversPreferredOrder: z.array(z.string()).optional(),
  resolversWeighted: z.record(z.string(), z.number()).optional(),
  useSystemResolvers: z.boolean().optional(),
});

export const httpPersonaConfigSchema = z.object({
  // Required fields
  userAgent: z.string().min(1),
  // Optional fields
  allowInsecureTls: z.boolean().optional(),
  allowedStatusCodes: z.array(z.number()).optional(),
  cookieHandling: z.any().optional(), // Use any to avoid enum mismatch issues
  domSnapshot: z.boolean().optional(),
  fetchBodyForKeywords: z.boolean().optional(),
  followRedirects: z.boolean().optional(),
  headerOrder: z.array(z.string()).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  headlessTimeoutSeconds: z.number().min(0).optional(),
  headlessUserAgent: z.string().optional(),
  http2Settings: z.any().optional(),
  insecureSkipVerify: z.boolean().optional(),
  loadImages: z.boolean().optional(),
  maxRedirects: z.number().min(0).optional(),
  rateLimitBurst: z.number().min(0).optional(),
  rateLimitDps: z.number().min(0).optional(),
  requestTimeoutSec: z.number().min(0).optional(),
  screenshot: z.boolean().optional(),
  scriptExecution: z.boolean().optional(),
  tlsClientHello: z.any().optional(),
  useHeadless: z.boolean().optional(),
  viewportHeight: z.number().min(0).optional(),
  viewportWidth: z.number().min(0).optional(),
  waitDelaySeconds: z.number().min(0).optional(),
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
