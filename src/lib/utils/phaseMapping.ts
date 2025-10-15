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
  batchSize: number;
  timeout: number;
  maxRetries: number;
  validation_types?: string[];
  required_records?: string[];
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

export interface AnalysisConfig {
  personaIds: string[];
  keywordRules?: Array<{ pattern: string; ruleType: string }>;
  includeExternal?: boolean;
  name?: string;
}

const DEFAULT_DNS_BATCH_SIZE = 250;
const DEFAULT_DNS_TIMEOUT_SECONDS = 30;
const DEFAULT_DNS_MAX_RETRIES = 2;
const DEFAULT_DNS_VALIDATION_TYPES = ['A', 'AAAA'];

const DEFAULT_HTTP_MICRO_PAGES = 5;
const DEFAULT_HTTP_MICRO_BUDGET = 1024 * 1024; // 1 MB

// Map wizard pattern step to domain generation configuration
export function mapPatternToDomainGeneration(pattern: {
  basePattern?: string;
  constantString?: string;
  patternType?: 'prefix' | 'suffix' | 'both';
  prefixLength?: number;
  suffixLength?: number;
  maxDomains?: number;
  tld?: string;
  tlds?: string[];
  variableLength?: number; // legacy fallback
  characterSet?: string;
  batchSize?: number;
  offsetStart?: number;
}): DomainGenerationConfig {
  const patternType = pattern.patternType || 'prefix';
  // If user provided explicit prefix/suffix lengths compute; else fallback to variableLength
  let computedVariable = pattern.variableLength || 0;
  if (patternType === 'prefix' && typeof pattern.prefixLength === 'number') {
    computedVariable = pattern.prefixLength;
  } else if (patternType === 'suffix' && typeof pattern.suffixLength === 'number') {
    computedVariable = pattern.suffixLength;
  } else if (patternType === 'both') {
    computedVariable = (pattern.prefixLength || 0) + (pattern.suffixLength || 0);
  }
  const firstTld = (pattern.tlds && pattern.tlds[0]) || pattern.tld || '.com';
  const normalizedTld = firstTld.startsWith('.') ? firstTld : `.${firstTld}`;
  const safeNumDomains = Math.max(1, pattern.maxDomains || 100);
  const safeBatchSize = Math.max(1, pattern.batchSize || Math.min(100, safeNumDomains));
  const safeOffset = Math.max(0, pattern.offsetStart || 0);
  return {
    patternType,
    constantString: pattern.constantString || (pattern.basePattern ? pattern.basePattern.replace('{variation}', '') : 'brand'),
    variableLength: Math.max(0, computedVariable || 0),
    characterSet: pattern.characterSet || 'abcdefghijklmnopqrstuvwxyz0123456789',
    tld: normalizedTld,
    numDomainsToGenerate: safeNumDomains,
    batchSize: safeBatchSize,
    offsetStart: safeOffset
  };
}

// Map wizard targeting step to DNS validation configuration  
export function mapTargetingToDNSValidation(targeting: {
  dnsPersonas?: string[];
  dnsBatchSize?: number;
  dnsTimeout?: number;
  dnsMaxRetries?: number;
  validationTypes?: string[];
  requiredRecords?: string[];
}): DNSValidationConfig {
  const personaIds = targeting.dnsPersonas || [];
  const batchSize = Math.max(1, targeting.dnsBatchSize ?? DEFAULT_DNS_BATCH_SIZE);
  const timeoutSeconds = Math.max(1, targeting.dnsTimeout ?? DEFAULT_DNS_TIMEOUT_SECONDS);
  const maxRetries = Math.max(0, targeting.dnsMaxRetries ?? DEFAULT_DNS_MAX_RETRIES);
  return {
    personaIds,
    batchSize,
    timeout: timeoutSeconds,
    maxRetries,
    validation_types: targeting.validationTypes && targeting.validationTypes.length > 0 ? targeting.validationTypes : [...DEFAULT_DNS_VALIDATION_TYPES],
    required_records: targeting.requiredRecords && targeting.requiredRecords.length > 0 ? targeting.requiredRecords : undefined,
    name: 'DNS Validation Phase'
  };
}

// Map wizard targeting step to HTTP validation configuration
export function mapTargetingToHTTPValidation(targeting: {
  keywords?: string[];
  includeKeywords?: string[];
  httpPersonas?: string[];
  adHocKeywords?: string[];
  httpEnrichmentEnabled?: boolean;
  httpMicroCrawlEnabled?: boolean;
  httpMicroCrawlMaxPages?: number;
  httpMicroCrawlByteBudget?: number;
}): HTTPValidationConfig {
  const keywords = targeting.keywords && targeting.keywords.length > 0
    ? targeting.keywords
    : (targeting.includeKeywords || []);
  const enrichmentEnabled = targeting.httpEnrichmentEnabled ?? true;
  const microEnabled = targeting.httpMicroCrawlEnabled ?? true;
  const microPages = Math.max(1, targeting.httpMicroCrawlMaxPages ?? DEFAULT_HTTP_MICRO_PAGES);
  const microBudget = Math.max(1024, targeting.httpMicroCrawlByteBudget ?? DEFAULT_HTTP_MICRO_BUDGET);
  return {
    personaIds: targeting.httpPersonas || [],
    keywords,
    adHocKeywords: targeting.adHocKeywords || [],
    name: 'HTTP Keyword Extraction Phase',
    enrichmentEnabled,
    microCrawlEnabled: microEnabled,
    microCrawlMaxPages: microPages,
    microCrawlByteBudget: microBudget
  };
}

// Map wizard targeting step to analysis configuration
export function mapTargetingToAnalysis(targeting: {
  analysisPersonas?: string[];
  httpPersonas?: string[];
  includeKeywords?: string[];
  keywords?: string[];
}): AnalysisConfig | null {
  const personaIds = targeting.analysisPersonas && targeting.analysisPersonas.length > 0
    ? targeting.analysisPersonas
    : (targeting.httpPersonas || []);

  if (personaIds.length === 0) {
    return null;
  }

  const baseKeywords = targeting.keywords && targeting.keywords.length > 0
    ? targeting.keywords
    : (targeting.includeKeywords || []);

  const keywordRules = baseKeywords.length === 0
    ? undefined
    : baseKeywords.map(pattern => ({
        pattern,
        ruleType: 'string',
      }));

  return {
    personaIds,
    keywordRules,
    includeExternal: false,
    name: 'Analysis Phase',
  };
}