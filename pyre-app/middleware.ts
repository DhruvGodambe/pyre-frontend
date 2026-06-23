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

  // clone() keeps basePath (/app), so this resolves to /app/login. Carry where
  // they were headed as ?next so a deep-link (e.g. /app/ashencup) survives the
  // gate and lands on the right building after login.
  const dest = request.nextUrl.pathname; // basePath-relative, e.g. "/ashencup"
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  if (dest && dest !== "/") loginUrl.searchParams.set("next", dest);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // '/' covers the app index (which under basePath is the bare /app — the whole
  // single-page app). The second entry gates every PAGE + API, but deliberately
  // lets STATIC ASSETS through untouched: the world art/audio/video, fonts and
  // token logos (any path under world//tokens/, or with a file extension).
  // Routing those through this middleware blocked edge caching, which made the
  // media load slowly and the large audio files never finish buffering.
  matcher: [
    "/",
    "/((?!login|_next/static|_next/image|favicon.ico|api/login|world/|tokens/|.*\\.(?:webp|png|jpe?g|svg|gif|mp3|mp4|webm|woff2?|ttf|otf|ico)).*)",
  ],
};
