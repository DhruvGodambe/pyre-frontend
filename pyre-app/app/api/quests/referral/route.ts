/* /api/quests/referral
   GET, this session's referral code + how many friends it has brought in.
   POST, { code } records that THIS session was referred by `code` (once,
          never self). Called when someone arrives with ?ref=CODE.

   Referrals are a repeatable, secondary earn (REFERRAL_EMBERS each) that feeds
   the Ember leaderboard alongside the one-off rites. */

import { NextResponse } from "next/server";
import { getQuestStore } from "@/lib/db";
import { getOrCreateSessionId } from "@/lib/quests/session";
import { REFERRAL_EMBERS } from "@/lib/quests/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A short, URL-safe public code, distinct from the (secret, httpOnly) sid. */
function mintCode(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

export async function GET() {
  const sessionId = await getOrCreateSessionId();
  const store = getQuestStore();
  const referral = await store.getReferral(sessionId, mintCode());
  // Count only ACTIVE referred friends (completed a rite or submitted a wallet),
  // so the displayed count matches what the leaderboard actually credits and the
  // loop can't be inflated by bare ?ref= pageloads. Mirrors leaderboard/route.ts.
  const rows = await store.getLeaderboard();
  const count = rows.filter(
    (r) => r.referredBy === referral.code && (r.taskIds.length > 0 || r.submitted)
  ).length;
  return NextResponse.json({
    code: referral.code,
    referredBy: referral.referredBy,
    count,
    embersEach: REFERRAL_EMBERS,
  });
}

export async function POST(request: Request) {
  let code: unknown;
  try {
    ({ code } = await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }
  if (typeof code !== "string" || !/^[a-z0-9]{4,16}$/i.test(code)) {
    return NextResponse.json({ ok: false, error: "Invalid code" }, { status: 400 });
  }

  const sessionId = await getOrCreateSessionId();
  const store = getQuestStore();
  // Mint our own code first (so self-referral can be detected and a row exists).
  const own = await store.getReferral(sessionId, mintCode());
  if (own.code === code) {
    return NextResponse.json({ ok: false, error: "Cannot refer yourself" }, { status: 400 });
  }
  await store.setReferredBy(sessionId, code);
  return NextResponse.json({ ok: true });
}
