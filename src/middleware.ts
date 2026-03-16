import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default_super_secret_dev_key_123'
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Define protected routes
  const isAdminPath = pathname.startsWith('/admin');
  const isOpsPath = pathname.startsWith('/ops');

  if (isAdminPath || isOpsPath) {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      const url = new URL('/login', request.url);
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);

      // Protection for /ops (Internal Ops Console)
      if (isOpsPath && !payload.canAccessOps) {
        return NextResponse.redirect(new URL('/admin', request.url));
      }

      // 2. Add security headers to the response
      const response = NextResponse.next();
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
      
      return response;
    } catch (error) {
      // Invalid token
      const url = new URL('/login', request.url);
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/admin/:path*', '/ops/:path*'],
};
