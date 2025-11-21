/**
 * Phase mapping utilities to handle conversion between backend CampaignPhaseEnum
 * and frontend configuration types
 */

export type CampaignPhaseStatusEnum = 'not_started' | 'in_progress' | 'completed' | 'failed' | 'paused';
export type PhaseConfigureRequest = import('@/lib/api-client/models/phase-configuration-request').PhaseConfigurationRequest;

// API phase names (what the frontend uses)
export type APIPhaseEnum = 
  | 'discovery'     // maps to domain_generation internally
  | 'validation'    // maps to dns_validation internally  
  | 'extraction'    // maps to http_keyword_validation internally
  | 'enrichment'    // maps to enrichment internally
  | 'analysis';     // maps to analysis internally

// Internal backend phase names (what gets persisted)
export type InternalPhaseEnum = 
  | 'domain_generation'
  | 'dns_validation' 
  | 'http_keyword_validation'
  | 'enrichment'
  | 'analysis';

// Phase mapping constants (matching backend internal/phases/translate.go)
const API_TO_INTERNAL: Record<APIPhaseEnum, InternalPhaseEnum> = {
  'discovery': 'domain_generation',
  'validation': 'dns_validation', 
  'extraction': 'http_keyword_validation',
  'enrichment': 'enrichment',
  'analysis': 'analysis'
};

const INTERNAL_TO_API: Record<InternalPhaseEnum, APIPhaseEnum> = {
  'domain_generation': 'discovery',
  'dns_validation': 'validation',
  'http_keyword_validation': 'extraction', 
  'enrichment': 'enrichment',
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
    extraction: "HTTP Keyword Validation",
    analysis: "Analysis & Scoring",
    enrichment: "Lead Enrichment",
  };
  
  return displayNames[phase] || phase;
}

// Get the ordered sequence of API phases
export function getPhaseSequence(): APIPhaseEnum[] {
  return ['discovery', 'validation', 'extraction', 'analysis', 'enrichment'];
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
  prefixVariableLength?: number;
  suffixVariableLength?: number;
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

type KeywordTargetingInput = {
  keywords?: string[];
  includeKeywords?: string[];
  adHocKeywords?: string[];
};

const DEFAULT_DNS_BATCH_SIZE = 100;
const DEFAULT_DNS_TIMEOUT_SECONDS = 30;
const DEFAULT_DNS_MAX_RETRIES = 2;
const DEFAULT_DNS_VALIDATION_TYPES = ['A', 'AAAA'];

const DEFAULT_HTTP_MICRO_PAGES = 5;
const DEFAULT_HTTP_MICRO_BUDGET = 1024 * 1024; // 1 MB

function sanitizeKeywordList(list?: string[]): string[] {
  if (!Array.isArray(list)) {
    return [];
  }

  return list
    .map((keyword) => (typeof keyword === 'string' ? keyword.trim() : ''))
    .filter((keyword): keyword is string => keyword.length > 0);
}

function collectWizardKeywords(targeting: KeywordTargetingInput): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();

  const pushList = (list?: string[]) => {
    for (const keyword of sanitizeKeywordList(list)) {
      if (!seen.has(keyword)) {
        seen.add(keyword);
        ordered.push(keyword);
      }
    }
  };

  pushList(targeting.keywords);
  pushList(targeting.includeKeywords);
  pushList(targeting.adHocKeywords);

  return ordered;
}

// Map wizard pattern step to domain generation configuration
export function mapPatternToDomainGeneration(pattern: {
  basePattern?: string;
  constantString?: string;
  patternType?: 'prefix' | 'suffix' | 'both' | 'prefix_variable' | 'suffix_variable' | 'both_variable';
  prefixVariableLength?: number;
  suffixVariableLength?: number;
  maxDomains?: number;
  tld?: string;
  tlds?: string[];
  variableLength?: number; // legacy fallback
  characterSet?: string;
  batchSize?: number;
  offsetStart?: number;
}): DomainGenerationConfig {
  const rawPatternType = pattern.patternType || 'prefix';
  const wizardPatternType = (() => {
    switch (rawPatternType) {
      case 'prefix_variable':
        return 'prefix';
      case 'suffix_variable':
        return 'suffix';
      case 'both_variable':
        return 'both';
      default:
        return rawPatternType;
    }
  })() as 'prefix' | 'suffix' | 'both';
  const apiPatternType = (() => {
    switch (wizardPatternType) {
      case 'suffix':
        return 'suffix_variable';
      case 'both':
        return 'both_variable';
      case 'prefix':
      default:
        return 'prefix_variable';
    }
  })();

  const legacyCombined = Math.max(0, pattern.variableLength || 0);
  const DEFAULT_SINGLE_SIDE_LENGTH = 6;
  const DEFAULT_SPLIT_LENGTH = 3;

  const inferredPrefix = (() => {
    if (typeof pattern.prefixVariableLength === 'number' && pattern.prefixVariableLength > 0) {
      return pattern.prefixVariableLength;
    }
    if (wizardPatternType === 'prefix') {
      if (legacyCombined > 0) return legacyCombined;
      return DEFAULT_SINGLE_SIDE_LENGTH;
    }
    if (wizardPatternType === 'both') {
      if (legacyCombined > 0) {
        return Math.max(1, Math.floor(legacyCombined / 2));
      }
      return DEFAULT_SPLIT_LENGTH;
    }
    return 0;
  })();
  const inferredSuffix = (() => {
    if (typeof pattern.suffixVariableLength === 'number' && pattern.suffixVariableLength > 0) {
      return pattern.suffixVariableLength;
    }
    if (wizardPatternType === 'suffix') {
      if (legacyCombined > 0) return legacyCombined;
      return DEFAULT_SINGLE_SIDE_LENGTH;
    }
    if (wizardPatternType === 'both') {
      if (legacyCombined > 0) {
        const remaining = legacyCombined - inferredPrefix;
        return Math.max(1, remaining > 0 ? remaining : Math.ceil(legacyCombined / 2));
      }
      return DEFAULT_SPLIT_LENGTH;
    }
    return 0;
  })();
  const computedVariable = (() => {
    switch (wizardPatternType) {
      case 'prefix':
        return inferredPrefix;
      case 'suffix':
        return inferredSuffix;
      case 'both':
        return inferredPrefix + inferredSuffix;
      default:
        return legacyCombined;
    }
  })();
  const firstTld = (pattern.tlds && pattern.tlds[0]) || pattern.tld || '.com';
  const normalizedTld = firstTld.startsWith('.') ? firstTld : `.${firstTld}`;
  const safeNumDomains = Math.max(1, pattern.maxDomains || 100);
  const safeBatchSize = Math.max(1, pattern.batchSize || Math.min(100, safeNumDomains));
  const safeOffset = Math.max(0, pattern.offsetStart || 0);
  return {
    patternType: apiPatternType,
    constantString: pattern.constantString || (pattern.basePattern ? pattern.basePattern.replace('{variation}', '') : 'brand'),
    variableLength: Math.max(0, computedVariable || 0),
    prefixVariableLength: wizardPatternType === 'prefix' || wizardPatternType === 'both' ? inferredPrefix : 0,
    suffixVariableLength: wizardPatternType === 'suffix' || wizardPatternType === 'both' ? inferredSuffix : 0,
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

// Map wizard targeting step to HTTP keyword validation configuration
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
  const keywords = collectWizardKeywords(targeting);
  const adHocKeywords = sanitizeKeywordList(targeting.adHocKeywords);
  const enrichmentEnabled = targeting.httpEnrichmentEnabled ?? true;
  const microEnabled = targeting.httpMicroCrawlEnabled ?? true;
  const microPages = Math.max(1, targeting.httpMicroCrawlMaxPages ?? DEFAULT_HTTP_MICRO_PAGES);
  const microBudget = Math.max(1024, targeting.httpMicroCrawlByteBudget ?? DEFAULT_HTTP_MICRO_BUDGET);
  return {
    personaIds: targeting.httpPersonas || [],
    keywords,
    adHocKeywords,
    name: 'HTTP Keyword Validation Phase',
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
  adHocKeywords?: string[];
}): AnalysisConfig | null {
  const personaIds = targeting.analysisPersonas && targeting.analysisPersonas.length > 0
    ? targeting.analysisPersonas
    : (targeting.httpPersonas || []);

  if (personaIds.length === 0) {
    return null;
  }

  const baseKeywords = collectWizardKeywords(targeting);

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