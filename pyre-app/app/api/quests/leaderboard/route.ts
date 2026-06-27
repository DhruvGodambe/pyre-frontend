/* GET /api/quests/leaderboard, the Ember leaderboard.
   Each session's Embers = quest rites completed (catalog points) + referrals
   brought in (REFERRAL_EMBERS each). Computed here from the catalog so a rite's
   worth can change without a migration. Session ids never leave the server. */

import { NextResponse } from "next/server";
import { getQuestStore } from "@/lib/db";
import { getOrCreateSessionId } from "@/lib/quests/session";
import { buildQuestTasks, REFERRAL_EMBERS } from "@/lib/quests/catalog";
import { USE_MOCK } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Show a tight top 5 only; everyone else sees their own rank via `you` below.
const TOP_N = 5;

/* MOCK-ONLY demo board, so the leaderboard's look (top 5 + your own rank below)
   can be reviewed locally without seeding a real backend. Returns a fixed top 5
   plus `you` at rank 10, exercising the "···" jump + self row. Auto-disabled at
   launch (USE_MOCK=false). Delete this block when the real board is the demo. */
const MOCK_BOARD = {
  top: [
    { rank: 1, name: "Infernarch", embers: 980, you: false },
    { rank: 2, name: "Cinderwake", embers: 845, you: false },
    { rank: 3, name: "Emberveil", embers: 712, you: false },
    { rank: 4, name: "Ashen Mára", embers: 640, you: false },
    { rank: 5, name: "Pyrewright", embers: 588, you: false },
  ],
  you: { rank: 10, embers: 343 },
};

function questEmbers(taskIds: string[], submitted: boolean): number {
  return buildQuestTasks(new Set(taskIds), submitted)
    .filter((t) => t.done)
    .reduce((sum, t) => sum + t.points, 0);
}

function displayName(username: string | null, wallet: string | null): string {
  if (username) return username;
  if (wallet) return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
  return "A wanderer";
}

export async function GET() {
  if (USE_MOCK) return NextResponse.json(MOCK_BOARD);

  const sessionId = await getOrCreateSessionId();
  const rows = await getQuestStore().getLeaderboard();

  // How many ACTIVE friends each referral code brought in. A referral only
  // counts once the friend takes a real action (completes a rite or submits a
  // wallet), so the loop rewards real users, not link-spam / empty pageloads.
  const referralCount = new Map<string, number>();
  for (const r of rows) {
    const active = r.taskIds.length > 0 || r.submitted;
    if (r.referredBy && active) {
      referralCount.set(r.referredBy, (referralCount.get(r.referredBy) ?? 0) + 1);
    }
  }

  const ranked = rows
    .map((r) => {
      const referrals = r.code ? referralCount.get(r.code) ?? 0 : 0;
      return {
        sessionId: r.sessionId,
        name: displayName(r.username, r.wallet),
        embers: questEmbers(r.taskIds, r.submitted) + referrals * REFERRAL_EMBERS,
      };
    })
    .filter((r) => r.embers > 0)
    .sort((a, b) => b.embers - a.embers)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  const top = ranked.slice(0, TOP_N).map((r) => ({
    rank: r.rank,
    name: r.name,
    embers: r.embers,
    you: r.sessionId === sessionId,
  }));
  const self = ranked.find((r) => r.sessionId === sessionId);
  const you = self ? { rank: self.rank, embers: self.embers } : null;

  return NextResponse.json({ top, you });
}
