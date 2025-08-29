// Centralized API configuration for generated OpenAPI clients
// Ensures basePath always targets /api/v2 and applies standard headers/credentials

import { Configuration } from '@/lib/api-client';

// Ensure URL has a single trailing-less join and includes /api/v2
function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/$/, '');
  const p = path.replace(/^\//, '');
  return `${b}/${p}`;
}

export function getApiBasePath(): string {
  const env = process.env.NEXT_PUBLIC_API_URL?.trim();
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
