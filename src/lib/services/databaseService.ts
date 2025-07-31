// Database service using auto-generated API clients
import { databaseApi } from '@/lib/api-client/client';
import { extractResponseData } from '@/lib/utils/apiResponseHelpers';
import type { UUID } from '@/lib/api-client/uuid-types';
import type {
  BulkDatabaseQueryRequest,
  BulkDatabaseQueryResponse,
  BulkDatabaseStatsRequest,
  BulkDatabaseStatsResponse,
  DatabaseQuery,
  DatabaseQueryResult,
  DatabaseStats
} from '@/lib/api-client/models';

// Use auto-generated types for consistency with backend
export type QueryResult = DatabaseQueryResult;
export { DatabaseStats };

export async function query(sql: string): Promise<QueryResult> {
  try {
    // Convert single query to bulk format
    const queryId = `query_${Date.now()}`;
    const bulkRequest: BulkDatabaseQueryRequest = {
      queries: [{
        id: queryId as UUID,
        sql: sql
      }],
      timeout: 30000, // 30 second timeout
      limit: 1000 // Max 1000 rows for single queries
    };

    const response = await databaseApi.handleBulkDatabaseQuery('XMLHttpRequest', bulkRequest);
    const bulkResponse = extractResponseData<BulkDatabaseQueryResponse>(response);
    
    if (!bulkResponse) {
      throw new Error('No response data received from database API');
    }
    
    // Extract single result from bulk response
    const queryResult = bulkResponse.results?.[queryId];
    if (!queryResult) {
      throw new Error('No query result found in response');
    }
    
    if (!queryResult.success) {
      throw new Error(`Database query failed: ${queryResult.error || 'Unknown error'}`);
    }
    
    // Return the auto-generated type directly, but ensure proper type handling
    return {
      columns: queryResult.columns || [],
      rows: queryResult.rows || [],
      rowCount: queryResult.rowCount || 0,
      executionTime: queryResult.executionTime || 0,
      success: queryResult.success || false,
      error: queryResult.error || undefined
    };
  } catch (error) {
    throw new Error(`Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getStats(): Promise<DatabaseStats> {
  try {
    // Use bulk stats API for single stats request
    const bulkRequest: BulkDatabaseStatsRequest = {
      detailed: false // Basic stats only for single request
    };

    const response = await databaseApi.handleBulkDatabaseStats('XMLHttpRequest', bulkRequest);
    const bulkResponse = extractResponseData<BulkDatabaseStatsResponse>(response);
    
    if (!bulkResponse) {
      throw new Error('No response data received from database stats API');
    }
    
    // Extract database stats from bulk response
    const dbStats = bulkResponse.databaseStats;
    if (!dbStats) {
      throw new Error('No database stats found in response');
    }
    
    // Return the auto-generated type directly
    return dbStats;
  } catch (error) {
    throw new Error(`Database stats failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Server-side utilities - now implemented with OpenAPI clients
export async function queryBackend(sql: string, _cookies?: string): Promise<QueryResult> {
  // Server-side can use the same auto-generated client
  return await query(sql);
}

export async function getStatsBackend(_cookies?: string): Promise<DatabaseStats> {
  // Server-side can use the same auto-generated client
  return await getStats();
}

// Enterprise bulk operations - expose the underlying bulk APIs
export async function bulkQuery(queries: DatabaseQuery[], options?: {
  timeout?: number;
  limit?: number;
}): Promise<BulkDatabaseQueryResponse> {
  const bulkRequest: BulkDatabaseQueryRequest = {
    queries,
    timeout: options?.timeout || 30000,
    limit: options?.limit || 1000
  };
  
  const response = await databaseApi.handleBulkDatabaseQuery('XMLHttpRequest', bulkRequest);
  return extractResponseData<BulkDatabaseQueryResponse>(response)!;
}

export async function bulkStats(options?: {
  detailed?: boolean;
  schemas?: string[];
  tables?: string[];
}): Promise<BulkDatabaseStatsResponse> {
  const bulkRequest: BulkDatabaseStatsRequest = {
    detailed: options?.detailed || false,
    schemas: options?.schemas,
    tables: options?.tables
  };
  
  const response = await databaseApi.handleBulkDatabaseStats('XMLHttpRequest', bulkRequest);
  return extractResponseData<BulkDatabaseStatsResponse>(response)!;
}

const databaseService = { 
  query, 
  getStats, 
  queryBackend, 
  getStatsBackend,
  bulkQuery,
  bulkStats
};
export default databaseService;
