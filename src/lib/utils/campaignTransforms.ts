// src/lib/utils/campaignTransforms.ts
// Campaign data transformation utilities for UI compatibility (OpenAPI Migration)

import type { components } from '@/lib/api-client/types';
import type { UUID } from '@/lib/api-client/uuid-types';
// Enum types removed - using direct string literals now
import type { CampaignViewModel } from '@/lib/api-client/types-bridge';

type OpenAPICampaign = components['schemas']['LeadGenerationCampaign'];
type CampaignPhase = 'domain_generation' | 'dns_validation' | 'http_keyword_validation' | 'analysis';
type CampaignPhaseStatus = 'not_started' | 'ready' | 'configured' | 'in_progress' | 'paused' | 'completed' | 'failed';

/**
 * Helper function to find campaign ID in nested API response structures
 */
function findCampaignIdInData(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  
  const dataObj = data as Record<string, unknown>;
  
  // Check common patterns for campaign ID
  const possibleIdFields = [
    'campaignId', 'campaign_id', 'CampaignID', 'id', 'ID',
    'uuid', 'guid', 'entityId', 'entity_id'
  ];
  
  for (const field of possibleIdFields) {
    const value = dataObj[field];
    if (typeof value === 'string' && value.length > 0 &&
        value !== '00000000-0000-0000-0000-000000000000') {
      return value;
    }
  }
  
  // Check nested objects
  const nestedKeys = ['campaign', 'data', 'result', 'entity'];
  for (const key of nestedKeys) {
    if (dataObj[key] && typeof dataObj[key] === 'object') {
      const nestedId = findCampaignIdInData(dataObj[key]);
      if (nestedId) return nestedId;
    }
  }
  
  return null;
}

// Map string to CampaignPhaseStatus enum
function mapToPhaseStatus(status?: string): CampaignPhaseStatus {
  switch (status) {
    case 'not_started':
      return 'not_started';
    case 'in_progress':
      return 'in_progress';
    case 'paused':
      return 'paused';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    default:
      return 'not_started';
  }
}

// Map string to CampaignPhase enum
function mapToPhase(phase?: string): CampaignPhase {
  switch (phase) {
    case 'setup':
    case 'generation':
      return 'domain_generation';
    case 'domain_generation':
      return 'domain_generation';
    case 'dns_validation':
      return 'dns_validation';
    case 'http_keyword_validation':
      return 'http_keyword_validation';
    case 'analysis':
      return 'analysis';
    default:
      return 'domain_generation';
  }
}

/**
 * Transform OpenAPI Campaign to CampaignViewModel for UI consumption
 * Adds UI-specific computed properties and backwards compatibility fields
 */
export function transformCampaignToViewModel(campaign: OpenAPICampaign): CampaignViewModel {
  // Enhanced campaign ID handling with debugging but not breaking on missing ID
  let campaignId = campaign.id;
  
  if (!campaignId || campaignId === '00000000-0000-0000-0000-000000000000') {
    console.warn('⚠️ [Campaign Transform] Missing or invalid campaign ID:', {
      campaignData: campaign,
      hasId: !!campaign.id,
      idValue: campaign.id,
      keys: Object.keys(campaign || {})
    });
    
    // Try to find ID in nested structures
    const possibleId = findCampaignIdInData(campaign);
    if (possibleId) {
      console.log('✅ [Campaign Transform] Found campaign ID in nested structure:', possibleId);
      campaignId = possibleId;
    } else {
      console.warn('⚠️ [Campaign Transform] Using fallback ID, API response structure needs investigation');
      campaignId = '00000000-0000-0000-0000-000000000000'; // Fallback instead of throwing
    }
  }
  
  // Use OpenAPI schema fields directly - no legacy mapping needed
  const currentPhase = mapToPhase(campaign.currentPhase);
  const phaseStatus = mapToPhaseStatus(campaign.phaseStatus);
  
  return {
    // Core OpenAPI Campaign fields (direct mapping)
    id: campaignId as UUID,
    name: campaign.name || '',
    campaignType: 'lead_generation', // Required field for lead generation campaigns
    userId: campaign.userId,
    createdAt: campaign.createdAt || new Date().toISOString(),
    updatedAt: campaign.updatedAt || new Date().toISOString(),
    startedAt: campaign.startedAt,
    completedAt: campaign.completedAt,
    progressPercentage: campaign.progressPercentage || 0,
    totalItems: campaign.totalItems,
    processedItems: campaign.processedItems,
    successfulItems: campaign.successfulItems,
    failedItems: campaign.failedItems,
    errorMessage: campaign.errorMessage,
    metadata: campaign.metadata || {},
    estimatedCompletionAt: campaign.estimatedCompletionAt,
    avgProcessingRate: campaign.avgProcessingRate,
    lastHeartbeatAt: campaign.lastHeartbeatAt,
    businessStatus: campaign.businessStatus,
    
    // Phase-based architecture fields
    currentPhase: currentPhase as any, // Cast for cleanup period type compatibility
    phaseStatus,
    
    // UI compatibility fields
    selectedType: currentPhase as any, // Cast for cleanup period type compatibility
    
    // Use actual count values from backend (these are numbers, not arrays)
    domains: campaign.domains || 0,
    dnsValidatedDomains: campaign.dnsValidatedDomains || 0,
    leads: campaign.leads || 0,
    
    // Phase-centric data (JSONB columns)
    extractedContent: campaign.extractedContent,
    leadItems: campaign.leadItems,
    
    // Default UI configuration
    domainSourceConfig: {
      type: 'manual',
      uploadedDomains: []
    }
  };
}

/**
 * Transform array of OpenAPI Campaign objects to CampaignViewModel array
 */
export function transformCampaignsToViewModels(campaigns: OpenAPICampaign[]): CampaignViewModel[] {
  return campaigns.map(transformCampaignToViewModel);
}

// These legacy mapping functions are no longer needed since we use OpenAPI schema directly

/**
 * Extract UI-specific fields from CampaignViewModel back to Campaign
 * Useful when sending data back to the API
 */
export function extractCampaignFromViewModel(viewModel: CampaignViewModel): OpenAPICampaign {
  return {
    id: viewModel.id || '00000000-0000-0000-0000-000000000000',
    name: viewModel.name || '',
    campaignType: 'lead_generation', // Required field for lead generation campaigns
    currentPhase: viewModel.currentPhase,
    phaseStatus: viewModel.phaseStatus,
    userId: viewModel.userId || '',
    createdAt: viewModel.createdAt || new Date().toISOString(),
    updatedAt: viewModel.updatedAt || new Date().toISOString(),
    startedAt: viewModel.startedAt,
    completedAt: viewModel.completedAt,
    progressPercentage: viewModel.progressPercentage,
    totalItems: viewModel.totalItems ? Number(viewModel.totalItems) : undefined,
    processedItems: viewModel.processedItems ? Number(viewModel.processedItems) : undefined,
    successfulItems: viewModel.successfulItems ? Number(viewModel.successfulItems) : undefined,
    failedItems: viewModel.failedItems ? Number(viewModel.failedItems) : undefined,
    errorMessage: viewModel.errorMessage,
    metadata: viewModel.metadata || {},
    estimatedCompletionAt: viewModel.estimatedCompletionAt,
    avgProcessingRate: viewModel.avgProcessingRate,
    lastHeartbeatAt: viewModel.lastHeartbeatAt,
    businessStatus: viewModel.businessStatus,
    domains: viewModel.domains,
    dnsValidatedDomains: viewModel.dnsValidatedDomains,
    leads: viewModel.leads,
    extractedContent: viewModel.extractedContent,
    leadItems: viewModel.leadItems
  };
}

/**
 * Safely merge Campaign API updates into CampaignViewModel without overriding UI-specific fields
 * This preserves UI state while updating API data
 */
export function mergeCampaignApiUpdate(viewModel: CampaignViewModel, apiUpdate: Partial<OpenAPICampaign>): CampaignViewModel {
  // Create a new ViewModel preserving existing UI-specific fields and updating with API data
  const updatedViewModel: CampaignViewModel = { ...viewModel };
  
  // Update core fields from API if provided (using OpenAPI types directly)
  if (apiUpdate.name !== undefined) {
    updatedViewModel.name = apiUpdate.name;
  }
  if (apiUpdate.progressPercentage !== undefined) {
    updatedViewModel.progressPercentage = apiUpdate.progressPercentage;
  }
  if (apiUpdate.errorMessage !== undefined) {
    updatedViewModel.errorMessage = apiUpdate.errorMessage;
  }
  if (apiUpdate.avgProcessingRate !== undefined) {
    updatedViewModel.avgProcessingRate = apiUpdate.avgProcessingRate;
  }
  if (apiUpdate.metadata !== undefined) {
    updatedViewModel.metadata = apiUpdate.metadata || {};
  }
  
  // Update OpenAPI fields directly
  if (apiUpdate.id) {
    updatedViewModel.id = apiUpdate.id as UUID;
  }
  if (apiUpdate.userId) {
    updatedViewModel.userId = apiUpdate.userId;
  }
  if (apiUpdate.createdAt) {
    updatedViewModel.createdAt = apiUpdate.createdAt;
  }
  if (apiUpdate.updatedAt) {
    updatedViewModel.updatedAt = apiUpdate.updatedAt;
  }
  if (apiUpdate.startedAt) {
    updatedViewModel.startedAt = apiUpdate.startedAt;
  }
  if (apiUpdate.completedAt) {
    updatedViewModel.completedAt = apiUpdate.completedAt;
  }
  if (apiUpdate.estimatedCompletionAt) {
    updatedViewModel.estimatedCompletionAt = apiUpdate.estimatedCompletionAt;
  }
  if (apiUpdate.lastHeartbeatAt) {
    updatedViewModel.lastHeartbeatAt = apiUpdate.lastHeartbeatAt;
  }
  if (apiUpdate.totalItems !== undefined) {
    updatedViewModel.totalItems = apiUpdate.totalItems;
  }
  if (apiUpdate.processedItems !== undefined) {
    updatedViewModel.processedItems = apiUpdate.processedItems;
  }
  if (apiUpdate.successfulItems !== undefined) {
    updatedViewModel.successfulItems = apiUpdate.successfulItems;
  }
  if (apiUpdate.failedItems !== undefined) {
    updatedViewModel.failedItems = apiUpdate.failedItems;
  }
  if (apiUpdate.businessStatus !== undefined) {
    updatedViewModel.businessStatus = apiUpdate.businessStatus;
  }
  if (apiUpdate.domains !== undefined) {
    updatedViewModel.domains = apiUpdate.domains;
  }
  if (apiUpdate.dnsValidatedDomains !== undefined) {
    updatedViewModel.dnsValidatedDomains = apiUpdate.dnsValidatedDomains;
  }
  if (apiUpdate.leads !== undefined) {
    updatedViewModel.leads = apiUpdate.leads;
  }
  
  // Update phase-based fields if provided
  if (apiUpdate.currentPhase !== undefined) {
    updatedViewModel.currentPhase = mapToPhase(apiUpdate.currentPhase);
    updatedViewModel.selectedType = updatedViewModel.currentPhase;
  }
  if (apiUpdate.phaseStatus !== undefined) {
    updatedViewModel.phaseStatus = mapToPhaseStatus(apiUpdate.phaseStatus);
  }
  
  // Phase-centric architecture: phase configuration stored in individual phase records
  if (apiUpdate.extractedContent !== undefined) {
    updatedViewModel.extractedContent = apiUpdate.extractedContent;
  }
  if (apiUpdate.leadItems !== undefined) {
    updatedViewModel.leadItems = apiUpdate.leadItems;
  }
  
  return updatedViewModel;
}
