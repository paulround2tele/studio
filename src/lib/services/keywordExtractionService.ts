// src/lib/services/keywordExtractionService.ts
// Keyword Extraction Service - Using auto-generated OpenAPI clients

import { extractResponseData } from '@/lib/utils/apiResponseHelpers';
import { keywordExtractionApi } from '@/lib/api-client/client';

// Define types based on actual backend implementation
export interface KeywordExtractionRequestItem {
  url: string;
  keywordSetId: string;
  httpPersonaId?: string;
  dnsPersonaId?: string;
}

export interface BatchKeywordExtractionRequest {
  items: KeywordExtractionRequestItem[];
}

export interface KeywordExtractionAPIResult {
  url: string;
  keywordSetIdUsed: string;
  finalUrl?: string;
  statusCode?: number;
  httpPersonaIdUsed?: string;
  dnsPersonaIdUsed?: string;
  proxyIdUsed?: string;
  matches?: any[];
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
        requestId: globalThis.crypto?.randomUUID?.() || `extractKeywordsBatch-${Date.now()}`,
        message: 'Successfully extracted keywords in batch'
      };
    } catch (error: any) {
      return {
        success: false,
        data: undefined,
        error: error.message,
        requestId: globalThis.crypto?.randomUUID?.() || `extractKeywordsBatch-error-${Date.now()}`,
        message: error.message
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
        requestId: globalThis.crypto?.randomUUID?.() || `streamKeywordExtraction-${Date.now()}`,
        message: 'Successfully completed stream keyword extraction'
      };
    } catch (error: any) {
      return {
        success: false,
        data: undefined,
        error: error.message,
        requestId: globalThis.crypto?.randomUUID?.() || `streamKeywordExtraction-error-${Date.now()}`,
        message: error.message
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