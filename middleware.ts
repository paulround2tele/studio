import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Keep this in sync with backend session cookie name
const SESSION_COOKIE_NAME = 'domainflow_session';

// Public paths that don't require authentication
const PUBLIC_PATHS = ['/login', '/signup'];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;
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

  const hasSession = req.cookies.has(SESSION_COOKIE_NAME);
  console.log('[middleware]', method, pathname, 'session=', hasSession, 'ip=', clientIp);

  // Helper to set a small presence hint cookie for layouts/UI (no auth decisions on client)
  const setPresenceCookie = (res: NextResponse) => {
    if (hasSession) {
      res.cookies.set('auth_presence', '1', {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
      });
    } else {
      // Clear presence
      res.cookies.set('auth_presence', '', {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 0,
      });
    }
    res.headers.set('x-middleware', '1');
    res.headers.set('x-auth-presence', hasSession ? '1' : '0');
    return res;
  };

  // If user is authenticated and visits a public path (e.g., /login), redirect to dashboard
  if (hasSession && isPublicPath(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return setPresenceCookie(NextResponse.redirect(url));
  }

  // If user is not authenticated and visits a protected path, redirect to login
  if (!hasSession && !isPublicPath(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return setPresenceCookie(NextResponse.redirect(url));
  }

  // Otherwise, allow request to continue
  return setPresenceCookie(NextResponse.next());
}

// Apply middleware to all pages except next internals, static, and API routes
export const config = {
  matcher: [
  // Skip API routes and Next.js internals (canonical pattern)
  '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
