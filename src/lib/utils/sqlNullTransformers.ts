/**
 * DEPRECATED: SQL Null Wrapper Transformation Utilities
 *
 * The backend should handle SQL serialization properly.
 * Frontend should not need to know about SQL null wrappers.
 * These utilities are kept for backwards compatibility only.
 *
 * @deprecated Use proper backend serialization instead
 */

// DEPRECATED: Backend should handle SQL null serialization
interface SqlNullInt32 {
  int32?: number;
  valid?: boolean;
}

interface SqlNullString {
  string?: string;
  valid?: boolean;
}

interface SqlNullTime {
  time?: string;
  valid?: boolean;
}

interface SqlNullBool {
  bool?: boolean;
  valid?: boolean;
}

interface SqlNullFloat64 {
  float64?: number;
  valid?: boolean;
}

/**
 * Transform SqlNullInt32 to a simple number or undefined
 * @param value - SqlNullInt32 wrapper object, direct number, or undefined
 * @returns number if valid and present, undefined otherwise
 */
export function transformSqlNullInt32(value: SqlNullInt32 | number | undefined | null): number | undefined {
  if (!value && value !== 0) {
    return undefined;
  }
  
  // If we get a direct number (API inconsistency), return it
  if (typeof value === 'number') {
    return value;
  }
  
  // Type guard to ensure we have a valid SqlNullInt32 object
  if (typeof value === 'object' && value !== null) {
    // If valid is explicitly false, return undefined
    if (value.valid === false) {
      return undefined;
    }
    
    // If we have an int32 value and it's valid, return it
    if (typeof value.int32 === 'number' && (value.valid === true || value.valid === undefined)) {
      return value.int32;
    }
  }
  
  return undefined;
}

/**
 * Transform SqlNullString to a simple string or undefined
 * @param value - SqlNullString wrapper object, direct string, or undefined
 * @returns string if valid and present, undefined otherwise
 */
export function transformSqlNullString(value: SqlNullString | string | undefined | null): string | undefined {
  if (!value) {
    return undefined;
  }
  
  // If we get a direct string (API inconsistency), return it
  if (typeof value === 'string') {
    return value;
  }
  
  // Type guard to ensure we have a valid SqlNullString object
  if (typeof value === 'object' && value !== null) {
    // If valid is explicitly false, return undefined
    if (value.valid === false) {
      return undefined;
    }
    
    // If we have a string value and it's valid, return it
    if (typeof value.string === 'string' && (value.valid === true || value.valid === undefined)) {
      return value.string;
    }
  }
  
  return undefined;
}

/**
 * Transform SqlNullTime to a simple string or undefined
 * @param value - SqlNullTime wrapper object, direct string, or undefined
 * @returns string if valid and present, undefined otherwise
 */
export function transformSqlNullTime(value: SqlNullTime | string | undefined | null): string | undefined {
  if (!value) {
    return undefined;
  }
  
  // If we get a direct string (API inconsistency), return it
  if (typeof value === 'string') {
    return value;
  }
  
  // Type guard to ensure we have a valid SqlNullTime object
  if (typeof value === 'object' && value !== null) {
    // If valid is explicitly false, return undefined
    if (value.valid === false) {
      return undefined;
    }
    
    // If we have a time value and it's valid, return it
    if (typeof value.time === 'string' && (value.valid === true || value.valid === undefined)) {
      return value.time;
    }
  }
  
  return undefined;
}

/**
 * Transform SqlNullBool to a simple boolean or undefined
 * @param value - SqlNullBool wrapper object, direct boolean, or undefined
 * @returns boolean if valid and present, undefined otherwise
 */
export function transformSqlNullBool(value: SqlNullBool | boolean | undefined | null): boolean | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  
  // If we get a direct boolean (API inconsistency), return it
  if (typeof value === 'boolean') {
    return value;
  }
  
  // Type guard to ensure we have a valid SqlNullBool object
  if (typeof value === 'object' && value !== null) {
    // If valid is explicitly false, return undefined
    if (value.valid === false) {
      return undefined;
    }
    
    // If we have a bool value and it's valid, return it
    if (typeof value.bool === 'boolean' && (value.valid === true || value.valid === undefined)) {
      return value.bool;
    }
  }
  
  return undefined;
}

/**
 * Transform SqlNullFloat64 to a simple number or undefined
 * @param value - SqlNullFloat64 wrapper object, direct number, or undefined
 * @returns number if valid and present, undefined otherwise
 */
export function transformSqlNullFloat64(value: SqlNullFloat64 | number | undefined | null): number | undefined {
  if (!value && value !== 0) {
    return undefined;
  }
  
  // If we get a direct number (API inconsistency), return it
  if (typeof value === 'number') {
    return value;
  }
  
  // Type guard to ensure we have a valid SqlNullFloat64 object
  if (typeof value === 'object' && value !== null) {
    // If valid is explicitly false, return undefined
    if (value.valid === false) {
      return undefined;
    }
    
    // If we have a float64 value and it's valid, return it
    if (typeof value.float64 === 'number' && (value.valid === true || value.valid === undefined)) {
      return value.float64;
    }
  }
  
  return undefined;
}

/**
 * Type guard to check if a value is a SqlNullInt32 wrapper
 * @param value - Any value to check
 * @returns true if value is SqlNullInt32 wrapper object
 */
export function isSqlNullInt32(value: unknown): value is SqlNullInt32 {
  return Boolean(
    value &&
    typeof value === 'object' &&
    value !== null &&
    ('int32' in value || 'valid' in value)
  );
}

/**
 * Type guard to check if a value is a SqlNullString wrapper
 * @param value - Any value to check
 * @returns true if value is SqlNullString wrapper object
 */
export function isSqlNullString(value: unknown): value is SqlNullString {
  return Boolean(
    value &&
    typeof value === 'object' &&
    value !== null &&
    ('string' in value || 'valid' in value)
  );
}

/**
 * Type guard to check if a value is a SqlNullTime wrapper
 * @param value - Any value to check
 * @returns true if value is SqlNullTime wrapper object
 */
export function isSqlNullTime(value: unknown): value is SqlNullTime {
  return Boolean(
    value &&
    typeof value === 'object' &&
    value !== null &&
    ('time' in value || 'valid' in value)
  );
}

/**
 * Type guard to check if a value is a SqlNullBool wrapper
 * @param value - Any value to check
 * @returns true if value is SqlNullBool wrapper object
 */
export function isSqlNullBool(value: unknown): value is SqlNullBool {
  return Boolean(
    value &&
    typeof value === 'object' &&
    value !== null &&
    ('bool' in value || 'valid' in value)
  );
}

/**
 * Type guard to check if a value is a SqlNullFloat64 wrapper
 * @param value - Any value to check
 * @returns true if value is SqlNullFloat64 wrapper object
 */
export function isSqlNullFloat64(value: unknown): value is SqlNullFloat64 {
  return Boolean(
    value &&
    typeof value === 'object' &&
    value !== null &&
    ('float64' in value || 'valid' in value)
  );
}

/**
 * Transform any SqlNull wrapper type to its simple equivalent
 * Useful for generic transformations when you don't know the specific type
 * @param value - Any SqlNull wrapper or simple value
 * @returns Transformed simple value
 */
// Unified SqlNull wrapper type
export type SqlNullWrapper =
  | SqlNullInt32
  | SqlNullString
  | SqlNullTime
  | SqlNullBool
  | SqlNullFloat64;

// Overload signatures provide precise return types for callers
/* eslint-disable no-redeclare */
export function transformSqlNullValue(value: SqlNullInt32): number | undefined;
export function transformSqlNullValue(value: SqlNullString): string | undefined;
export function transformSqlNullValue(value: SqlNullTime): string | undefined;
export function transformSqlNullValue(value: SqlNullBool): boolean | undefined;
export function transformSqlNullValue(value: SqlNullFloat64): number | undefined;
export function transformSqlNullValue(value: number): number;
export function transformSqlNullValue(value: string): string;
export function transformSqlNullValue(value: boolean): boolean;
export function transformSqlNullValue(value: unknown): unknown;
export function transformSqlNullValue(value: unknown): unknown {
  if (isSqlNullInt32(value)) {
    return transformSqlNullInt32(value);
  }
  if (isSqlNullString(value)) {
    return transformSqlNullString(value);
  }
  if (isSqlNullTime(value)) {
    return transformSqlNullTime(value);
  }
  if (isSqlNullBool(value)) {
    return transformSqlNullBool(value);
  }
  if (isSqlNullFloat64(value)) {
    return transformSqlNullFloat64(value);
  }
  return value;
}
/* eslint-enable no-redeclare */

/**
 * Transform an entire object by applying SQL null transformations to all properties
 * @param obj - Object to transform
 * @returns Object with all SQL null wrappers transformed to simple types
 */
export function transformSqlNullObject<T extends Record<string, unknown>>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  const transformed = { ...obj } as T;
  
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      // Transform arrays recursively
      (transformed as Record<string, unknown>)[key] = value.map(item =>
        typeof item === 'object' && item !== null
          ? transformSqlNullObject(item as Record<string, unknown>)
          : transformSqlNullValue(item)
      );
    } else if (value && typeof value === 'object') {
      // Check if it's a SQL null wrapper first
      if (isSqlNullInt32(value) || isSqlNullString(value) || isSqlNullTime(value) ||
          isSqlNullBool(value) || isSqlNullFloat64(value)) {
        (transformed as Record<string, unknown>)[key] = transformSqlNullValue(value);
      } else {
        // Recursively transform nested objects
        (transformed as Record<string, unknown>)[key] = transformSqlNullObject(value as Record<string, unknown>);
      }
    } else {
      // Keep primitive values as-is
      (transformed as Record<string, unknown>)[key] = value;
    }
  }
  
  return transformed;
}

/**
 * Error class for SQL null transformation failures
 */
export class SqlNullTransformationError extends Error {
  constructor(message: string, public readonly originalValue: unknown) {
    super(`SQL Null Transformation Error: ${message}`);
    this.name = 'SqlNullTransformationError';
  }
}

/**
 * Safe transform with error handling
 * @param value - SqlNull wrapper value
 * @param transformer - Transformation function
 * @returns Transformed value or throws SqlNullTransformationError
 */
export function safeTransform<T, R>(
  value: T,
  transformer: (value: T) => R
): R {
  try {
    return transformer(value);
  } catch (error) {
    throw new SqlNullTransformationError(
      `Failed to transform value: ${error instanceof Error ? error.message : 'Unknown error'}`,
      value
    );
  }
}

/**
 * Utility to safely transform proxy data with comprehensive SQL null handling
 * This function specifically handles the proxy response transformation issues
 * @param proxy - Raw proxy data from backend
 * @returns Proxy data with all SQL null types transformed
 */
export function transformProxyData(proxy: unknown): Record<string, unknown> {
  if (!proxy || typeof proxy !== 'object') return proxy as Record<string, unknown>;
  
  const proxyObj = proxy as Record<string, unknown>;
  
  return {
    ...proxyObj,
    description: 'description' in proxyObj ? transformSqlNullString(proxyObj.description as string | SqlNullString | null | undefined) : undefined,
    username: 'username' in proxyObj ? transformSqlNullString(proxyObj.username as string | SqlNullString | null | undefined) : undefined,
    passwordHash: 'passwordHash' in proxyObj ? transformSqlNullString(proxyObj.passwordHash as string | SqlNullString | null | undefined) : undefined,
    host: 'host' in proxyObj ? transformSqlNullString(proxyObj.host as string | SqlNullString | null | undefined) : undefined,
    port: 'port' in proxyObj ? transformSqlNullInt32(proxyObj.port as number | SqlNullInt32 | null | undefined) : undefined,
    lastStatus: 'lastStatus' in proxyObj ? transformSqlNullString(proxyObj.lastStatus as string | SqlNullString | null | undefined) : undefined,
    lastCheckedAt: 'lastCheckedAt' in proxyObj ? transformSqlNullTime(proxyObj.lastCheckedAt as string | SqlNullTime | null | undefined) : undefined,
    latencyMs: 'latencyMs' in proxyObj ? transformSqlNullInt32(proxyObj.latencyMs as number | SqlNullInt32 | null | undefined) : undefined,
    city: 'city' in proxyObj ? transformSqlNullString(proxyObj.city as string | SqlNullString | null | undefined) : undefined,
    countryCode: 'countryCode' in proxyObj ? transformSqlNullString(proxyObj.countryCode as string | SqlNullString | null | undefined) : undefined,
    provider: 'provider' in proxyObj ? transformSqlNullString(proxyObj.provider as string | SqlNullString | null | undefined) : undefined,
    notes: 'notes' in proxyObj ? transformSqlNullString(proxyObj.notes as string | SqlNullString | null | undefined) : undefined,
  };
}