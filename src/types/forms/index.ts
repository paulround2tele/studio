// Phase 2: Form value interfaces for eliminating any/unsafe casts in form components
// Based on generated API client request types

import type {
  CreateCampaignRequestConfigurationPhasesDiscovery,
  CreateCampaignRequestConfigurationPhasesValidation,
  CreateCampaignRequestConfigurationPhasesExtraction
} from '@/lib/api-client/models';

/**
 * Discovery phase configuration form values
 * Maps to CreateCampaignRequestConfigurationPhasesDiscovery
 */
export interface DiscoveryConfigFormValues extends CreateCampaignRequestConfigurationPhasesDiscovery {
  // All properties inherited from generated type
  // Additional form-specific properties can be added here
  enabled: boolean; // Make required for form validation
}

/**
 * DNS Validation configuration form values
 * For DNS-specific validation settings
 */
export interface DNSValidationConfigFormValues {
  enabled: boolean;
  timeout?: number;
  retries?: number;
  resolvers?: string[];
  recordTypes?: string[];
}

/**
 * HTTP Validation configuration form values  
 * For HTTP-specific validation settings
 */
export interface HTTPValidationConfigFormValues {
  enabled: boolean;
  timeout?: number;
  followRedirects?: boolean;
  maxRedirects?: number;
  userAgent?: string;
  checkHttps?: boolean;
  validateCertificates?: boolean;
}

/**
 * Analysis phase configuration form values
 * Maps to CreateCampaignRequestConfigurationPhasesAnalysis
 */
export type AnalysisKeywordRuleFormValue = {
  id: string;
  pattern: string;
  ruleType: 'string' | 'regex';
  contextChars: number;
};

export interface AnalysisConfigFormValues {
  name: string;
  personaIds: string[];
  analysisTypes: string[];
  includeExternal: boolean;
  enableSuggestions: boolean;
  generateReports: boolean;
  keywordRules: AnalysisKeywordRuleFormValue[];
}

export interface EnrichmentConfigFormValues {
  matchScoreThreshold: number;
  lowScoreGraceThreshold: number;
  minContentBytes: number;
  parkedConfidenceFloor: number;
  requireStructuralSignals: boolean;
}

/**
 * Lead extraction configuration form values
 * Maps to CreateCampaignRequestConfigurationPhasesExtraction if it exists
 */
export interface ExtractionConfigFormValues {
  enabled: boolean;
  extractContacts?: boolean;
  extractEmails?: boolean;
  extractPhones?: boolean;
  extractSocial?: boolean;
  maxContacts?: number;
}

/**
 * Generic form field value type
 * For consistent form handling across components
 */
export type FormFieldValue = string | number | boolean | string[] | undefined;

/**
 * Form validation error structure
 * For consistent error handling in forms
 */
export interface FormFieldError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Form submission state
 * For tracking form submission lifecycle
 */
export interface FormSubmissionState {
  isSubmitting: boolean;
  isValid: boolean;
  errors: FormFieldError[];
  touchedFields: Set<string>;
}

// Re-export generated types for convenience
export type {
  CreateCampaignRequestConfigurationPhasesDiscovery,
  CreateCampaignRequestConfigurationPhasesValidation,
  CreateCampaignRequestConfigurationPhasesExtraction
};

// Utility type guards
export const isValidFormFieldValue = (value: unknown): value is FormFieldValue => {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    Array.isArray(value) ||
    value === undefined
  );
};

export const hasFormErrors = (state: FormSubmissionState): boolean => {
  return state.errors.length > 0;
};

export const getFieldError = (state: FormSubmissionState, fieldName: string): FormFieldError | undefined => {
  return state.errors.find(error => error.field === fieldName);
};