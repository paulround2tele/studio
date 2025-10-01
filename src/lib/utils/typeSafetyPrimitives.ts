/**
 * Type Safety Primitives
 * Core utilities for type-safe operations across the codebase
 */

/**
 * Result monad for structured success/failure handling
 */
export type Result<T, E = string> = 
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Create a successful result
 */
export function Ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/**
 * Create an error result
 */
export function Err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/**
 * Exhaustiveness check for discriminated unions
 */
export function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(x)}`);
}

/**
 * Safe nested object path creation
 */
export function ensurePath(obj: any, segments: string[]): any {
  if (!obj || typeof obj !== 'object') {
    throw new Error('Cannot ensure path on non-object');
  }

  let current = obj;
  for (const segment of segments) {
    if (!(segment in current)) {
      current[segment] = {};
    }
    current = current[segment];
  }
  return current;
}

/**
 * Mutable record type for safe generic assignment
 */
export type MutableRecord<K extends string, V> = {
  -readonly [P in K]: V;
};

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
 * Safe random selection from array
 */
export function selectRandom<T>(arr: T[]): T | null {
  if (arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Safe random selection from non-empty array
 */
export function selectRandomNonEmpty<T>(arr: NonEmptyArray<T>): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Apply a patch operation to an object path
 */
export interface StreamPatchOp {
  type: 'set' | 'delete' | 'inc' | 'append';
  path: string;
  value?: unknown;
}

/**
 * Apply a patch operation to a root object
 */
export function applyPatchOp(root: any, op: StreamPatchOp): Result<any, string> {
  try {
    const pathSegments = op.path.split('.');
    if (pathSegments.length === 0) {
      return Err(`Invalid path: ${op.path}`);
    }

    // Navigate to parent object
    let current = root;
    for (let i = 0; i < pathSegments.length - 1; i++) {
      const segment = pathSegments[i];
      if (!segment) continue;
      
      if (!(segment in current)) {
        current[segment] = {};
      }
      current = current[segment];
    }

    const finalKey = pathSegments[pathSegments.length - 1];
    if (!finalKey) {
      return Err(`Invalid final key in path: ${op.path}`);
    }

    // Apply operation
    switch (op.type) {
      case 'set':
        current[finalKey] = op.value;
        break;
      case 'delete':
        delete current[finalKey];
        break;
      case 'inc':
        current[finalKey] = (current[finalKey] || 0) + (typeof op.value === 'number' ? op.value : 1);
        break;
      case 'append':
        if (!Array.isArray(current[finalKey])) {
          current[finalKey] = [];
        }
        current[finalKey].push(op.value);
        break;
      default:
        return Err(`Unknown operation type: ${(op as any).type}`);
    }

    return Ok(root);
  } catch (error) {
    return Err(`Patch operation failed: ${error}`);
  }
}

/**
 * Create a safe MessageEvent for cloning
 */
export function createMessageEvent(data: any): MessageEvent {
  // Clone data to avoid readonly issues
  const clonedData = typeof data === 'string' ? data : JSON.stringify(data);
  
  return new MessageEvent('message', {
    data: clonedData
  });
}

/**
 * Normalize optional stats with defaults
 */
export function normalizeArmStats(stats: {
  pulls?: number;
  totalReward?: number;
  averageReward?: number;
  confidence?: number;
}): {
  pulls: number;
  totalReward: number;
  averageReward: number;
  confidence: number;
} {
  return {
    pulls: stats.pulls ?? 0,
    totalReward: stats.totalReward ?? 0,
    averageReward: stats.averageReward ?? 0,
    confidence: stats.confidence ?? 0
  };
}