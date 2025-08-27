// Campaign transformer functions for API responses
import type { CampaignResponse as Campaign } from '@/lib/api-client/models/campaign-response';

/**
 * Transforms a single campaign response from API format
 */
export function transformCampaignResponse(campaign: any): Campaign {
  // With the new API models, the API response already matches our frontend type
  return campaign as Campaign;
}

/**
 * Transforms an array of campaign responses from API format
 */
export function transformCampaignArrayResponse(campaigns: any[] | null | undefined): Campaign[] {
  if (!campaigns || !Array.isArray(campaigns)) {
    return [];
  }
  
  return campaigns.map(transformCampaignResponse);
}