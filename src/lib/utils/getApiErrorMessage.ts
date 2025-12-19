/**
 * Extracts a human-friendly message from RTK Query mutation errors and
 * backend error envelopes.
 *
 * Designed for UI toasts: prefer the backend-provided message when available.
 */
export function getApiErrorMessage(error: unknown, fallback: string = 'Request failed'): string {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message || fallback;

  if (typeof error !== 'object') return fallback;

  const err = error as Record<string, unknown>;

  // RTK Query unwrap() rejection shape: { status, data }
  const data = err.data;
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;

    // Unified backend envelope variants
    // - { success:false, error: "..." }
    // - { success:false, error: { message: "..." } }
    const envelopeError = d.error;
    if (typeof envelopeError === 'string' && envelopeError.trim().length > 0) {
      return envelopeError;
    }
    if (envelopeError && typeof envelopeError === 'object') {
      const m = (envelopeError as Record<string, unknown>).message;
      if (typeof m === 'string' && m.trim().length > 0) {
        return m;
      }
    }

    // Common normalized shapes
    const msg = d.message;
    if (typeof msg === 'string' && msg.trim().length > 0) {
      return msg;
    }

    const details = d.details;
    if (details && typeof details === 'object') {
      const dm = (details as Record<string, unknown>).message;
      if (typeof dm === 'string' && dm.trim().length > 0) {
        return dm;
      }
    }
  }

  // Axios-like error shape: err.response.data
  const response = err.response;
  if (response && typeof response === 'object') {
    const r = response as Record<string, unknown>;
    const responseData = r.data;
    if (responseData && typeof responseData === 'object') {
      const rd = responseData as Record<string, unknown>;

      const envelopeError = rd.error;
      if (typeof envelopeError === 'string' && envelopeError.trim().length > 0) {
        return envelopeError;
      }
      if (envelopeError && typeof envelopeError === 'object') {
        const m = (envelopeError as Record<string, unknown>).message;
        if (typeof m === 'string' && m.trim().length > 0) {
          return m;
        }
      }

      const msg = rd.message;
      if (typeof msg === 'string' && msg.trim().length > 0) {
        return msg;
      }
    }
  }

  const directMessage = err.message;
  if (typeof directMessage === 'string' && directMessage.trim().length > 0) {
    return directMessage;
  }

  // If we have a status, at least surface it.
  const status = err.status;
  if (typeof status === 'number') {
    return `Request failed (${status})`;
  }

  return fallback;
}
