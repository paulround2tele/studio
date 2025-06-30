/* tslint:disable */
/* eslint-disable */
/**
 * DomainFlow API - ALIGNED VERSION
 * This file contains properly aligned types with OpenAPI compatible number types for int64 fields
 */

import type { ModelsCampaignStatusEnum } from './models-campaign-status-enum';
import type { ModelsCampaignTypeEnum } from './models-campaign-type-enum';
// Using OpenAPI compatible types instead of branded types

/**
 * Aligned Campaign API model with OpenAPI compatible types
 * @export
 * @interface ModelsCampaignAPIAligned
 */
export interface ModelsCampaignAPIAligned {
    'avgProcessingRate'?: number;
    'campaignType'?: ModelsCampaignTypeEnum;
    'completedAt'?: string;
    'createdAt'?: string;
    'errorMessage'?: string;
    'estimatedCompletionAt'?: string;
    'failedItems'?: number; // OpenAPI compatible
    'id'?: string;
    'lastHeartbeatAt'?: string;
    'businessStatus'?: string;
    'metadata'?: object;
    'name'?: string;
    'processedItems'?: number; // OpenAPI compatible
    'progressPercentage'?: number;
    'startedAt'?: string;
    'status'?: ModelsCampaignStatusEnum;
    'successfulItems'?: number; // OpenAPI compatible
    'totalItems'?: number; // OpenAPI compatible
    'updatedAt'?: string;
    'userId'?: string;
}

/**
 * Transform raw API response to aligned model with OpenAPI compatible number conversion
 */
export function transformToCampaignAPIAligned(raw: any): ModelsCampaignAPIAligned {
    return {
        ...raw,
        failedItems: raw.failedItems != null ? Number(raw.failedItems) : undefined,
        processedItems: raw.processedItems != null ? Number(raw.processedItems) : undefined,
        successfulItems: raw.successfulItems != null ? Number(raw.successfulItems) : undefined,
        totalItems: raw.totalItems != null ? Number(raw.totalItems) : undefined,
    };
}