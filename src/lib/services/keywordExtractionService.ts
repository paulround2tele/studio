// src/lib/services/keywordExtractionService.ts
// Keyword Extraction Service - Using auto-generated OpenAPI clients

import { extractResponseData } from '@/lib/utils/apiResponseHelpers';
import { keywordExtractionApi } from '@/lib/api-client/client';

// Import and re-export the generated API client types
import type {
  KeywordExtractionRequestItem as APIKeywordExtractionRequestItem,
  BatchKeywordExtractionRequest as APIBatchKeywordExtractionRequest
} from '@/lib/api-client/models';

// Use the generated API client types directly
export type KeywordExtractionRequestItem = APIKeywordExtractionRequestItem;

export type BatchKeywordExtractionRequest = APIBatchKeywordExtractionRequest;

export interface KeywordExtractionAPIResult {
  url: string;
  keywordSetIdUsed: string;
  finalUrl?: string;
  statusCode?: number;
  httpPersonaIdUsed?: string;
  dnsPersonaIdUsed?: string;
  proxyIdUsed?: string;
  matches?: Record<string, unknown>[];
  error?: string;
}

export interface KeywordExtractionResponse {
  results: KeywordExtractionAPIResult[];
}

// Import unified API response wrapper
import type { ApiResponse } from '@/lib/types';

class KeywordExtractionService {
  private static instance: KeywordExtractionService;

  static getInstance(): KeywordExtractionService {
    if (!KeywordExtractionService.instance) {
      KeywordExtractionService.instance = new KeywordExtractionService();
    }
    return KeywordExtractionService.instance;
  }

  async extractKeywordsBatch(request: BatchKeywordExtractionRequest): Promise<ApiResponse<KeywordExtractionResponse>> {
    try {
      const axiosResponse = await keywordExtractionApi.batchExtractKeywords(request);
      const data = extractResponseData<KeywordExtractionResponse>(axiosResponse);
      return {
        success: true,
        data: data || undefined,
        error: null,
        requestId: globalThis.crypto?.randomUUID?.() || `extractKeywordsBatch-${Date.now()}`
      };
    } catch (error: unknown) {
      return {
        success: false,
        data: undefined,
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: globalThis.crypto?.randomUUID?.() || `extractKeywordsBatch-error-${Date.now()}`
      };
    }
  }

  async streamKeywordExtraction(params: {
    url: string;
    keywordSetId: string;
    httpPersonaId?: string;
    dnsPersonaId?: string;
  }): Promise<ApiResponse<KeywordExtractionResponse>> {
    try {
      const axiosResponse = await keywordExtractionApi.streamExtractKeywords(
        params.url,
        params.keywordSetId,
        params.httpPersonaId,
        params.dnsPersonaId
      );
      const data = extractResponseData<KeywordExtractionResponse>(axiosResponse);
      return {
        success: true,
        data: data || undefined,
        error: null,
        requestId: globalThis.crypto?.randomUUID?.() || `streamKeywordExtraction-${Date.now()}`
      };
    } catch (error: unknown) {
      return {
        success: false,
        data: undefined,
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: globalThis.crypto?.randomUUID?.() || `streamKeywordExtraction-error-${Date.now()}`
      };
    }
  }

  // Single keyword extraction using batch with one item
  async extractKeywords(item: KeywordExtractionRequestItem): Promise<ApiResponse<KeywordExtractionResponse>> {
    const batchRequest: BatchKeywordExtractionRequest = {
      items: [item]
    };
    
    return await this.extractKeywordsBatch(batchRequest);
  }
}

// Export singleton and functions
export const keywordExtractionService = KeywordExtractionService.getInstance();

export const extractKeywords = (item: KeywordExtractionRequestItem) => 
  keywordExtractionService.extractKeywords(item);
export const extractKeywordsBatch = (request: BatchKeywordExtractionRequest) => 
  keywordExtractionService.extractKeywordsBatch(request);
export const streamKeywordExtraction = (params: Parameters<typeof keywordExtractionService.streamKeywordExtraction>[0]) => 
  keywordExtractionService.streamKeywordExtraction(params);

// Backward compatibility aliases
export const extractKeywordsFromText = extractKeywords;
export const batchExtractKeywords = extractKeywordsBatch;

export default keywordExtractionService;