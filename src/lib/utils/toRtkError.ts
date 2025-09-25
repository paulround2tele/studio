import type { SerializedError } from '@reduxjs/toolkit';

interface NormalizedRtkError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
  raw?: any;
}

/**
 * Normalizes heterogeneous error shapes (Axios error, Fetch error, plain Error, string)
 * into a consistent object consumable by RTK Query and UI toasts.
 */
export function toRtkError(err: any): NormalizedRtkError {
  if (!err) return { message: 'Unknown error', raw: err };

  // Axios style
  if (err.isAxiosError) {
    const status = err.response?.status;
    const data = err.response?.data;
    const envelope = data?.error || data?.data || data; // allow backend envelope variants
    const message = envelope?.message || data?.message || err.message || 'Request failed';
    return {
      message,
      status,
      code: envelope?.code || data?.code,
      details: envelope?.details || envelope?.errors || data?.errors,
      raw: err,
    };
  }

  // Fetch / Response like
  if (err instanceof Response) {
    return { message: `HTTP ${err.status}`, status: err.status, raw: err };
  }

  // Plain Error
  if (err instanceof Error) {
    return { message: err.message, raw: err };
  }

  if (typeof err === 'string') return { message: err };

  // SerializedError from RTK
  const maybeSerialized = err as SerializedError;
  if (maybeSerialized && maybeSerialized.message) {
    return { message: maybeSerialized.message, code: maybeSerialized.code, raw: err };
  }

  return { message: 'Unhandled error shape', raw: err };
}

export type { NormalizedRtkError };
