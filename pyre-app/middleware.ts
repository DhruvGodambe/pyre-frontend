import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authToken, AUTH_COOKIE } from "./lib/auth";

/* Gates the whole skeleton behind the same password as the brief. Reached
   normally via designer.pyreprotocol.com/app (proxied, carries the brief's
   cookie); this also locks the project's own direct URL. */
export async function middleware(request: NextRequest) {
  const password = process.env.DESIGNER_PASSWORD;
  if (!password) {
    return new NextResponse("DESIGNER_PASSWORD is not configured.", { status: 503 });
  }

  const cookie = request.cookies.get(AUTH_COOKIE)?.value;
  const expected = await authToken(password);

  if (cookie === expected) {
    return NextResponse.next();
  }

  // clone() keeps basePath (/app), so this resolves to /app/login.
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // '/' covers the app index (which under basePath is the bare /app — the whole
  // single-page app). The second entry covers every other route except the
  // login page, the login API, and static assets.
  matcher: ["/", "/((?!login|_next/static|_next/image|favicon.ico|api/login).*)"],
};
