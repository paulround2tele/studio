import type { SerializedError } from '@reduxjs/toolkit';

interface NormalizedRtkError {
  message: string;
  status?: number;
  code?: string;
  details?: unknown;
  raw?: unknown;
}

/**
 * Normalizes heterogeneous error shapes (Axios error, Fetch error, plain Error, string)
 * into a consistent object consumable by RTK Query and UI toasts.
 */
export function toRtkError(err: unknown): NormalizedRtkError {
  if (!err) return { message: 'Unknown error', raw: err };

  // Axios style - check for isAxiosError property
  if (err && typeof err === 'object' && 'isAxiosError' in err && err.isAxiosError) {
    const status = err && typeof err === 'object' && 'response' in err && 
                   err.response && typeof err.response === 'object' && 'status' in err.response 
                   ? Number(err.response.status) : undefined;
    
    const data = err && typeof err === 'object' && 'response' in err && 
                 err.response && typeof err.response === 'object' && 'data' in err.response 
                 ? err.response.data : undefined;
    
    // Extract message with proper type checking
    let message = 'Request failed';
    if (data && typeof data === 'object') {
      if ('message' in data && typeof data.message === 'string') {
        message = data.message;
      } else if ('error' in data && data.error && typeof data.error === 'object' && 'message' in data.error) {
        message = String(data.error.message);
      }
    } else if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
      message = err.message;
    }

    return {
      message,
      status,
      code: data && typeof data === 'object' && 'code' in data ? String(data.code) : undefined,
      details: data && typeof data === 'object' && 'details' in data ? data.details : undefined,
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
