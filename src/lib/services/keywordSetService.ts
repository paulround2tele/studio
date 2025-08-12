// src/lib/services/keywordSetService.professional.ts
// ✅ PROFESSIONAL KEYWORD SET SERVICE - Reality-Based Implementation
// Uses ONLY actual generated API methods and types - NO AMATEUR PATTERNS

import { keywordSetsApi } from '@/lib/api-client/client';
import type { 
  ApiKeywordSetResponse as KeywordSet,
  ApiCreateKeywordSetRequest as CreateKeywordSetRequest,
  ApiUpdateKeywordSetRequest as UpdateKeywordSetRequest,
  ApiKeywordSetDeleteResponse as DeleteResponse
} from '@/lib/api-client/models';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();

// ===========================================================================================
// PROFESSIONAL SERVICE INTERFACE - Clean, type-safe, reality-based
// ===========================================================================================

interface KeywordSetServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Professional Keyword Set Service
 * Uses ACTUAL generated API methods - no fantasy method names
 * Uses ACTUAL generated types - no schema path assumptions
 * Clean error handling - no amateur unified response wrappers
 */
class KeywordSetService {
  private static instance: KeywordSetService;

  static getInstance(): KeywordSetService {
    if (!KeywordSetService.instance) {
      KeywordSetService.instance = new KeywordSetService();
    }
    return KeywordSetService.instance;
  }

  // ===========================================================================================
  // LIST KEYWORD SETS - Using ACTUAL keywordsSetsGet method
  // ===========================================================================================
  
  async listKeywordSets(options: {
    limit?: number;
    offset?: number;
    includeRules?: boolean;
    isEnabled?: boolean;
  } = {}): Promise<KeywordSetServiceResult<KeywordSet[]>> {
    logger.info('KEYWORDSET_SERVICE', 'Listing keyword sets', options);

    try {
      // ✅ PROFESSIONAL REALITY - Using ACTUAL generated method
      const response = await keywordSetsApi.keywordsSetsGet(
        options.limit,
        options.offset,
        options.includeRules,
        options.isEnabled
      );
      
      // ✅ PROFESSIONAL TYPE HANDLING - Trust the generator
      const keywordSets = response.data || [];
      
      logger.info('KEYWORDSET_SERVICE', 'Keyword sets listed successfully', { 
        count: Array.isArray(keywordSets) ? keywordSets.length : 0
      });

      return {
        success: true,
        data: Array.isArray(keywordSets) ? keywordSets : []
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to list keyword sets';
      logger.error('KEYWORDSET_SERVICE', 'List keyword sets failed', { error: errorMessage });
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // ===========================================================================================
  // GET KEYWORD SET BY ID - Using ACTUAL keywordsSetsSetIdGet method
  // ===========================================================================================
  
  async getKeywordSet(setId: string): Promise<KeywordSetServiceResult<KeywordSet>> {
    logger.info('KEYWORDSET_SERVICE', 'Getting keyword set by ID', { setId });

    try {
      // ✅ PROFESSIONAL REALITY - Using ACTUAL generated method
      const response = await keywordSetsApi.keywordsSetsSetIdGet(setId);
      
      // ✅ PROFESSIONAL TYPE HANDLING - Trust the generator
      const keywordSet = response.data;
      
      logger.info('KEYWORDSET_SERVICE', 'Keyword set retrieved successfully', { 
        setId,
        name: keywordSet?.name 
      });

      return {
        success: true,
        data: keywordSet
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get keyword set';
      logger.error('KEYWORDSET_SERVICE', 'Get keyword set failed', { setId, error: errorMessage });
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // ===========================================================================================
  // CREATE KEYWORD SET - Using ACTUAL keywordsSetsPost method
  // ===========================================================================================
  
  async createKeywordSet(payload: CreateKeywordSetRequest): Promise<KeywordSetServiceResult<KeywordSet>> {
    logger.info('KEYWORDSET_SERVICE', 'Creating keyword set', { name: payload.name });

    try {
      // ✅ PROFESSIONAL REALITY - Using ACTUAL generated method
      const response = await keywordSetsApi.keywordsSetsPost(payload);
      
      // ✅ PROFESSIONAL TYPE HANDLING - Trust the generator
      const keywordSet = response.data;
      
      logger.info('KEYWORDSET_SERVICE', 'Keyword set created successfully', { 
        setId: keywordSet?.id,
        name: keywordSet?.name 
      });

      return {
        success: true,
        data: keywordSet
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create keyword set';
      logger.error('KEYWORDSET_SERVICE', 'Create keyword set failed', { error: errorMessage });
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // ===========================================================================================
  // UPDATE KEYWORD SET - Using ACTUAL keywordsSetsSetIdPut method
  // ===========================================================================================
  
  async updateKeywordSet(setId: string, payload: UpdateKeywordSetRequest): Promise<KeywordSetServiceResult<KeywordSet>> {
    logger.info('KEYWORDSET_SERVICE', 'Updating keyword set', { setId, name: payload.name });

    try {
      // ✅ PROFESSIONAL REALITY - Using ACTUAL generated method
      const response = await keywordSetsApi.keywordsSetsSetIdPut(setId, payload);
      
      // ✅ PROFESSIONAL TYPE HANDLING - Trust the generator
      const keywordSet = response.data;
      
      logger.info('KEYWORDSET_SERVICE', 'Keyword set updated successfully', { 
        setId,
        name: keywordSet?.name 
      });

      return {
        success: true,
        data: keywordSet
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update keyword set';
      logger.error('KEYWORDSET_SERVICE', 'Update keyword set failed', { setId, error: errorMessage });
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // ===========================================================================================
  // DELETE KEYWORD SET - Using ACTUAL keywordsSetsSetIdDelete method
  // ===========================================================================================
  
  async deleteKeywordSet(setId: string): Promise<KeywordSetServiceResult<void>> {
    logger.info('KEYWORDSET_SERVICE', 'Deleting keyword set', { setId });

    try {
      // ✅ PROFESSIONAL REALITY - Using ACTUAL generated method
      await keywordSetsApi.keywordsSetsSetIdDelete(setId);
      
      logger.info('KEYWORDSET_SERVICE', 'Keyword set deleted successfully', { setId });

      return {
        success: true
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete keyword set';
      logger.error('KEYWORDSET_SERVICE', 'Delete keyword set failed', { setId, error: errorMessage });
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }
}

// ===========================================================================================
// PROFESSIONAL EXPORTS
// ===========================================================================================

export { KeywordSetService };
export type { KeywordSetServiceResult };

// Singleton instance for convenience
export const keywordSetService = KeywordSetService.getInstance();

// ===========================================================================================
// PROFESSIONAL USAGE EXAMPLES
// ===========================================================================================

/*
// ✅ PROFESSIONAL SERVICE USAGE
import { keywordSetService } from '@/lib/services/keywordSetService';

// List keyword sets
const listResult = await keywordSetService.listKeywordSets({ 
  limit: 10, 
  includeRules: true 
});

if (listResult.success && listResult.data) {
  console.log('Found keyword sets:', listResult.data.length);
}

// Create keyword set
const createResult = await keywordSetService.createKeywordSet({
  name: 'Test Set',
  description: 'Test keyword set',
  // ... other required fields
});

if (createResult.success && createResult.data) {
  console.log('Keyword set created:', createResult.data.id);
} else {
  console.error('Creation failed:', createResult.error);
}
*/
