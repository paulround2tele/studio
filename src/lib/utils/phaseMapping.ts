/**
 * Phase mapping utilities to handle conversion between backend CampaignPhaseEnum
 * and frontend configuration types
 */

import type { components } from '@/lib/api-client/types';

// Use proper generated types from OpenAPI - SINGLE SOURCE OF TRUTH
export type CampaignPhaseEnum = components['schemas']['api.CampaignSummary']['currentPhase'];
export type CampaignPhaseStatusEnum = components['schemas']['api.CampaignSummary']['phaseStatus'];
export type PhaseConfigureRequest = components['schemas']['api.PhaseConfigureRequest'];
export type DNSValidationConfig = components['schemas']['api.DNSValidationConfig'];
export type HTTPValidationConfig = components['schemas']['api.HTTPValidationConfig'];

// Backend CampaignPhaseEnum values (from models.go)
export type BackendPhaseEnum = 
  | 'setup' 
  | 'generation' 
  | 'dns_validation' 
  | 'http_keyword_validation' 
  | 'analysis';

// Map backend CampaignPhaseEnum to frontend CampaignPhaseEnum for configuration
export function mapPhaseToConfigurationType(backendPhase: string): CampaignPhaseEnum | null {
  switch (backendPhase) {
    case 'dns_validation':
      return 'dns_validation';
    case 'http_keyword_validation':
      return 'http_keyword_validation';
    case 'analysis':
      return 'analysis';
    // These phases don't require user configuration
    case 'setup':
    case 'generation':
      return null;
    default:
      console.warn(`[PhaseMapping] Unknown backend phase: ${backendPhase}`);
      return null;
  }
}

// Check if a phase requires user configuration
export function isConfigurablePhase(backendPhase: string): boolean {
  return mapPhaseToConfigurationType(backendPhase) !== null;
}

// Get display name for any phase
export function getPhaseDisplayName(phase: string): string {
  const displayNames: Record<string, string> = {
    setup: "Setup",
    generation: "Domain Generation", 
    dns_validation: "DNS Validation",
    http_keyword_validation: "HTTP Keyword Validation",
    analysis: "Analysis",
    // Legacy support
    domain_generation: "Domain Generation",
    http_validation: "HTTP Keyword Validation",
  };
  
  return displayNames[phase] || phase;
}

// Determine next phase in the workflow
export function getNextPhase(currentPhase: string): string | null {
  const phaseSequence: Record<string, string | null> = {
    setup: 'generation',
    generation: 'dns_validation',
    dns_validation: 'http_keyword_validation',
    http_keyword_validation: 'analysis',
    analysis: null, // Final phase
  };
  
  return phaseSequence[currentPhase] || null;
}