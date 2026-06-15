import { NextResponse } from 'next/server';
import { authToken, AUTH_COOKIE } from '../../../lib/auth';

export async function POST(request) {
  const { password } = await request.json();
  const expected = process.env.DESIGNER_PASSWORD;

  if (!expected || password !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, await authToken(expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 90,
    path: '/',
  });
  return response;
}
