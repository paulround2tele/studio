import { NextRequest, NextResponse } from 'next/server';

// This is a hidden database API endpoint for the database GUI
// Only accessible to authenticated users with proper session

import databaseService from '@/lib/services/databaseService';
import type { QueryResult } from '@/lib/api/databaseApi';

export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate request
    const xRequestedWith = request.headers.get('X-Requested-With');
    if (xRequestedWith !== 'XMLHttpRequest') {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    // Get the SQL query from request body
    const { query } = await request.json();
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'SQL query is required' },
        { status: 400 }
      );
    }

    // Basic security check - prevent obviously dangerous queries
    const queryLower = query.toLowerCase().trim();
    const dangerousPatterns = [
      'drop table',
      'drop database',
      'drop schema',
      'truncate table',
      'delete from auth.users',
      'update auth.users',
      'insert into auth.users'
    ];

    const isDangerous = dangerousPatterns.some(pattern => 
      queryLower.includes(pattern)
    );

    if (isDangerous) {
      return NextResponse.json(
        { error: 'Query contains potentially dangerous operations' },
        { status: 403 }
      );
    }

    const cookies = request.headers.get('cookie') || undefined;
    const startTime = Date.now();
    try {
      const result = await databaseService.queryBackend(query, cookies);
      const executionTime = Date.now() - startTime;
      const queryResult: QueryResult = { ...result, executionTime };
      return NextResponse.json(queryResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Database query failed';
      return NextResponse.json(
        { error: message },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Database query error:', error);
    return NextResponse.json(
      { error: 'Internal server error executing query' },
      { status: 500 }
    );
  }
}