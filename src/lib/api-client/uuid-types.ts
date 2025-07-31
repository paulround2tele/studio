/**
 * UUID type definitions for API client
 * This file provides type-safe UUID handling for the generated API client
 */

// Branded type for UUID to ensure type safety
export type UUID = string & { readonly __brand: 'UUID' };

// UUID validation regex (same as backend)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Type guard to check if a string is a valid UUID
 */
export function isValidUUID(value: string): value is UUID {
    return UUID_REGEX.test(value);
}

/**
 * Create a UUID from a string (with validation)
 */
export function createUUID(value: string): UUID {
    if (!isValidUUID(value)) {
        throw new Error(`Invalid UUID format: ${value}`);
    }
    return value as UUID;
}

/**
 * Generate a new UUID v4 (requires crypto API)
 */
export function generateUUID(): UUID {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID() as UUID;
    }
    // Fallback for older environments
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    }) as UUID;
}