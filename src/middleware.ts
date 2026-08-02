import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Define public paths that don't require authentication
  const isPublicPath = path === '/login' || path === '/api/auth/login';

  // Temporarily disabled authentication check
  /*
  // Check for the auth token
  const token = request.cookies.get('auth_token')?.value;

  // If trying to access a protected route without a token, redirect to login
  if (!isPublicPath && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If trying to access login page with a valid token, redirect to dashboard
  if (isPublicPath && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  */


  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/ingest (allow public API ingest routes if any)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - assets or public files
     */
    '/((?!api/ingest|_next/static|_next/image|favicon.ico).*)',
  ],
};
