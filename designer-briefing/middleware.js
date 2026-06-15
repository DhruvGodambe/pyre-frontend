import { NextResponse } from 'next/server';
import { authToken, AUTH_COOKIE } from './lib/auth';

export async function middleware(request) {
  const password = process.env.DESIGNER_PASSWORD;
  if (!password) {
    return new NextResponse('DESIGNER_PASSWORD is not configured.', { status: 503 });
  }

  const cookie = request.cookies.get(AUTH_COOKIE)?.value;
  const expected = await authToken(password);

  if (cookie === expected) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // '/app' is excluded: it's proxied to the village-world skeleton (its own
  // Vercel project), which guards itself with its own password. Excluding it
  // here avoids a double login. The brief's own pages stay gated.
  matcher: ['/((?!login|app|_next/static|_next/image|favicon.ico|api/login).*)'],
};
