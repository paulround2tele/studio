/**
 * PHASE-CENTRIC CAMPAIGN FORM TYPES
 * 
 * These types are designed for the new phase-centric architecture where:
 * 1. Campaigns are created with basic info + domain generation config only
 * 2. Individual phases are configured later via PhaseDashboard
 * 3. Uses ONLY auto-generated API types from OpenAPI spec
 */
import type { CreateLeadGenerationCampaignRequest } from '@/lib/api-client/models/create-lead-generation-campaign-request';
import type { DomainGenerationConfig, DomainGenerationConfigPatternTypeEnum } from '@/lib/api-client/models/domain-generation-config';

/**
 * Form values interface for phase-centric campaign creation
 * Maps directly to CreateLeadGenerationCampaignRequest structure
 */
export interface SimpleCampaignFormValues {
  // Basic campaign info
  name: string;
  description?: string;
  
  // Domain generation config (flattened for form convenience)
  patternType: DomainGenerationConfigPatternTypeEnum;
  constantString: string;
  characterSet: string;
  variableLength: number;
  tlds: string[]; // Will be converted from comma-separated string in UI
  numDomainsToGenerate?: number;
  
  // UI helper fields
  tldsInput: string; // Comma-separated string for UI input
}

/**
 * Helper function to convert form values to API request
 */
export function formToApiRequest(formValues: SimpleCampaignFormValues): CreateLeadGenerationCampaignRequest {
  const domainConfig: DomainGenerationConfig = {
    patternType: formValues.patternType,
    constantString: formValues.constantString,
    characterSet: formValues.characterSet,
    variableLength: formValues.variableLength,
    tlds: formValues.tlds,
    numDomainsToGenerate: formValues.numDomainsToGenerate,
  };

  return {
    name: formValues.name,
    description: formValues.description,
    domainConfig,
  };
}

/**
 * Default form values for new campaign creation
 */
export const defaultFormValues: SimpleCampaignFormValues = {
  name: "",
  description: "",
  patternType: "prefix",
  constantString: "",
  characterSet: "abcdefghijklmnopqrstuvwxyz0123456789",
  variableLength: 3,
  tlds: ["com"],
  numDomainsToGenerate: 1000,
  tldsInput: "com",
};

// Re-export the enum for convenience
export { DomainGenerationConfigPatternTypeEnum };