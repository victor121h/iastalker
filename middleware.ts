import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  const visitedPitch = request.cookies.get('visited_pitch')?.value === 'true';
  
  const excludedPaths = ['/pitch', '/api', '/_next', '/favicon.ico', '/logo', '/public'];
  const isExcluded = excludedPaths.some(path => pathname.startsWith(path)) || pathname.includes('.');
  
  if (visitedPitch && !isExcluded) {
    const url = request.nextUrl.clone();
    url.pathname = '/pitch';
    return NextResponse.redirect(url);
  }
  
  if (pathname === '/pitch') {
    const response = NextResponse.next();
    response.cookies.set('visited_pitch', 'true', {
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
