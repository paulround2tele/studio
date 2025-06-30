import { getApiBaseUrl } from '@/lib/config';

export interface HealthResponse {
  status: string;
  version?: string;
  message?: string;
}

export async function getHealth(): Promise<HealthResponse> {
  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${baseUrl}/health`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

const healthApi = { getHealth };
export default healthApi;
