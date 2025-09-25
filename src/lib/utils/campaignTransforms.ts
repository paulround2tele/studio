// Use the single source of truth: OpenAPI generated models
import type { CampaignResponse as Campaign } from '@/lib/api-client/models/campaign-response';

// Transform API response to frontend Campaign interface
export function transformCampaignToViewModel(apiCampaign: Campaign): Campaign {
  // API response IS the frontend interface - no transformation needed
  return apiCampaign;
}
