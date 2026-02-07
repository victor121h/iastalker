import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'src', 'sck', 'xcod'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  if (pathname.startsWith('/ref=')) {
    const url = request.nextUrl.clone();
    const ref = pathname.replace('/ref=', '');
    url.pathname = '/search';
    url.searchParams.set('ref', ref);
    return NextResponse.redirect(url);
  }

  const visitedPitch = request.cookies.get('visited_pitch')?.value === 'true';
  
  const excludedPaths = ['/pitch', '/pitch1', '/up1', '/up2', '/up3', '/up4', '/upsell', '/back-front', '/back-up1', '/backfront', '/chat1', '/chat2', '/chat3', '/direct', '/feed', '/login', '/confirm', '/search', '/access', '/access2', '/api', '/_next', '/favicon.ico', '/logo', '/public', '/dashboard', '/buscando', '/buy', '/cadastro', '/profile', '/detetive'];
  const isExcluded = excludedPaths.some(path => pathname.startsWith(path)) || pathname.includes('.');

  const response = NextResponse.next();

  const utmsFromUrl: Record<string, string> = {};
  UTM_KEYS.forEach(key => {
    const value = request.nextUrl.searchParams.get(key);
    if (value) utmsFromUrl[key] = value;
  });

  if (Object.keys(utmsFromUrl).length > 0) {
    UTM_KEYS.forEach(key => {
      if (utmsFromUrl[key]) {
        response.cookies.set(`_utm_${key}`, utmsFromUrl[key], {
          maxAge: 60 * 60 * 24 * 30,
          path: '/',
          httpOnly: false,
        });
      }
    });
  }

  if (visitedPitch && !isExcluded) {
    const url = request.nextUrl.clone();
    url.pathname = '/pitch';
    const redirectResponse = NextResponse.redirect(url);
    if (Object.keys(utmsFromUrl).length > 0) {
      UTM_KEYS.forEach(key => {
        if (utmsFromUrl[key]) {
          redirectResponse.cookies.set(`_utm_${key}`, utmsFromUrl[key], {
            maxAge: 60 * 60 * 24 * 30,
            path: '/',
            httpOnly: false,
          });
        }
      });
    }
    return redirectResponse;
  }
  
  if (pathname === '/pitch') {
    response.cookies.set('visited_pitch', 'true', {
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });
    return response;
  }
  
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
