/**
 * Centralized UUID Validation Utility
 * 
 * Addresses the critical UUID validation gaps identified in the API audit:
 * - Frontend can send invalid UUIDs to backend APIs causing 400 errors
 * - No client-side validation before API calls 
 * - No user feedback for UUID validation failures
 * 
 * This utility provides comprehensive UUID validation with user-friendly error messages
 * and integrates with the existing toast notification system.
 */

import { toast } from "@/hooks/use-toast";

// Strict UUID v4 validation regex (matches backend expectations)
// Backend enforces: validate:"dive,uuid" which expects RFC 4122 UUID v4 format
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validation result interface for consistent error handling
 */
export interface UuidValidationResult {
  isValid: boolean;
  error?: string;
  invalidUuids?: string[];
}

/**
 * Validation options for customizing behavior
 */
export interface UuidValidationOptions {
  fieldName?: string;
  showToast?: boolean;
  allowEmpty?: boolean;
  customErrorMessage?: string;
}

/**
 * Core UUID v4 validation function
 * @param value - String to validate as UUID
 * @returns true if valid UUID v4 format
 */
export function isValidUUID(value: string): boolean {
  return UUID_V4_REGEX.test(value);
}

/**
 * Validates a single UUID with detailed error information
 * @param uuid - UUID string to validate
 * @param options - Validation options
 * @returns Validation result with error details
 */
export function validateUUID(
  uuid: string | null | undefined,
  options: UuidValidationOptions = {}
): UuidValidationResult {
  const {
    fieldName = 'UUID',
    showToast = true,
    allowEmpty = false,
    customErrorMessage
  } = options;

  // Handle null/undefined
  if (!uuid) {
    if (allowEmpty) {
      return { isValid: true };
    }
    const error = customErrorMessage || `${fieldName} is required`;
    if (showToast) {
      toast({
        title: "Validation Error",
        description: error,
        variant: "destructive"
      });
    }
    return { isValid: false, error };
  }

  // Handle non-string values
  if (typeof uuid !== 'string') {
    const error = customErrorMessage || `${fieldName} must be a valid UUID string`;
    if (showToast) {
      toast({
        title: "Validation Error", 
        description: error,
        variant: "destructive"
      });
    }
    return { isValid: false, error };
  }

  // Validate UUID format
  if (!isValidUUID(uuid)) {
    const error = customErrorMessage || 
      `${fieldName} must be a valid UUID format (e.g., 550e8400-e29b-41d4-a716-446655440000)`;
    if (showToast) {
      toast({
        title: "Invalid UUID Format",
        description: error,
        variant: "destructive"
      });
    }
    return { isValid: false, error };
  }

  return { isValid: true };
}

/**
 * Validates an array of UUIDs for bulk operations
 * @param uuids - Array of UUID strings to validate
 * @param options - Validation options with additional bulk-specific settings
 * @returns Validation result with details about invalid UUIDs
 */
export function validateUUIDs(
  uuids: (string | null | undefined)[] | null | undefined,
  options: UuidValidationOptions & {
    maxLength?: number;
    minLength?: number;
    operation?: string;
  } = {}
): UuidValidationResult {
  const {
    fieldName = 'UUID array',
    showToast = true,
    allowEmpty = false,
    maxLength,
    minLength = 1,
    operation = 'bulk operation',
    customErrorMessage
  } = options;

  // Handle null/undefined array
  if (!uuids) {
    if (allowEmpty) {
      return { isValid: true };
    }
    const error = customErrorMessage || `${fieldName} is required for ${operation}`;
    if (showToast) {
      toast({
        title: "Validation Error",
        description: error,
        variant: "destructive"
      });
    }
    return { isValid: false, error };
  }

  // Handle non-array values
  if (!Array.isArray(uuids)) {
    const error = customErrorMessage || `${fieldName} must be an array for ${operation}`;
    if (showToast) {
      toast({
        title: "Validation Error",
        description: error,
        variant: "destructive"
      });
    }
    return { isValid: false, error };
  }

  // Check array length constraints
  if (uuids.length < minLength) {
    const error = customErrorMessage || 
      `${fieldName} must contain at least ${minLength} item${minLength > 1 ? 's' : ''} for ${operation}`;
    if (showToast) {
      toast({
        title: "Validation Error",
        description: error,
        variant: "destructive"
      });
    }
    return { isValid: false, error };
  }

  if (maxLength && uuids.length > maxLength) {
    const error = customErrorMessage || 
      `${fieldName} cannot contain more than ${maxLength} items for ${operation}. Current: ${uuids.length}`;
    if (showToast) {
      toast({
        title: "Too Many Items",
        description: error,
        variant: "destructive"
      });
    }
    return { isValid: false, error };
  }

  // Validate each UUID in the array
  const invalidUuids: string[] = [];
  const emptyUuids: number[] = [];

  uuids.forEach((uuid, index) => {
    if (!uuid) {
      emptyUuids.push(index);
      return;
    }
    
    if (typeof uuid !== 'string' || !isValidUUID(uuid)) {
      invalidUuids.push(uuid?.toString() || `[empty at index ${index}]`);
    }
  });

  // Handle validation failures
  if (emptyUuids.length > 0 && !allowEmpty) {
    const error = customErrorMessage || 
      `${fieldName} contains empty values at positions: ${emptyUuids.join(', ')}`;
    if (showToast) {
      toast({
        title: "Validation Error",
        description: error,
        variant: "destructive"
      });
    }
    return { isValid: false, error, invalidUuids: emptyUuids.map(i => `[empty at index ${i}]`) };
  }

  if (invalidUuids.length > 0) {
    const error = customErrorMessage || 
      `${fieldName} contains ${invalidUuids.length} invalid UUID${invalidUuids.length > 1 ? 's' : ''}. ` +
      `Valid format: 550e8400-e29b-41d4-a716-446655440000`;
    if (showToast) {
      toast({
        title: "Invalid UUID Format",
        description: error,
        variant: "destructive"
      });
    }
    return { isValid: false, error, invalidUuids };
  }

  return { isValid: true };
}

/**
 * Validates campaign ID arrays for bulk enriched data requests
 * Enforces backend limit: max=1000 campaigns
 */
export function validateBulkEnrichedDataRequest(campaignIds: string[]): UuidValidationResult {
  return validateUUIDs(campaignIds, {
    fieldName: 'Campaign IDs',
    maxLength: 1000,
    minLength: 1,
    operation: 'bulk enriched data request',
    showToast: true
  });
}

/**
 * Validates campaign ID arrays for bulk logs/leads requests  
 * Enforces backend limit: max=50 campaigns
 */
export function validateBulkLogsLeadsRequest(campaignIds: string[], operation: 'logs' | 'leads'): UuidValidationResult {
  return validateUUIDs(campaignIds, {
    fieldName: 'Campaign IDs',
    maxLength: 50,
    minLength: 1,
    operation: `bulk ${operation} request`,
    showToast: true
  });
}

/**
 * Validates persona ID arrays for phase configuration
 * Enforces backend requirement: min=1 persona required
 */
export function validatePersonaIds(personaIds: string[], phaseType: string): UuidValidationResult {
  return validateUUIDs(personaIds, {
    fieldName: 'Persona IDs',
    minLength: 1,
    operation: `${phaseType} phase configuration`,
    showToast: true
  });
}

/**
 * Validates campaign ID for phase operations
 */
export function validateCampaignId(campaignId: string | null | undefined): UuidValidationResult {
  return validateUUID(campaignId, {
    fieldName: 'Campaign ID',
    allowEmpty: false,
    showToast: true
  });
}

/**
 * Pre-validates API request before sending to prevent 400 errors
 * Returns true if validation passes, false if it fails (with toast notification)
 */
export function validateBeforeApiCall<T extends Record<string, any>>(
  payload: T,
  validationRules: Array<{
    field: keyof T;
    type: 'uuid' | 'uuid-array';
    options?: UuidValidationOptions & { maxLength?: number; minLength?: number; };
  }>
): boolean {
  for (const rule of validationRules) {
    const value = payload[rule.field];
    
    if (rule.type === 'uuid') {
      const result = validateUUID(value as string, {
        fieldName: String(rule.field),
        ...rule.options
      });
      if (!result.isValid) {
        return false;
      }
    } else if (rule.type === 'uuid-array') {
      const result = validateUUIDs(value as string[], {
        fieldName: String(rule.field),
        ...rule.options
      });
      if (!result.isValid) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Type guard for checking if a string is a valid UUID
 * Can be used in TypeScript type narrowing
 */
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && isValidUUID(value);
}

/**
 * Sanitizes and validates UUID input from user forms
 * Trims whitespace and converts to lowercase for consistent format
 */
export function sanitizeAndValidateUUID(input: string | null | undefined): {
  sanitized: string | null;
  isValid: boolean;
  error?: string;
} {
  if (!input) {
    return { sanitized: null, isValid: false, error: 'UUID is required' };
  }

  // Sanitize input
  const sanitized = input.trim().toLowerCase();
  
  if (!isValidUUID(sanitized)) {
    return {
      sanitized,
      isValid: false,
      error: 'Invalid UUID format. Expected format: 550e8400-e29b-41d4-a716-446655440000'
    };
  }

  return { sanitized, isValid: true };
}