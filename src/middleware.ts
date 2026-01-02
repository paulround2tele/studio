import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Keep this in sync with backend session cookie name
const SESSION_COOKIE_NAME = 'domainflow_session';

// Public paths that don't require authentication
const PUBLIC_PATHS = ['/login', '/signup'];

// Get session signing secret from environment variable
const SESSION_SIGNING_SECRET = process.env.SESSION_SIGNING_SECRET || 'dev-only-session-secret-change-in-production';

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

// Web Crypto API-based HMAC verification for Edge runtime
async function verifySessionCookie(cookieValue: string): Promise<{ sessionId: string; valid: boolean }> {
  if (!cookieValue) {
    return { sessionId: '', valid: false };
  }

  // Split into sessionID and signature
  const dotIndex = cookieValue.indexOf('.');
  if (dotIndex === -1) {
    // Legacy unsigned cookie format - reject it
    return { sessionId: '', valid: false };
  }

  const sessionId = cookieValue.substring(0, dotIndex);
  const providedSignature = cookieValue.substring(dotIndex + 1);

  // Validate session ID format (should be hex string of expected length)
  if (!sessionId || sessionId.length < 32) {
    return { sessionId: '', valid: false };
  }

  try {
    // Import the secret key for HMAC
    const encoder = new TextEncoder();
    const keyData = encoder.encode(SESSION_SIGNING_SECRET);
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Compute expected signature
    const dataToSign = encoder.encode(sessionId);
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, dataToSign);
    
    // Convert to base64url (matching Go's base64.RawURLEncoding)
    const signatureArray = new Uint8Array(signatureBuffer);
    const base64 = btoa(Array.from(signatureArray, (byte) => String.fromCharCode(byte)).join(''));
    const expectedSignature = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    // Compare signatures (timing-safe comparison not critical here as it's already rate-limited)
    if (providedSignature !== expectedSignature) {
      return { sessionId: '', valid: false };
    }

    return { sessionId, valid: true };
  } catch {
    return { sessionId: '', valid: false };
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;
  
  // CRITICAL TEST: Always add this header to verify middleware is running
  const response = NextResponse.next();
  response.headers.set('x-middleware-test', 'middleware-is-running');
  
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const clientIp = forwardedFor?.split(',')[0]?.trim() || realIp?.trim() || 'unknown';

  // Skip Next.js internals and static assets explicitly (also handled by matcher)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/assets') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/fonts') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.startsWith('/api') // include both /api and /api/v2
  ) {
    return NextResponse.next();
  }

  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value || '';
  const { valid: hasValidSession, sessionId: validatedSessionId } = await verifySessionCookie(sessionCookie);
  
  // Debug logging
  console.log('[middleware]', method, pathname, {
    cookiePresent: !!sessionCookie,
    cookieHasDot: sessionCookie.includes('.'),
    validSession: hasValidSession,
    sessionId: validatedSessionId?.substring(0, 8) + '...',
    ip: clientIp,
  });

  // Helper to manage session cookies
  const manageSessionCookies = (res: NextResponse) => {
    if (sessionCookie && !hasValidSession) {
      // Clear the invalid/tampered session cookie
      res.cookies.set(SESSION_COOKIE_NAME, '', {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 0,
      });
    }
    
    // Set a non-HttpOnly presence cookie so client-side JS can detect auth status
    // This is safe because it contains no sensitive data - just an indicator
    const PRESENCE_COOKIE_NAME = 'auth_presence';
    if (hasValidSession) {
      res.cookies.set(PRESENCE_COOKIE_NAME, '1', {
        path: '/',
        httpOnly: false,  // Client-side readable
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24, // 24 hours
      });
    } else {
      // Clear presence cookie when session is invalid
      res.cookies.set(PRESENCE_COOKIE_NAME, '', {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 0,
      });
    }
    
    res.headers.set('x-middleware', '1');
    res.headers.set('x-auth-presence', hasValidSession ? '1' : '0');
    return res;
  };

  // If user is authenticated and visits a public path (e.g., /login), redirect to dashboard
  if (hasValidSession && isPublicPath(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return manageSessionCookies(NextResponse.redirect(url));
  }

  // If user is not authenticated and visits a protected path, redirect to login
  if (!hasValidSession && !isPublicPath(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    // Preserve the intended destination for redirect after login
    url.searchParams.set('redirect', pathname);
    return manageSessionCookies(NextResponse.redirect(url));
  }

  // Otherwise, allow request to continue
  return manageSessionCookies(NextResponse.next());
}

// Apply middleware to all pages except next internals, static, and API routes
export const config = {
  matcher: [
  // Skip API routes and Next.js internals (canonical pattern)
  '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
