'use client';

import { useEffect } from 'react';

const ENABLE_NETWORK_LOGGING = process.env.NEXT_PUBLIC_ENABLE_NETWORK_LOGGING === 'true';
const LOG_ENDPOINT = '/api/v2/debug/network-log';

interface FetchLogEntry {
  url: string;
  method: string;
  durationMs: number;
  status?: number;
  ok?: boolean;
  error?: string;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
}

type HeaderRecordValue = string | number | boolean | Array<string | number | boolean> | null | undefined;

type HeaderRecord = Record<string, HeaderRecordValue>;

function normaliseUrl(rawUrl: string): string {
  try {
    return new URL(rawUrl, window.location.origin).href;
  } catch {
    return rawUrl;
  }
}

function collectHeaders(headers?: RequestInit['headers']): Record<string, string> | undefined {
  if (!headers) return undefined;
  const result: Record<string, string> = {};
  const assign = (key: string, value: string) => {
    const trimmedKey = key.trim().toLowerCase();
    if (!trimmedKey) return;
    const trimmedValue = value.trim();
    if (!trimmedValue) return;
    result[trimmedKey] = trimmedValue;
  };

  try {
    if (headers instanceof Headers) {
      headers.forEach((value, key) => {
        assign(key, value);
      });
    } else if (Array.isArray(headers)) {
      headers.forEach(([key, value]) => {
        if (typeof key === 'string' && value != null) {
          assign(key, String(value));
        }
      });
    } else if (typeof headers === 'object') {
      Object.entries(headers as HeaderRecord).forEach(([key, value]) => {
        if (value == null) return;
        if (Array.isArray(value)) {
          assign(key, value.map((v) => String(v)).join(','));
        } else {
          assign(key, String(value));
        }
      });
    }
  } catch {
    return undefined;
  }

  return Object.keys(result).length ? result : undefined;
}

function shouldCapture(url: string): boolean {
  const target = normaliseUrl(url);
  if (target.includes(LOG_ENDPOINT)) {
    return false;
  }
  try {
    const parsed = new URL(target);
    const currentOrigin = window.location.origin;
    if (parsed.origin === currentOrigin) {
      return parsed.pathname.startsWith('/api');
    }
    return parsed.hostname === 'localhost' || parsed.port === '8080';
  } catch {
    return url.startsWith('/api');
  }
}

function sendLog(originalFetch: typeof window.fetch, payload: FetchLogEntry) {
  const body = JSON.stringify({
    timestamp: new Date().toISOString(),
    ...payload,
  });
  const attemptBeacon = () => {
    if (!navigator.sendBeacon) return false;
    try {
      const blob = new Blob([body], { type: 'application/json' });
      return navigator.sendBeacon(LOG_ENDPOINT, blob);
    } catch {
      return false;
    }
  };

  if (attemptBeacon()) {
    return;
  }

  originalFetch(LOG_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Ignore transport errors for logging to avoid breaking the caller.
  });
}

export function NetworkRequestLogger(): null {
  useEffect(() => {
    if (!ENABLE_NETWORK_LOGGING || typeof window === 'undefined') {
      return;
    }

    const originalFetch: typeof window.fetch = window.fetch.bind(window);

    window.fetch = async (...rawArgs) => {
      const [input, init] = rawArgs;
      let url: string;
      let method = init?.method ? init.method : 'GET';
      let requestHeaders: Record<string, string> | undefined;

      if (typeof input === 'string') {
        url = input;
        requestHeaders = collectHeaders(init?.headers);
      } else if (input instanceof Request) {
        url = input.url;
        method = input.method || method;
        requestHeaders = collectHeaders(init?.headers ?? input.headers);
        if (init?.method) {
          method = init.method;
        }
      } else {
        url = String(input);
        requestHeaders = collectHeaders(init?.headers);
      }

      if (!shouldCapture(url)) {
        return originalFetch(...rawArgs);
      }

      const start = performance.now();

      try {
        const response = await originalFetch(...rawArgs);
        const durationMs = Math.max(0, Math.round(performance.now() - start));
        let responseHeaders: Record<string, string> | undefined;
        try {
          responseHeaders = collectHeaders(response.headers);
        } catch {
          responseHeaders = undefined;
        }

        sendLog(originalFetch, {
          url: normaliseUrl(url),
          method,
          status: response.status,
          ok: response.ok,
          durationMs,
          requestHeaders,
          responseHeaders,
        });
        return response;
      } catch (error) {
        const durationMs = Math.max(0, Math.round(performance.now() - start));
        sendLog(originalFetch, {
          url: normaliseUrl(url),
          method,
          durationMs,
          requestHeaders,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}

export default NetworkRequestLogger;
