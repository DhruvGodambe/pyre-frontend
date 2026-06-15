/* GET /api/quests/leaderboard — the Ember leaderboard.
   Each session's Embers = quest rites completed (catalog points) + referrals
   brought in (REFERRAL_EMBERS each). Computed here from the catalog so a rite's
   worth can change without a migration. Session ids never leave the server. */

import { NextResponse } from "next/server";
import { getQuestStore } from "@/lib/db";
import { getOrCreateSessionId } from "@/lib/quests/session";
import { buildQuestTasks, REFERRAL_EMBERS } from "@/lib/quests/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOP_N = 25;

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
  const sessionId = await getOrCreateSessionId();
  const rows = await getQuestStore().getLeaderboard();

  // How many sessions each referral code brought in.
  const referralCount = new Map<string, number>();
  for (const r of rows) {
    if (r.referredBy) referralCount.set(r.referredBy, (referralCount.get(r.referredBy) ?? 0) + 1);
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
