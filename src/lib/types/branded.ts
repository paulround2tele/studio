/**
 * Branded types for type-safe handling of specific data types
 * This file provides strongly-typed wrappers for common data types
 */

// Re-export UUID from api-client
export type { UUID } from '../api-client/uuid-types';
export { isValidUUID, createUUID, generateUUID } from '../api-client/uuid-types';

// Other branded types for type safety
export type SafeBigInt = bigint & { readonly __brand: 'SafeBigInt' };
export type ISODateString = string & { readonly __brand: 'ISODateString' };
export type Email = string & { readonly __brand: 'Email' };

/**
 * Create a SafeBigInt from a string, number, or bigint
 */
export function createSafeBigInt(value: string | number | bigint): SafeBigInt {
    return BigInt(value) as SafeBigInt;
}

/**
 * Create an ISODateString with validation
 */
export function createISODateString(value: string): ISODateString {
    // Validate ISO date format
    if (!value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/)) {
        throw new Error(`Invalid ISO date format: ${value}`);
    }
    return value as ISODateString;
}

/**
 * Create an Email with basic validation
 */
export function createEmail(value: string): Email {
    // Basic email validation
    if (!value.includes('@') || !value.includes('.')) {
        throw new Error(`Invalid email format: ${value}`);
    }
    return value as Email;
}

/**
 * Transform int64 fields in an object to SafeBigInt
 */
export function transformInt64Fields(
    obj: Record<string, unknown>,
    int64Fields: string[]
): Record<string, unknown> {
    const result = { ...obj };
    
    for (const field of int64Fields) {
        if (result[field] !== undefined && result[field] !== null) {
            const value = result[field];
            if (typeof value === 'string' || typeof value === 'number') {
                result[field] = createSafeBigInt(value);
            }
        }
    }
    
    return result;
}

/**
 * Prepare data for serialization (convert SafeBigInt to string)
 */
export function prepareForSerialization(
    data: Record<string, unknown>,
    int64Fields: readonly string[]
): Record<string, unknown> {
    const result = { ...data };
    
    for (const field of int64Fields) {
        if (result[field] !== undefined && result[field] !== null) {
            const value = result[field];
            if (typeof value === 'bigint') {
                result[field] = value.toString();
            }
        }
    }
    
    return result;
}