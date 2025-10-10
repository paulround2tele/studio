/**
 * Phase mapping utilities to handle conversion between backend CampaignPhaseEnum
 * and frontend configuration types
 */

// Use proper generated types from OpenAPI - SINGLE SOURCE OF TRUTH
import type { CampaignPhaseEnum as APICampaignPhaseEnum } from '@/lib/api-client/models/campaign-phase-enum';
export type CampaignPhaseStatusEnum = 'not_started' | 'in_progress' | 'completed' | 'failed' | 'paused';
export type PhaseConfigureRequest = import('@/lib/api-client/models/phase-configuration-request').PhaseConfigurationRequest;

// API phase names (what the frontend uses)
export type APIPhaseEnum = 
  | 'discovery'     // maps to domain_generation internally
  | 'validation'    // maps to dns_validation internally  
  | 'extraction'    // maps to http_keyword_validation internally
  | 'analysis';     // maps to analysis internally

// Internal backend phase names (what gets persisted)
export type InternalPhaseEnum = 
  | 'domain_generation'
  | 'dns_validation' 
  | 'http_keyword_validation'
  | 'analysis';

// Phase mapping constants (matching backend internal/phases/translate.go)
const API_TO_INTERNAL: Record<APIPhaseEnum, InternalPhaseEnum> = {
  'discovery': 'domain_generation',
  'validation': 'dns_validation', 
  'extraction': 'http_keyword_validation',
  'analysis': 'analysis'
};

const INTERNAL_TO_API: Record<InternalPhaseEnum, APIPhaseEnum> = {
  'domain_generation': 'discovery',
  'dns_validation': 'validation',
  'http_keyword_validation': 'extraction', 
  'analysis': 'analysis'
};

// Convert API phase name to internal phase name
export function apiPhaseToInternal(apiPhase: APIPhaseEnum): InternalPhaseEnum {
  return API_TO_INTERNAL[apiPhase];
}

// Convert internal phase name to API phase name
export function internalPhaseToAPI(internalPhase: InternalPhaseEnum): APIPhaseEnum {
  return INTERNAL_TO_API[internalPhase];
}

// Check if a phase requires user configuration
export function isConfigurablePhase(apiPhase: APIPhaseEnum): boolean {
  // Discovery (domain_generation) uses wizard pattern config, all others need configuration
  return apiPhase !== 'discovery';
}

// Get display name for any phase
export function getPhaseDisplayName(phase: APIPhaseEnum): string {
  const displayNames: Record<APIPhaseEnum, string> = {
    discovery: "Domain Discovery", 
    validation: "DNS Validation",
    extraction: "HTTP Keyword Extraction",
    analysis: "Analysis & Scoring",
  };
  
  return displayNames[phase] || phase;
}

// Get the ordered sequence of API phases
export function getPhaseSequence(): APIPhaseEnum[] {
  return ['discovery', 'validation', 'extraction', 'analysis'];
}

// Determine next phase in the workflow
export function getNextPhase(currentPhase: APIPhaseEnum): APIPhaseEnum | null {
  const phases = getPhaseSequence();
  const currentIndex = phases.indexOf(currentPhase);
  if (currentIndex >= 0 && currentIndex < phases.length - 1) {
    const nextPhase = phases[currentIndex + 1];
    return nextPhase || null;
  }
  return null; // No next phase or invalid phase
}

// Get first phase in the sequence
export function getFirstPhase(): APIPhaseEnum {
  return 'discovery';
}

// Configuration mapping types for wizard steps
export interface DomainGenerationConfig {
  patternType: string;
  constantString?: string;
  variableLength?: number;
  characterSet?: string;
  tld: string;
  numDomainsToGenerate: number;
  batchSize?: number;
  offsetStart?: number;
}

export interface DNSValidationConfig {
  personaIds: string[];
  name?: string;
}

export interface HTTPValidationConfig {
  personaIds: string[];
  keywords?: string[];
  adHocKeywords?: string[];
  name?: string;
  enrichmentEnabled?: boolean;
  microCrawlEnabled?: boolean;
  microCrawlMaxPages?: number;
  microCrawlByteBudget?: number;
}

// Map wizard pattern step to domain generation configuration
export function mapPatternToDomainGeneration(pattern: {
  basePattern?: string;
  maxDomains?: number;
  tld?: string;
  variableLength?: number;
  characterSet?: string;
}): DomainGenerationConfig {
  return {
    patternType: 'prefix', // Valid pattern types: prefix, suffix, both
    constantString: pattern.basePattern || 'test',
    variableLength: pattern.variableLength || 6,
    characterSet: pattern.characterSet || 'alphanumeric',
    tld: pattern.tld?.startsWith('.') ? pattern.tld : `.${pattern.tld || 'com'}`,
    numDomainsToGenerate: pattern.maxDomains || 100,
    batchSize: 1000,
    offsetStart: 0
  };
}

// Map wizard targeting step to DNS validation configuration  
export function mapTargetingToDNSValidation(targeting: {
  keywords?: string[];
  dnsPersonas?: string[];
}): DNSValidationConfig {
  return {
    personaIds: targeting.dnsPersonas || [],
    name: 'DNS Validation Phase'
  };
}

// Map wizard targeting step to HTTP validation configuration
export function mapTargetingToHTTPValidation(targeting: {
  keywords?: string[];
  httpPersonas?: string[];
}): HTTPValidationConfig {
  return {
    personaIds: targeting.httpPersonas || [],
    keywords: targeting.keywords || [],
    adHocKeywords: [],
    name: 'HTTP Keyword Extraction Phase',
    enrichmentEnabled: true,
    microCrawlEnabled: true,
    microCrawlMaxPages: 5,
    microCrawlByteBudget: 1024 * 1024 // 1MB
  };
}