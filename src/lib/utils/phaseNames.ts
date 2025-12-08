/**
 * Phase name normalization and mapping utilities
 * Single source of truth for translating between:
 * - API phase identifiers (discovery | validation | extraction | analysis | enrichment)
 * - Engine/progress identifiers (domain_generation | dns_validation | http_keyword_validation | analysis | enrichment)
 */

export type ApiPhase = 'discovery' | 'validation' | 'extraction' | 'analysis' | 'enrichment';
export type EnginePhase = 'domain_generation' | 'dns_validation' | 'http_keyword_validation' | 'analysis' | 'enrichment';

const engineToApiMap: Record<EnginePhase, ApiPhase> = {
  domain_generation: 'discovery',
  dns_validation: 'validation',
  http_keyword_validation: 'extraction',
  analysis: 'analysis',
  enrichment: 'enrichment',
};

const apiToEngineMap: Record<ApiPhase, EnginePhase> = {
  discovery: 'domain_generation',
  validation: 'dns_validation',
  extraction: 'http_keyword_validation',
  analysis: 'analysis',
  enrichment: 'enrichment',
};

/** Normalize any known phase alias to the canonical API phase name. */
export function normalizeToApiPhase(phase: string): ApiPhase | null {
  const lower = phase as string;
  if (isApiPhase(lower)) return lower;
  if (isEnginePhase(lower)) return engineToApiMap[lower];
  // Accept a couple historical aliases
  switch (lower) {
    case 'domain_generation':
    case 'generation':
      return 'discovery';
    case 'dns':
    case 'dnsvalidation':
    case 'dns_validation':
      return 'validation';
    case 'http':
    case 'http_validation':
    case 'http_keyword_validation':
      return 'extraction';
    case 'enrichment_phase':
    case 'content_extraction':
      return 'enrichment';
    case 'leads':
    case 'lead_enrichment':
      return 'enrichment';
    default:
      return null;
  }
}

/** Map an API phase identifier to the engine/progress identifier used by SSE. */
export function apiToEnginePhase(api: ApiPhase): EnginePhase {
  return apiToEngineMap[api];
}

/** Map an engine/progress identifier to the API phase identifier. */
export function engineToApiPhase(engine: EnginePhase): ApiPhase {
  return engineToApiMap[engine];
}

export function isApiPhase(v: string): v is ApiPhase {
  return v === 'discovery' || v === 'validation' || v === 'extraction' || v === 'analysis' || v === 'enrichment';
}

export function isEnginePhase(v: string): v is EnginePhase {
  return v === 'domain_generation' || v === 'dns_validation' || v === 'http_keyword_validation' || v === 'analysis' || v === 'enrichment';
}

/** Ordered workflow in engine/progress terms. */
export const ENGINE_PHASE_ORDER: EnginePhase[] = [
  'domain_generation',
  'dns_validation',
  'http_keyword_validation',
  'analysis',
  'enrichment',
];

/** Ordered workflow in API terms. */
export const API_PHASE_ORDER: ApiPhase[] = [
  'discovery',
  'validation',
  'extraction',
  'analysis',
  'enrichment',
];
