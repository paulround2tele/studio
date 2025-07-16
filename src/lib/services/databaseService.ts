// Database service for direct API calls

export interface QueryResult {
  columns: string[];
  rows: (string | number | boolean | null)[][];
  rowCount: number;
  executionTime: number;
}

export interface DatabaseStats {
  totalTables: number;
  totalUsers: number;
  totalSessions: number;
  databaseSize: string;
  schemaVersion: string;
  uptime: string;
  version: string;
  isHealthy: boolean;
}

export async function query(sql: string): Promise<QueryResult> {
  try {
    // Use a direct fetch until database endpoints are added to OpenAPI spec
    const response = await fetch('/api/database/query', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({ sql }),
    });

    if (!response.ok) {
      throw new Error(`Database query failed: ${response.statusText}`);
    }

    const responseData = await response.json();
    
    // Handle unified APIResponse format if backend uses it
    if (responseData.success !== undefined) {
      if (!responseData.success) {
        throw new Error(`Database query failed: ${responseData.error || 'Unknown error'}`);
      }
      return responseData.data;
    }
    
    // Fallback for direct response format
    return responseData;
  } catch (error) {
    throw new Error(`Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getStats(): Promise<DatabaseStats> {
  try {
    // Use a direct fetch until database endpoints are added to OpenAPI spec
    const response = await fetch('/api/database/stats', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    if (!response.ok) {
      throw new Error(`Database stats failed: ${response.statusText}`);
    }

    const responseData = await response.json();
    
    // Handle unified APIResponse format if backend uses it
    if (responseData.success !== undefined) {
      if (!responseData.success) {
        throw new Error(`Database stats failed: ${responseData.error || 'Unknown error'}`);
      }
      return responseData.data;
    }
    
    // Fallback for direct response format
    return responseData;
  } catch (error) {
    throw new Error(`Database stats failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Server-side utilities - these throw errors until database domain is migrated
export async function queryBackend(_sql: string, _cookies?: string): Promise<QueryResult> {
  throw new Error('Database backend API not yet implemented in OpenAPI migration');
}

export async function getStatsBackend(_cookies?: string): Promise<DatabaseStats> {
  throw new Error('Database stats backend API not yet implemented in OpenAPI migration');
}

const databaseService = { query, getStats, queryBackend, getStatsBackend };
export default databaseService;
