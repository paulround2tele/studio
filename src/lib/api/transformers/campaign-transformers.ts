// Campaign transformer functions for API responses
import type { CampaignResponse as Campaign } from '@/lib/api-client/models/campaign-response';

/**
 * Transforms a single campaign response from API format
 */
export function transformCampaignResponse(campaign: Campaign | unknown): Campaign {
  // Narrow unknown to Campaign shape (minimal key presence check)
  if (campaign && typeof campaign === 'object' && 'id' in (campaign as Campaign)) {
    return campaign as Campaign;
  }
  throw new Error('Invalid campaign response shape');
}

/**
 * Transforms an array of campaign responses from API format
 */
export function transformCampaignArrayResponse(campaigns: unknown[] | null | undefined): Campaign[] {
  if (!campaigns || !Array.isArray(campaigns)) return [];
  return campaigns.map(transformCampaignResponse);
}