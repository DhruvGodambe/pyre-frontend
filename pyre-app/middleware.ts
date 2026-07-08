import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authToken, AUTH_COOKIE } from "./lib/auth";

/* Gates ONLY the kingdom (the real app: /kingdom + its quest APIs) behind the
   team password. The PUBLIC front door ("/", trailer + gate) and the Ember Codex
   ("/codex") are deliberately left open (see the matcher below), so KOLs can see
   the film and read the docs without a password while the kingdom stays team-only.
   Served at app.pyreprotocol.com; the login route sets the auth cookie there. */
export async function middleware(request: NextRequest) {
  // The referral endpoint stays PUBLIC: share links point at the front door
  // ("/?ref=CODE"), which pre-launch is all a visitor can reach, so recording
  // the arrival must not require the team cookie. Safe to expose: a bare
  // arrival only stores a session row; Embers are credited only once the
  // referred friend completes a rite or submits a wallet (see leaderboard).
  if (request.nextUrl.pathname === "/api/quests/referral") {
    return NextResponse.next();
  }

  const password = process.env.DESIGNER_PASSWORD;
  if (!password) {
    return new NextResponse("DESIGNER_PASSWORD is not configured.", { status: 503 });
  }

  const cookie = request.cookies.get(AUTH_COOKIE)?.value;
  const expected = await authToken(password);

  if (cookie === expected) {
    return NextResponse.next();
  }

  // Redirect to /login, carrying where they were headed as ?next so a deep-link
  // (e.g. /ashencup) survives the gate and lands on the right building afterward.
  const dest = request.nextUrl.pathname; // basePath-relative, e.g. "/ashencup"
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  if (dest && dest !== "/") loginUrl.searchParams.set("next", dest);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Gate ONLY the kingdom and its quest APIs. Everything else, the public front
  // door "/", the Ember Codex "/codex", "/login", "/api/session", and all static
  // assets (world art/audio/video, fonts, token logos), stays open and cacheable.
  // The kingdom's own static assets live at the top level (/world, /tokens), not
  // under /kingdom, so they are not caught here.
  matcher: ["/kingdom", "/kingdom/:path*", "/api/quests/:path*"],
};
