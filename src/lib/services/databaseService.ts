import { getApiConfig } from '@/lib/config/environment';
import databaseApi from '@/lib/api/databaseApi';

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
  const apiConfig = getApiConfig();
  const response = await fetch(`${apiConfig.baseUrl}/api/database/query`, {
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

  return response.json();
}

export async function getStats(): Promise<DatabaseStats> {
  const apiConfig = getApiConfig();
  const response = await fetch(`${apiConfig.baseUrl}/api/database/stats`, {
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

  return response.json();
}

// Server-side utilities
export async function queryBackend(sql: string, cookies?: string): Promise<QueryResult> {
  return databaseApi.queryBackend(sql, cookies);
}

export async function getStatsBackend(cookies?: string): Promise<DatabaseStats> {
  return databaseApi.getStatsBackend(cookies);
}

const databaseService = { query, getStats, queryBackend, getStatsBackend };
export default databaseService;
