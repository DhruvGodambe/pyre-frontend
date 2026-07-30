import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authToken, AUTH_COOKIE } from "./lib/auth";

/* Gates ONLY the kingdom (the real app: /kingdom + its quest APIs) behind the
   team password. The PUBLIC front door ("/", trailer + gate) and the Ember Codex
   ("/codex") are deliberately left open (see the matcher below), so KOLs can see
   the film and read the docs without a password while the kingdom stays team-only.
   Served at app.pyreprotocol.com; the login route sets the auth cookie there. */
/* The quest endpoints the SEALED GATE needs, and only those.

   Pre-launch the gate is the only surface the public can reach, and its Ember
   Crystal is the only place they can earn anything, so the crystal must be able
   to read its rites, credit them, and take a wallet without the team password.

   - /referral : share links point at the front door ("/?ref=CODE"), so recording
     an arrival must not require the cookie. Safe: a bare arrival only stores a
     session row; Embers credit only once the friend completes a rite or submits
     a wallet (see leaderboard).
   - /         : reading your own rites (GET). Returns catalog ⨉ your own session.
   - /complete : crediting a rite. The route re-checks the team cookie itself and
     only lets an outsider claim PUBLIC_TASK_IDS (the gate's own rites), so `intro`
     and `quiz` cannot be fabricated from out here. See the route.
   - /wallet   : submitting the address the rewards should land on.

   /leaderboard and /identity stay SEALED: the gate needs neither, and the board
   is not the public's to read while the kingdom sleeps. */
const PUBLIC_QUEST_ROUTES = new Set([
  "/api/quests",
  "/api/quests/complete",
  "/api/quests/wallet",
  "/api/quests/referral",
  // Testing the gate's funnel means arriving as a stranger, which you cannot do
  // once you've claimed. Safe to expose: the route only ever resets the caller's
  // OWN session (its cookie is the only thing identifying it) and is hard-disabled
  // whenever USE_MOCK is false, so it cannot touch a real visitor at launch.
  "/api/quests/reset",
  // Naming yourself (a connected wallet, or a guest name). This is what makes Embers
  // FOLLOW A WALLET rather than a cookie: telling us the address you already gave us is
  // how a visitor on a new phone gets their Embers back (see the union in /api/quests).
  // Safe to expose: it only ever writes the caller's own session row.
  "/api/quests/identity",
]);

export async function middleware(request: NextRequest) {
  if (PUBLIC_QUEST_ROUTES.has(request.nextUrl.pathname)) {
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
  // Node.js runtime so DESIGNER_PASSWORD from .env.local is available (Edge only
  // inlines NEXT_PUBLIC_* vars from .env files; Vercel dashboard vars work on Edge).
  runtime: "nodejs",
  // Gate ONLY the kingdom and its quest APIs. Everything else, the public front
  // door "/", the Ember Codex "/codex", "/login", "/api/session", and all static
  // assets (world art/audio/video, fonts, token logos), stays open and cacheable.
  // The kingdom's own static assets live at the top level (/world, /tokens), not
  // under /kingdom, so they are not caught here.
  matcher: ["/kingdom", "/kingdom/:path*", "/api/quests/:path*", "/admin", "/admin/:path*", "/api/nft/:path*"],
};
