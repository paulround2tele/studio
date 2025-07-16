// src/lib/services/keywordExtractionService.ts
// Keyword Extraction Service - Direct OpenAPI integration for keyword extraction operations

import { KeywordExtractionApi, Configuration } from '@/lib/api-client';
import { getApiBaseUrlSync } from '@/lib/config/environment';
import {
  safeApiCall
} from '@/lib/utils/apiResponseHelpers';

// Create configured KeywordExtractionApi instance with authentication
const config = new Configuration({
  basePath: getApiBaseUrlSync(),
  baseOptions: {
    withCredentials: true
  }
});
const keywordExtractionApi = new KeywordExtractionApi(config);

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

// Service layer response wrappers aligned with unified backend envelope format
export interface KeywordExtractionServiceResponse {
  success: boolean;
  data?: KeywordExtractionResponse;
  error: string | null;
  requestId: string;
  message?: string;
}

export interface BatchKeywordExtractionServiceResponse {
  success: boolean;
  data?: KeywordExtractionResponse;
  error: string | null;
  requestId: string;
  message?: string;
}

class KeywordExtractionService {
  private static instance: KeywordExtractionService;

  static getInstance(): KeywordExtractionService {
    if (!KeywordExtractionService.instance) {
      KeywordExtractionService.instance = new KeywordExtractionService();
    }
    return KeywordExtractionService.instance;
  }

  async extractKeywordsBatch(request: BatchKeywordExtractionRequest): Promise<BatchKeywordExtractionServiceResponse> {
    return await safeApiCall<KeywordExtractionResponse>(
      () => keywordExtractionApi.batchExtractKeywords(request),
      'Extracting keywords in batch'
    );
  }

  async streamKeywordExtraction(params: {
    url: string;
    keywordSetId: string;
    httpPersonaId?: string;
    dnsPersonaId?: string;
  }): Promise<KeywordExtractionServiceResponse> {
    // Note: This is a streaming endpoint that returns Server-Sent Events
    // The actual implementation would need to handle SSE streams
    return await safeApiCall<KeywordExtractionResponse>(
      async () => {
        const baseUrl = getApiBaseUrlSync();
        const response = await fetch(`${baseUrl}/keyword-extraction/stream?` +
          new URLSearchParams({
            url: params.url,
            keywordSetId: params.keywordSetId,
            ...(params.httpPersonaId && { httpPersonaId: params.httpPersonaId }),
            ...(params.dnsPersonaId && { dnsPersonaId: params.dnsPersonaId })
          }), {
          method: 'GET',
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // For now, return success - actual streaming would need special handling
        return { data: { results: [] } };
      },
      'Stream keyword extraction'
    );
  }

  // Single keyword extraction using batch with one item
  async extractKeywords(item: KeywordExtractionRequestItem): Promise<KeywordExtractionServiceResponse> {
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