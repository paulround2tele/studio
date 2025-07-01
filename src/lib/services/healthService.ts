import { apiClient } from '@/lib/api-client/client';

export interface HealthResponse {
  status: string;
  timestamp: string;
  version?: string;
  message?: string;
  checks?: Record<string, unknown>;
}

export async function getHealth(): Promise<HealthResponse> {
  try {
    // Use a generic endpoint until health endpoints are added to OpenAPI spec
    const response = await fetch('/api/health', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    // Fallback response
    return {
      status: 'error',
      timestamp: new Date().toISOString(),
      message: error instanceof Error ? error.message : 'Health check failed',
    };
  }
}

const healthService = { getHealth };
export default healthService;
