// src/lib/services/keywordSetService.ts
// Production Keyword Set Service - Direct OpenAPI integration without adapters

import { apiClient, type components } from '@/lib/api-client/client';

// Use OpenAPI types directly
export type KeywordSet = components['schemas']['KeywordSetResponse'];
export type CreateKeywordSetPayload = components['schemas']['CreateKeywordSetRequest'];
export type UpdateKeywordSetPayload = components['schemas']['UpdateKeywordSetRequest'];

// OpenAPI response types
export interface KeywordSetListResponse {
  status: 'success' | 'error';
  data: KeywordSet[];
  message?: string;
}

export interface KeywordSetDetailResponse {
  status: 'success' | 'error';
  data?: KeywordSet;
  message?: string;
}

export interface KeywordSetCreationResponse {
  status: 'success' | 'error';
  data?: KeywordSet;
  message?: string;
}

export interface KeywordSetUpdateResponse {
  status: 'success' | 'error';
  data?: KeywordSet;
  message?: string;
}

export interface KeywordSetDeleteResponse {
  status: 'success' | 'error';
  data?: null;
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

  async listKeywordSets(params?: { limit?: number; offset?: number; isEnabled?: boolean }): Promise<KeywordSetListResponse> {
    try {
      const result = await apiClient.listKeywordSets(params);
      return {
        status: 'success',
        data: result as KeywordSet[],
        message: 'Keyword sets retrieved successfully'
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        data: []
      };
    }
  }

  async getKeywordSetById(setId: string): Promise<KeywordSetDetailResponse> {
    try {
      const result = await apiClient.getKeywordSetById(setId);
      return {
        status: 'success',
        data: result as KeywordSet,
        message: 'Keyword set retrieved successfully'
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async createKeywordSet(payload: CreateKeywordSetPayload): Promise<KeywordSetCreationResponse> {
    try {
      const result = await apiClient.createKeywordSet(payload);
      return {
        status: 'success',
        data: result as KeywordSet,
        message: 'Keyword set created successfully'
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updateKeywordSet(setId: string, payload: UpdateKeywordSetPayload): Promise<KeywordSetUpdateResponse> {
    try {
      const result = await apiClient.updateKeywordSet(setId, payload);
      return {
        status: 'success',
        data: result as KeywordSet,
        message: 'Keyword set updated successfully'
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deleteKeywordSet(setId: string): Promise<KeywordSetDeleteResponse> {
    try {
      await apiClient.deleteKeywordSet(setId);
      return {
        status: 'success',
        data: null,
        message: 'Keyword set deleted successfully'
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton and functions
export const keywordSetService = KeywordSetService.getInstance();

export const listKeywordSets = (params?: Parameters<typeof keywordSetService.listKeywordSets>[0]) => 
  keywordSetService.listKeywordSets(params);
export const getKeywordSetById = (setId: string) => keywordSetService.getKeywordSetById(setId);
export const createKeywordSet = (payload: CreateKeywordSetPayload) => keywordSetService.createKeywordSet(payload);
export const updateKeywordSet = (setId: string, payload: UpdateKeywordSetPayload) => 
  keywordSetService.updateKeywordSet(setId, payload);
export const deleteKeywordSet = (setId: string) => keywordSetService.deleteKeywordSet(setId);

export default keywordSetService;
