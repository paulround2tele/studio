import healthApi from '@/lib/api/healthApi';
import type { HealthResponse } from '@/lib/api/healthApi';

export async function getHealth(): Promise<HealthResponse> {
  return healthApi.getHealth();
}

const healthService = { getHealth };
export default healthService;
