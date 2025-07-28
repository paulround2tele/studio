// Campaign transformer functions for API responses
import type { components } from '@/lib/api-client/types';

type Campaign = components['schemas']['LeadGenerationCampaign'];

/**
 * Transforms a single campaign response from API format
 */
export function transformCampaignResponse(campaign: any): Campaign {
  if (!campaign) return campaign;
  
  // Handle number conversions if needed
  return {
    ...campaign,
    totalItems: campaign.totalItems ? Number(campaign.totalItems) : undefined,
    completedItems: campaign.completedItems ? Number(campaign.completedItems) : undefined,
    pendingItems: campaign.pendingItems ? Number(campaign.pendingItems) : undefined,
    errorItems: campaign.errorItems ? Number(campaign.errorItems) : undefined,
  };
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