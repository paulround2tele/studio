// src/lib/utils/campaignTransforms.ts
// Campaign data transformation utilities for UI compatibility (OpenAPI Migration)

import type { components } from '@/lib/api-client/types';

type Campaign = components['schemas']['Campaign'];
type CampaignType = NonNullable<Campaign['campaignType']>;
type CampaignStatus = NonNullable<Campaign['status']>;

// Keep these frontend-specific types from legacy for now
import type { CampaignViewModel, CampaignPhase, CampaignPhaseStatus } from '@/lib/types';

type OpenAPICampaign = components['schemas']['Campaign'];

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

// Map OpenAPI Campaign status to frontend CampaignStatus
function mapOpenAPICampaignStatus(status?: string): CampaignStatus {
  switch (status) {
    case 'pending':
      return 'pending';
    case 'queued':
      return 'queued';
    case 'running':
      return 'running';
    case 'pausing':
      return 'pausing';
    case 'paused':
      return 'paused';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'pending';
  }
}

// Map OpenAPI Campaign type to frontend CampaignType
function mapOpenAPICampaignType(type?: string): CampaignType {
  switch (type) {
    case 'domain_generation':
      return 'domain_generation';
    case 'dns_validation':
      return 'dns_validation';
    case 'http_keyword_validation':
      return 'http_keyword_validation';
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
  
  // Map OpenAPI types to frontend types
  const campaignStatus = mapOpenAPICampaignStatus(campaign.status);
  const campaignType = mapOpenAPICampaignType(campaign.campaignType);
  
  // Map current backend status to UI phase and status concepts
  const currentPhase = mapStatusToPhase(campaignStatus, campaignType);
  const phaseStatus = mapStatusToPhaseStatus(campaignStatus);
  
  return {
    // Core fields - using OpenAPI types directly
    id: campaignId,
    name: campaign.name || '',
    campaignType: campaignType,
    status: campaignStatus,
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
    metadata: {} as Record<string, never>, // OpenAPI uses empty object
    estimatedCompletionAt: campaign.estimatedCompletionAt,
    avgProcessingRate: campaign.avgProcessingRate,
    lastHeartbeatAt: campaign.lastHeartbeatAt,
    
    // UI compatibility fields
    selectedType: campaignType,
    currentPhase,
    phaseStatus,
    progress: campaign.progressPercentage || 0,
    
    // Use actual count values from backend (these are numbers, not arrays)
    domains: campaign.domains || 0,
    dnsValidatedDomains: campaign.dnsValidatedDomains || 0,
    // httpValidatedDomains: 0, // Not available in backend yet - this property doesn't exist in the OpenAPI schema
    // extractedContent: [], // UI-only field for now - this property doesn't exist in the OpenAPI schema
    leads: campaign.leads || 0,
    
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

/**
 * Map backend CampaignStatus to UI phase concept
 */
function mapStatusToPhase(status: CampaignStatus, campaignType: CampaignType): CampaignPhase {
  switch (status) {
    case 'pending':
      return "setup";
    case 'queued':
      return "setup";
    case 'running':
      // Map to appropriate phase based on campaign type
      switch (campaignType) {
        case 'domain_generation':
          return 'generation';
        case 'dns_validation':
          return 'dns_validation';
        case 'http_keyword_validation':
          return 'http_validation';
        default:
          return 'generation';
      }
    case 'pausing':
      return mapStatusToPhase('running', campaignType); // Same phase as running
    case 'paused':
      return mapStatusToPhase('running', campaignType); // Same phase as running
    case 'completed':
      return "cleanup";
    case 'failed':
      return mapStatusToPhase('running', campaignType); // Show which phase failed
    case 'archived':
      return "cleanup";
    case 'cancelled':
      return "cleanup";
    default:
      return "setup";
  }
}

/**
 * Map backend CampaignStatus to UI phase status concept
 */
function mapStatusToPhaseStatus(status: CampaignStatus): CampaignPhaseStatus {
  switch (status) {
    case 'pending':
      return 'not_started';
    case 'queued':
      return 'not_started';
    case 'running':
      return "in_progress";
    case 'pausing':
      return "in_progress";
    case 'paused':
      return 'paused';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    case 'archived':
      return 'completed';
    case 'cancelled':
      return 'failed';
    default:
      return 'not_started';
  }
}

/**
 * Extract UI-specific fields from CampaignViewModel back to Campaign
 * Useful when sending data back to the API
 */
export function extractCampaignFromViewModel(viewModel: CampaignViewModel): OpenAPICampaign {
  return {
    id: viewModel.id || '00000000-0000-0000-0000-000000000000',
    name: viewModel.name || '',
    campaignType: viewModel.campaignType || 'domain_generation',
    status: viewModel.status || 'Pending',
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
    metadata: viewModel.metadata as Record<string, never>,
    estimatedCompletionAt: viewModel.estimatedCompletionAt,
    avgProcessingRate: viewModel.avgProcessingRate,
    lastHeartbeatAt: viewModel.lastHeartbeatAt
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
    updatedViewModel.progress = apiUpdate.progressPercentage;
  }
  if (apiUpdate.errorMessage !== undefined) {
    updatedViewModel.errorMessage = apiUpdate.errorMessage;
  }
  if (apiUpdate.avgProcessingRate !== undefined) {
    updatedViewModel.avgProcessingRate = apiUpdate.avgProcessingRate;
  }
  if (apiUpdate.metadata !== undefined) {
    updatedViewModel.metadata = {} as Record<string, never>; // OpenAPI uses empty object
  }
  
  // Update OpenAPI fields directly (no more branded types)
  if (apiUpdate.id) {
    updatedViewModel.id = apiUpdate.id;
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
  
  // Re-derive UI fields from updated API data if status or type changed
  if (apiUpdate.status || apiUpdate.campaignType) {
    const newStatus = mapOpenAPICampaignStatus(apiUpdate.status) || viewModel.status;
    const newType = mapOpenAPICampaignType(apiUpdate.campaignType) || viewModel.campaignType;
    
    updatedViewModel.status = newStatus;
    updatedViewModel.campaignType = newType;
    updatedViewModel.currentPhase = mapStatusToPhase(newStatus || '', newType || '');
    updatedViewModel.phaseStatus = mapStatusToPhaseStatus(newStatus || '');
    updatedViewModel.selectedType = newType;
  }
  
  return updatedViewModel;
}
