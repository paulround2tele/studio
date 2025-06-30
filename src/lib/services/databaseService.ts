import databaseApi from '@/lib/api/databaseApi';
import type { QueryResult, DatabaseStats } from '@/lib/api/databaseApi';

export async function query(sql: string): Promise<QueryResult> {
  return databaseApi.query(sql);
}

export async function getStats(): Promise<DatabaseStats> {
  return databaseApi.getStats();
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
