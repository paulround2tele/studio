/**
 * PHASE-CENTRIC CAMPAIGN FORM TYPES
 * 
 * These types are designed for the new phase-centric architecture where:
 * 1. Campaigns are created with basic info only (Option A)
 * 2. Individual phases are configured later via the Campaign Dashboard
 * 3. Uses ONLY auto-generated API types from OpenAPI spec
 */
// Use the RTK wrapper's exported alias to match mutation input type exactly
import type { ServicesCreateLeadGenerationCampaignRequest as CreateLeadGenerationCampaignRequest } from '@/lib/api-client';
// No discovery config on create for Option A

/**
 * Form values interface for phase-centric campaign creation
 * Maps directly to CreateLeadGenerationCampaignRequest structure
 */
export interface SimpleCampaignFormValues {
  // Basic campaign info
  name: string;
  description?: string;
}

/**
 * Helper function to convert form values to API request
 */
export function formToApiRequest(formValues: SimpleCampaignFormValues): CreateLeadGenerationCampaignRequest {
  const payload: CreateLeadGenerationCampaignRequest = {
    name: formValues.name,
    description: formValues.description,
  // targetDomains removed from backend schema (historical placeholder)
  // No initial phase configuration; phases configured on dashboard
  };
  return payload;
}

/**
 * Default form values for new campaign creation
 */
export const defaultFormValues: SimpleCampaignFormValues = {
  name: "",
  description: "",
};

// Option A: minimal create payload; discovery configured later