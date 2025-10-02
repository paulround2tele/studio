// Phase 2: Form value interfaces for eliminating any/unsafe casts in form components
// Based on generated API client request types

import type {
  CreateCampaignRequestConfigurationPhasesDiscovery,
  CreateCampaignRequestConfigurationPhasesValidation,
  CreateCampaignRequestConfigurationPhasesAnalysis,
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
export interface AnalysisConfigFormValues extends CreateCampaignRequestConfigurationPhasesAnalysis {
  // All properties inherited from generated type
  enabled: boolean; // Make required for form validation
  generateReports: boolean; // Make required for form validation
  // Additional analysis-specific form fields
  keywordExtraction?: boolean;
  contentAnalysis?: boolean;
  technicalAnalysis?: boolean;
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
  CreateCampaignRequestConfigurationPhasesAnalysis,
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