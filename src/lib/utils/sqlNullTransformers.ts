/**
 * SQL Null Wrapper Type Transformation Utilities
 * 
 * These utilities transform swagger-generated SQL null wrapper types 
 * (SqlNullInt32, SqlNullString, etc.) into simple frontend-safe types.
 */

// Define inline types for SqlNull structures
interface SqlNullInt32 {
  int32?: number;
  valid?: boolean;
}

interface SqlNullString {
  string?: string;
  valid?: boolean;
}

/**
 * Transform SqlNullInt32 to a simple number or undefined
 * @param value - SqlNullInt32 wrapper object or undefined
 * @returns number if valid and present, undefined otherwise
 */
export function transformSqlNullInt32(value: SqlNullInt32 | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  
  // Type guard to ensure we have a valid SqlNullInt32 object
  if (typeof value === 'object' && value !== null) {
    // If valid is explicitly false, return undefined
    if (value.valid === false) {
      return undefined;
    }
    
    // If we have an int32 value, return it
    if (typeof value === 'number') {
      return value;
    }
  }
  
  // If we somehow get a direct number (API inconsistency), return it
  if (typeof value === 'number') {
    return value;
  }
  
  return undefined;
}

/**
 * Transform SqlNullString to a simple string or undefined
 * @param value - SqlNullString wrapper object or undefined
 * @returns string if valid and present, undefined otherwise
 */
export function transformSqlNullString(value: SqlNullString | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  
  // Type guard to ensure we have a valid SqlNullString object
  if (typeof value === 'object' && value !== null) {
    // If valid is explicitly false, return undefined
    if (value.valid === false) {
      return undefined;
    }
    
    // If we have a string value, return it
    if (typeof value === 'string') {
      return value;
    }
  }
  
  // If we somehow get a direct string (API inconsistency), return it
  if (typeof value === 'string') {
    return value;
  }
  
  return undefined;
}

/**
 * Type guard to check if a value is a SqlNullInt32 wrapper
 * @param value - Any value to check
 * @returns true if value is SqlNullInt32 wrapper object
 */
export function isSqlNullInt32(value: any): value is SqlNullInt32 {
  return (
    value &&
    typeof value === 'object' &&
    ('int32' in value || 'valid' in value)
  );
}

/**
 * Type guard to check if a value is a SqlNullString wrapper
 * @param value - Any value to check
 * @returns true if value is SqlNullString wrapper object
 */
export function isSqlNullString(value: any): value is SqlNullString {
  return (
    value &&
    typeof value === 'object' &&
    ('string' in value || 'valid' in value)
  );
}

/**
 * Transform any SqlNull wrapper type to its simple equivalent
 * Useful for generic transformations when you don't know the specific type
 * @param value - Any SqlNull wrapper or simple value
 * @returns Transformed simple value
 */
export function transformSqlNullValue<T>(value: T): T extends SqlNullInt32 
  ? number | undefined 
  : T extends SqlNullString 
    ? string | undefined 
    : T {
  if (isSqlNullInt32(value)) {
    return transformSqlNullInt32(value) as any;
  }
  
  if (isSqlNullString(value)) {
    return transformSqlNullString(value) as any;
  }
  
  // Return value as-is if it's not a SqlNull wrapper
  return value as any;
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