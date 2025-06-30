// Database API - temporary stub for compatibility
// TODO: Replace with OpenAPI-generated client when database domain is implemented

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

// Stub implementations - these will be replaced when database domain is migrated
const databaseApi = {
  async queryBackend(_sql: string, _cookies?: string): Promise<QueryResult> {
    // TODO: Implement actual database query API call
    throw new Error('Database API not yet implemented in OpenAPI migration');
  },

  async getStatsBackend(_cookies?: string): Promise<DatabaseStats> {
    // TODO: Implement actual database stats API call
    throw new Error('Database stats API not yet implemented in OpenAPI migration');
  }
};

export default databaseApi;