import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication
const publicRoutes = ['/login', '/signup'];
// API routes that don't require authentication  
const publicApiRoutes = ['/api/auth'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow public API routes
  if (publicApiRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check authentication for protected routes by checking for better-auth session cookies
  // Better-auth uses cookies like 'better-auth.session_token' or similar
  const hasAuthCookie = request.cookies.getAll().some(cookie => 
    cookie.name.includes('better-auth') || 
    cookie.name.includes('session') ||
    cookie.name.includes('auth')
  );

  if (!hasAuthCookie) {
    // Redirect to login if not authenticated
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // User appears to be authenticated (has auth cookie), allow access
  // The actual session validation will happen in the API routes
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

