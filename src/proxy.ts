import { auth } from "@/auth"

export const proxy = auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;
  const isDemoMode = req.cookies.get("forge-demo")?.value === "1";

  const isAuthRoute = pathname === '/login' || pathname === '/register';
  const isPublicRoute = pathname === '/' || pathname === '/demo';
  const isDemoRoute =
    pathname === '/dashboard' ||
    pathname === '/train' ||
    pathname === '/coach' ||
    pathname === '/race' ||
    pathname === '/metrics' ||
    pathname === '/benchmarks' ||
    pathname === '/pacing' ||
    pathname === '/profile' ||
    pathname === '/equipment' ||
    pathname.startsWith('/workout/');

  // API routes own their auth behavior so callers get JSON errors, not login HTML.
  if (pathname.startsWith('/api')) {
    return;
  }

  // Auth pages (/login, /register): allow access regardless of session status
  // The landing page and individual pages handle session-aware redirects themselves
  if (isAuthRoute) {
    return;
  }

  // Non-public, non-auth pages require authentication
  if (!isLoggedIn && !isPublicRoute && !(isDemoMode && isDemoRoute)) {
    return Response.redirect(new URL('/login', req.nextUrl));
  }
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.webp$).*)'],
}
