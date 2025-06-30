/**
 * Campaign API Response Transformers
 * Handles conversion of API responses to use OpenAPI types (number for int64 fields)
 */

import type { ModelsCampaignAPI } from '@/lib/api-client/models/models-campaign-api';

/**
 * Campaign API model with properly typed fields
 */
export interface CampaignAPIAligned {
    avgProcessingRate?: number;
    campaignType?: string;
    completedAt?: string;
    createdAt?: string;
    errorMessage?: string;
    estimatedCompletionAt?: string;
    failedItems?: number;
    id?: string;
    lastHeartbeatAt?: string;
    metadata?: Record<string, unknown>;
    name?: string;
    processedItems?: number;
    progressPercentage?: number;
    startedAt?: string;
    status?: string;
    successfulItems?: number;
    totalItems?: number;
    updatedAt?: string;
    userId?: string;
}

/**
 * Transform raw campaign API response to aligned model with number conversion
 */
export function transformCampaignResponse(raw: ModelsCampaignAPI | undefined | null): CampaignAPIAligned {
    if (!raw) {
        return {};
    }
    
    return {
        avgProcessingRate: raw.avgProcessingRate,
        campaignType: raw.campaignType,
        completedAt: raw.completedAt || undefined,
        createdAt: raw.createdAt || undefined,
        errorMessage: raw.errorMessage,
        estimatedCompletionAt: raw.estimatedCompletionAt || undefined,
        failedItems: raw.failedItems != null ? Number(raw.failedItems) : undefined,
        id: raw.id || undefined,
        lastHeartbeatAt: raw.lastHeartbeatAt || undefined,
        metadata: raw.metadata as Record<string, unknown>,
        name: raw.name,
        processedItems: raw.processedItems != null ? Number(raw.processedItems) : undefined,
        progressPercentage: raw.progressPercentage,
        startedAt: raw.startedAt || undefined,
        status: raw.status,
        successfulItems: raw.successfulItems != null ? Number(raw.successfulItems) : undefined,
        totalItems: raw.totalItems != null ? Number(raw.totalItems) : undefined,
        updatedAt: raw.updatedAt || undefined,
        userId: raw.userId || undefined,
    };
}

/**
 * Transform array of campaign responses
 */
export function transformCampaignArrayResponse(raw: ModelsCampaignAPI[] | undefined | null): CampaignAPIAligned[] {
    if (!raw || !Array.isArray(raw)) {
        return [];
    }
    
    return raw.map(transformCampaignResponse);
}

/**
 * Transform campaign request data (reverse transformation for API calls)
 */
export function transformCampaignRequestData(data: Partial<CampaignAPIAligned>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    
    // Copy all fields - no special handling needed since we use plain types
    if (data.avgProcessingRate !== undefined) result.avgProcessingRate = data.avgProcessingRate;
    if (data.campaignType !== undefined) result.campaignType = data.campaignType;
    if (data.errorMessage !== undefined) result.errorMessage = data.errorMessage;
    if (data.metadata !== undefined) result.metadata = data.metadata;
    if (data.name !== undefined) result.name = data.name;
    if (data.progressPercentage !== undefined) result.progressPercentage = data.progressPercentage;
    if (data.status !== undefined) result.status = data.status;
    if (data.completedAt !== undefined) result.completedAt = data.completedAt;
    if (data.createdAt !== undefined) result.createdAt = data.createdAt;
    if (data.estimatedCompletionAt !== undefined) result.estimatedCompletionAt = data.estimatedCompletionAt;
    if (data.failedItems !== undefined) result.failedItems = data.failedItems;
    if (data.id !== undefined) result.id = data.id;
    if (data.lastHeartbeatAt !== undefined) result.lastHeartbeatAt = data.lastHeartbeatAt;
    if (data.processedItems !== undefined) result.processedItems = data.processedItems;
    if (data.startedAt !== undefined) result.startedAt = data.startedAt;
    if (data.successfulItems !== undefined) result.successfulItems = data.successfulItems;
    if (data.totalItems !== undefined) result.totalItems = data.totalItems;
    if (data.updatedAt !== undefined) result.updatedAt = data.updatedAt;
    if (data.userId !== undefined) result.userId = data.userId;
    
    return result;
}