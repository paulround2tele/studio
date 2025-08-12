/* 
 * PROFESSIONAL TYPE OVERRIDE FOR BROKEN OPENAPI GENERATOR
 * 
 * The OpenAPI generator incorrectly mapped /campaigns endpoint to return
 * BulkProxyOperationResponse instead of actual campaign data.
 * 
 * This file provides the CORRECT types based on the actual backend implementation.
 */

import type { CampaignCurrentPhaseEnum, CampaignPhaseStatusEnum } from './models';

export interface CampaignData {
  campaignId: string;
  name: string;
  currentPhase: CampaignCurrentPhaseEnum;
  phaseStatus: CampaignPhaseStatusEnum;
  totalItems: number;
  createdAt: string;
  updatedAt: string;
  
  // Optional phase data
  phases?: Array<{
    id: string;
    campaignId: string;
    phaseType: string;
    phaseOrder: number;
    status: string;
    progressPercentage: number;
    startedAt?: string;
    completedAt?: string;
    errorMessage?: string;
    totalItems: number;
    processedItems: number;
    successfulItems: number;
    failedItems: number;
    createdAt: string;
    updatedAt: string;
  }>;
  
  // Optional bulk JSONB data
  domainsData?: any;
  dnsResults?: any;
  httpResults?: any;
  analysisResults?: any;
  
  // Optional progress data
  progress?: number;
  domains?: number;
  leads?: number;
  dnsValidatedDomains?: number;
}

export interface CampaignsResponse {
  success: boolean;
  data: CampaignData[];
  requestId: string;
  error?: any;
  metadata?: any;
}

// Type assertion helper for the broken OpenAPI response
export function assertCampaignsResponse(response: any): CampaignsResponse {
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid response: expected object');
  }
  
  if (!response.success) {
    throw new Error(`API Error: ${response.error?.message || 'Unknown error'}`);
  }
  
  if (!Array.isArray(response.data)) {
    throw new Error('Invalid response: expected data to be array of campaigns');
  }
  
  return response as CampaignsResponse;
}
