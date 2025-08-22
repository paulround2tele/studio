// Use the single source of truth: OpenAPI generated types
import type { components } from '@/lib/api-client/types';

type Campaign = components['schemas']['api.CampaignSummary'];

// Transform API response to frontend Campaign interface
export function transformCampaignToViewModel(apiCampaign: Campaign): Campaign {
  // API response IS the frontend interface - no transformation needed
  return apiCampaign;
}
