// src/lib/services/keywordSetService.ts
// Keyword Set Service - Direct OpenAPI integration for keyword set management

import type { components } from '@/lib/api-client/types';
import { keywordSetsApi } from '@/lib/api-client/client';
import { extractResponseData } from '@/lib/utils/apiResponseHelpers';

// Use OpenAPI types directly
export type KeywordSet = components['schemas']['KeywordSet'];
export type CreateKeywordSetRequest = components['schemas']['CreateKeywordSetRequest'];
export type UpdateKeywordSetRequest = components['schemas']['UpdateKeywordSetRequest'];

// Import unified API response wrapper
import type { ApiResponse } from '@/lib/types';

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
  }): Promise<ApiResponse<KeywordSet[]>> {
    try {
      const axiosResponse = await keywordSetsApi.listKeywordSets(
        options?.limit,
        options?.offset,
        options?.isEnabled
      );
      const keywordSets = extractResponseData<KeywordSet[]>(axiosResponse);
      const requestId = globalThis.crypto?.randomUUID?.() || `keyword-sets-${Date.now()}`;
      
      return {
        success: true,
        data: keywordSets || [],
        error: null,
        requestId,
        message: 'Keyword sets retrieved successfully'
      };
    } catch (error: any) {
      console.error('[KeywordSetService] Error fetching keyword sets:', error);
      return {
        success: false,
        data: [],
        error: error.message || 'Failed to get keyword sets',
        requestId: globalThis.crypto?.randomUUID?.() || `error-${Date.now()}`,
        message: error.message || 'Failed to get keyword sets'
      };
    }
  }

  async getKeywordSetById(keywordSetId: string): Promise<ApiResponse<KeywordSet>> {
    try {
      const axiosResponse = await keywordSetsApi.getKeywordSet(keywordSetId);
      const keywordSet = extractResponseData<KeywordSet>(axiosResponse);
      const requestId = globalThis.crypto?.randomUUID?.() || `keyword-set-${Date.now()}`;
      
      return {
        success: true,
        data: keywordSet || undefined,
        error: null,
        requestId,
        message: 'Keyword set retrieved successfully'
      };
    } catch (error: any) {
      console.error('[KeywordSetService] Error fetching keyword set by ID:', error);
      return {
        success: false,
        data: undefined,
        error: error.message || 'Failed to get keyword set',
        requestId: globalThis.crypto?.randomUUID?.() || `error-${Date.now()}`,
        message: error.message || 'Failed to get keyword set'
      };
    }
  }

  async createKeywordSet(payload: CreateKeywordSetRequest): Promise<ApiResponse<KeywordSet>> {
    try {
      const axiosResponse = await keywordSetsApi.createKeywordSet(payload);
      const keywordSet = extractResponseData<KeywordSet>(axiosResponse);
      const requestId = globalThis.crypto?.randomUUID?.() || `create-keyword-set-${Date.now()}`;
      
      return {
        success: true,
        data: keywordSet || undefined,
        error: null,
        requestId,
        message: 'Keyword set created successfully'
      };
    } catch (error: any) {
      console.error('[KeywordSetService] Error creating keyword set:', error);
      return {
        success: false,
        data: undefined,
        error: error.message || 'Failed to create keyword set',
        requestId: globalThis.crypto?.randomUUID?.() || `error-${Date.now()}`,
        message: error.message || 'Failed to create keyword set'
      };
    }
  }

  async updateKeywordSet(keywordSetId: string, payload: UpdateKeywordSetRequest): Promise<ApiResponse<KeywordSet>> {
    try {
      const axiosResponse = await keywordSetsApi.updateKeywordSet(keywordSetId, payload);
      const keywordSet = extractResponseData<KeywordSet>(axiosResponse);
      const requestId = globalThis.crypto?.randomUUID?.() || `update-keyword-set-${Date.now()}`;
      
      return {
        success: true,
        data: keywordSet || undefined,
        error: null,
        requestId,
        message: 'Keyword set updated successfully'
      };
    } catch (error: any) {
      console.error('[KeywordSetService] Error updating keyword set:', error);
      return {
        success: false,
        data: undefined,
        error: error.message || 'Failed to update keyword set',
        requestId: globalThis.crypto?.randomUUID?.() || `error-${Date.now()}`,
        message: error.message || 'Failed to update keyword set'
      };
    }
  }

  async deleteKeywordSet(keywordSetId: string): Promise<ApiResponse<null>> {
    try {
      const axiosResponse = await keywordSetsApi.deleteKeywordSet(keywordSetId);
      extractResponseData<null>(axiosResponse);
      const requestId = globalThis.crypto?.randomUUID?.() || `delete-keyword-set-${Date.now()}`;
      
      return {
        success: true,
        data: null,
        error: null,
        requestId,
        message: 'Keyword set deleted successfully'
      };
    } catch (error: any) {
      console.error('[KeywordSetService] Error deleting keyword set:', error);
      return {
        success: false,
        data: null,
        error: error.message || 'Failed to delete keyword set',
        requestId: globalThis.crypto?.randomUUID?.() || `error-${Date.now()}`,
        message: error.message || 'Failed to delete keyword set'
      };
    }
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