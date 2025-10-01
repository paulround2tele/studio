/**
 * Safe Array Access Utilities
 * Phase 1: Safety nets for array operations in algorithmic code
 */

/**
 * Non-empty array type that guarantees at least one element
 */
export type NonEmptyArray<T> = [T, ...T[]];

/**
 * Type guard to check if an array is non-empty
 */
export function isNonEmptyArray<T>(arr: T[]): arr is NonEmptyArray<T> {
  return arr.length > 0;
}

/**
 * Safe array access that returns undefined for invalid indices
 */
export function safeAt<T>(arr: T[], index: number): T | undefined {
  if (index < 0 || index >= arr.length) {
    return undefined;
  }
  return arr[index];
}

/**
 * Get the first element of an array safely
 */
export function safeFirst<T>(arr: T[]): T | undefined {
  return safeAt(arr, 0);
}

/**
 * Get the last element of an array safely
 */
export function safeLast<T>(arr: T[]): T | undefined {
  return safeAt(arr, arr.length - 1);
}

/**
 * Safe array slicing that handles edge cases
 */
export function safeSlice<T>(arr: T[], start?: number, end?: number): T[] {
  if (arr.length === 0) return [];
  
  const actualStart = start ?? 0;
  const actualEnd = end ?? arr.length;
  
  // Normalize negative indices
  const normalizedStart = actualStart < 0 ? Math.max(0, arr.length + actualStart) : Math.min(actualStart, arr.length);
  const normalizedEnd = actualEnd < 0 ? Math.max(0, arr.length + actualEnd) : Math.min(actualEnd, arr.length);
  
  return arr.slice(normalizedStart, normalizedEnd);
}

/**
 * Ensure an array has at least the minimum required length
 */
export function ensureMinLength<T>(arr: T[], minLength: number, fillValue?: T): T[] {
  if (arr.length >= minLength) return arr;
  
  if (fillValue === undefined) {
    throw new Error(`Array has ${arr.length} elements but requires at least ${minLength}`);
  }
  
  const result = [...arr];
  while (result.length < minLength) {
    result.push(fillValue);
  }
  return result;
}

/**
 * Check if array has sufficient elements for an algorithm
 */
export function hasMinElements<T>(arr: T[], min: number): arr is T[] & { length: number } {
  return arr.length >= min;
}

/**
 * Type-safe array chunking
 */
export function safeChunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [];
  if (arr.length === 0) return [];
  
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Safe random selection from array
 */
export function selectRandom<T>(arr: NonEmptyArray<T>): T;
export function selectRandom<T>(arr: T[]): T | undefined;
export function selectRandom<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  const randomIndex = Math.floor(Math.random() * arr.length);
  return arr[randomIndex];
}

/**
 * Assert that an array is non-empty and return it typed as such
 */
export function assertNonEmpty<T>(arr: T[], context?: string): NonEmptyArray<T> {
  if (arr.length === 0) {
    throw new Error(`Expected non-empty array${context ? ` in ${context}` : ''}`);
  }
  return arr as NonEmptyArray<T>;
}

/**
 * Safe destructuring with fallback values
 */
export function safeDestructure<T>(
  arr: T[], 
  indices: number[]
): (T | undefined)[] {
  return indices.map(index => safeAt(arr, index));
}

/**
 * Calculate safe array statistics
 */
export interface ArrayStats {
  length: number;
  isEmpty: boolean;
  hasElements: boolean;
  safeFirst?: number;
  safeLast?: number;
  mean?: number;
  min?: number;
  max?: number;
}

export function calculateArrayStats(arr: number[]): ArrayStats {
  const stats: ArrayStats = {
    length: arr.length,
    isEmpty: arr.length === 0,
    hasElements: arr.length > 0,
  };

  if (arr.length > 0) {
    stats.safeFirst = arr[0];
    stats.safeLast = arr[arr.length - 1];
    stats.mean = arr.reduce((sum, val) => sum + val, 0) / arr.length;
    stats.min = Math.min(...arr);
    stats.max = Math.max(...arr);
  }

  return stats;
}