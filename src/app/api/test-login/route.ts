// src/app/api/test-login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getApiBaseUrl } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Test login endpoint called with:', body);
    
    // Test the backend login directly
    const baseUrl = await getApiBaseUrl();
    const backendResponse = await fetch(`${baseUrl}/api/v2/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    console.log('Backend response status:', backendResponse.status);
    
    if (backendResponse.ok) {
      const backendData = await backendResponse.json();
      console.log('Backend login success:', backendData);
      
      // Get the session cookie from backend response
      const setCookieHeader = backendResponse.headers.get('set-cookie');
      console.log('Backend set-cookie header:', setCookieHeader);
      
      // Create response and forward the cookie
      const response = NextResponse.json({
        success: true,
        data: backendData,
        backendStatus: backendResponse.status
      });
      
      // Forward the session cookie
      if (setCookieHeader) {
        response.headers.set('Set-Cookie', setCookieHeader);
      }
      
      return response;
    } else {
      const errorData = await backendResponse.text();
      console.log('Backend login failed:', errorData);
      
      return NextResponse.json({
        success: false,
        error: `Backend login failed: ${errorData}`,
        backendStatus: backendResponse.status
      });
    }
    
  } catch (error) {
    console.error('Test login error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
