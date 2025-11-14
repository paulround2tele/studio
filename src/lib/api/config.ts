// Centralized API configuration for generated OpenAPI clients
// Ensures basePath always targets /api/v2 and applies standard headers/credentials

// Import Configuration directly to avoid circular re-export chain:
// Barrel '@/lib/api-client' -> compat.ts -> imports this config again before
// config finishes evaluating, yielding undefined 'Configuration' at runtime.
// Direct import from the generated configuration module breaks the cycle.
import { Configuration } from '@/lib/api-client/configuration';

// Ensure URL has a single trailing-less join and includes /api/v2
function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/$/, '');
  const p = path.replace(/^\//, '');
  return `${b}/${p}`;
}

export function getApiBasePath(): string {
  const env = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (env) {
    if (env.startsWith('/')) {
      if (typeof window === 'undefined') {
        // Server-side usage needs absolute URL to avoid invalid URL errors
        const loopback = process.env.INTERNAL_API_ORIGIN?.trim() || 'http://localhost:8080';
        return joinUrl(loopback, env);
      }
      // Browser can rely on Next.js rewrites with relative path to stay same-origin
      return env;
    }
    try {
      const parsed = new URL(env);
      const { hostname } = parsed;

      const isCodespaces = hostname?.endsWith('.app.github.dev');
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

      if (!isLocalhost && !isCodespaces) {
        return joinUrl(env, 'api/v2');
      }
    } catch (error) {
      console.warn('Invalid NEXT_PUBLIC_API_URL provided, falling back to default', error);
    }
  }

  const codespacesHost = process.env.CODESPACES_HOSTNAME;
  if (codespacesHost) {
    const inferBase = `https://${codespacesHost.replace(/:8080$/, '-8080.app.github.dev')}`;
    return joinUrl(inferBase, 'api/v2');
  }

  // Prefer explicit env; otherwise default local dev server
  const root = env && env.length > 0 ? env : 'http://localhost:8080';

  // If already points to /api/v2 (with or without trailing slash), keep it
  if (/\/api\/v2\/?$/.test(root)) {
    return root.replace(/\/$/, '');
  }
  // If points to /api (legacy), append v2
  if (/\/api\/?$/.test(root)) {
    return joinUrl(root, 'v2');
  }
  // Otherwise append full /api/v2
  return joinUrl(root, 'api/v2');
}

export function createApiConfiguration(): Configuration {
  return new Configuration({
    basePath: getApiBasePath(),
    baseOptions: {
      withCredentials: true,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
      },
    },
  });
}

// Shared singleton for typical use
export const apiConfiguration = createApiConfiguration();
