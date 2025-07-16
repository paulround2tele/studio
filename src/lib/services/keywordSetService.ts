// src/lib/services/keywordSetService.ts
// Keyword Set Service - Direct OpenAPI integration for keyword set management

import { KeywordSetsApi, Configuration } from '@/lib/api-client';
import type { components } from '@/lib/api-client/types';
import { getApiBaseUrlSync } from '@/lib/config/environment';
import {
  safeApiCall
} from '@/lib/utils/apiResponseHelpers';

// Create configured KeywordSetsApi instance with authentication
const config = new Configuration({
  basePath: getApiBaseUrlSync(),
  baseOptions: {
    withCredentials: true
  }
});
const keywordSetsApi = new KeywordSetsApi(config);

// Use OpenAPI types directly
export type KeywordSet = components['schemas']['KeywordSet'];
export type CreateKeywordSetRequest = components['schemas']['CreateKeywordSetRequest'];
export type UpdateKeywordSetRequest = components['schemas']['UpdateKeywordSetRequest'];

// Service layer response wrappers aligned with unified backend envelope format
export interface KeywordSetListResponse {
  success: boolean;
  data: KeywordSet[];
  error: string | null;
  requestId: string;
  message?: string;
}

export interface KeywordSetDetailResponse {
  success: boolean;
  data?: KeywordSet;
  error: string | null;
  requestId: string;
  message?: string;
}

export interface KeywordSetCreationResponse {
  success: boolean;
  data?: KeywordSet;
  error: string | null;
  requestId: string;
  message?: string;
}

export interface KeywordSetUpdateResponse {
  success: boolean;
  data?: KeywordSet;
  error: string | null;
  requestId: string;
  message?: string;
}

export interface KeywordSetDeleteResponse {
  success: boolean;
  data?: null;
  error: string | null;
  requestId: string;
  message?: string;
}

class KeywordSetService {
  private static instance: KeywordSetService;

  static getInstance(): KeywordSetService {
    if (!KeywordSetService.instance) {
      KeywordSetService.instance = new KeywordSetService();
    }
    return KeywordSetService.instance;
  }

  async getKeywordSets(options?: {
    limit?: number;
    offset?: number;
    isEnabled?: boolean;
  }): Promise<KeywordSetListResponse> {
    const result = await safeApiCall<KeywordSet[]>(
      () => keywordSetsApi.listKeywordSets(
        options?.limit || 100,
        options?.offset,
        options?.isEnabled
      ),
      'Getting keyword sets'
    );
    
    return {
      success: result.success,
      data: result.data || [],
      error: result.error,
      requestId: result.requestId,
      message: result.success ? 'Keyword sets retrieved successfully' : result.error || 'Failed to get keyword sets'
    };
  }

  async getKeywordSetById(keywordSetId: string): Promise<KeywordSetDetailResponse> {
    const result = await safeApiCall<KeywordSet>(
      () => keywordSetsApi.getKeywordSet(keywordSetId),
      'Getting keyword set by ID'
    );
    
    return {
      success: result.success,
      data: result.data,
      error: result.error,
      requestId: result.requestId,
      message: result.success ? 'Keyword set retrieved successfully' : result.error || 'Failed to get keyword set'
    };
  }

  async createKeywordSet(payload: CreateKeywordSetRequest): Promise<KeywordSetCreationResponse> {
    const result = await safeApiCall<KeywordSet>(
      () => keywordSetsApi.createKeywordSet(payload),
      'Creating keyword set'
    );
    
    return {
      success: result.success,
      data: result.data,
      error: result.error,
      requestId: result.requestId,
      message: result.success ? 'Keyword set created successfully' : result.error || 'Failed to create keyword set'
    };
  }

  async updateKeywordSet(keywordSetId: string, payload: UpdateKeywordSetRequest): Promise<KeywordSetUpdateResponse> {
    const result = await safeApiCall<KeywordSet>(
      () => keywordSetsApi.updateKeywordSet(keywordSetId, payload),
      'Updating keyword set'
    );
    
    return {
      success: result.success,
      data: result.data,
      error: result.error,
      requestId: result.requestId,
      message: result.success ? 'Keyword set updated successfully' : result.error || 'Failed to update keyword set'
    };
  }

  async deleteKeywordSet(keywordSetId: string): Promise<KeywordSetDeleteResponse> {
    const result = await safeApiCall<null>(
      () => keywordSetsApi.deleteKeywordSet(keywordSetId),
      'Deleting keyword set'
    );
    
    return {
      success: result.success,
      data: null,
      error: result.error,
      requestId: result.requestId,
      message: result.success ? 'Keyword set deleted successfully' : result.error || 'Failed to delete keyword set'
    };
  }

  // Note: Keyword management methods would be added when the backend API is implemented
  // For now, keyword sets can be managed through the update method
}

// Export singleton and functions
export const keywordSetService = KeywordSetService.getInstance();

export const getKeywordSets = (options?: Parameters<typeof keywordSetService.getKeywordSets>[0]) =>
  keywordSetService.getKeywordSets(options);
export const getKeywordSetById = (keywordSetId: string) =>
  keywordSetService.getKeywordSetById(keywordSetId);
export const createKeywordSet = (payload: CreateKeywordSetRequest) =>
  keywordSetService.createKeywordSet(payload);
export const updateKeywordSet = (keywordSetId: string, payload: UpdateKeywordSetRequest) =>
  keywordSetService.updateKeywordSet(keywordSetId, payload);
export const deleteKeywordSet = (keywordSetId: string) =>
  keywordSetService.deleteKeywordSet(keywordSetId);

// Backward compatibility aliases
export const listKeywordSets = getKeywordSets;
export const getKeywordSet = getKeywordSetById;

export default keywordSetService;