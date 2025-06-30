import { getApiBaseUrl } from '@/lib/config';

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
}

// Client-side calls through Next.js API routes
export async function query(sql: string): Promise<QueryResult> {
  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/database/query`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || 'Query execution failed');
  }

  return response.json();
}

export async function getStats(): Promise<DatabaseStats> {
  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/database/stats`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to load database stats');
  }

  return response.json();
}

// Server-side calls directly to the backend
export async function queryBackend(sql: string, cookies?: string): Promise<QueryResult> {
  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/v2/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...(cookies ? { Cookie: cookies } : {}),
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || 'Database query failed');
  }

  return response.json();
}

export async function getStatsBackend(cookies?: string): Promise<DatabaseStats> {
  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/v2/database/stats`, {
    method: 'GET',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      ...(cookies ? { Cookie: cookies } : {}),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch database stats');
  }

  return response.json();
}

const databaseApi = {
  query,
  getStats,
  queryBackend,
  getStatsBackend,
};

export default databaseApi;
