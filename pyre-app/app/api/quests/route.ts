/* GET /api/quests, the visitor's quest tasks (catalog ⨉ their state).
   Mints the session cookie on first hit. Returns QuestTask[] (see lib/types).

   ---- THE WALLET IS THE IDENTITY, THE COOKIE IS JUST A HANDLE ----------------

   A session is an anonymous cookie, and cookies die: a new phone, a cleared browser,
   private mode. Keying Embers to the cookie alone meant a visitor who claimed on their
   phone and then connected their wallet on a laptop was met with ZERO, and would
   reasonably conclude they had lost everything. Most of them are on phones, so that was
   the common path, not the edge case.

   So a visitor's rites are the UNION of the rites completed by every session carrying
   the same wallet (submitted at the gate, or connected in the kingdom). Two things fall
   out of that, and both are the point:

     RESTORED   , give us the address again on any device and the Embers come back: we
                  can now find every session that address has ever been given from.
     UNFARMABLE , a UNION, never a sum. Clearing the cookie and running the funnel again
                  into the same wallet contributes no rite it does not already have, so
                  it earns nothing. Summing would have PAID people to do exactly that,
                  on repeat, for as long as they could be bothered.

   Ember totals stay DERIVED (the points of the distinct completed rites), never a
   stored counter, so there is nothing to double-increment. */

import { NextResponse } from "next/server";
import { getQuestStore } from "@/lib/db";
import { getOrCreateSessionId } from "@/lib/quests/session";
import { buildQuestTasks } from "@/lib/quests/catalog";

export const runtime = "nodejs"; // FileStore (dev) needs the Node fs APIs.
export const dynamic = "force-dynamic"; // per-visitor, never cached.

export async function GET() {
  try {
    const sessionId = await getOrCreateSessionId();
    const store = getQuestStore();

    const [own, submission, identity] = await Promise.all([
      store.getCompletions(sessionId),
      store.getSubmission(sessionId),
      store.getIdentity(sessionId),
    ]);

    // The address this visitor is known by: the one they submitted at the gate, or, on a
    // device that has never submitted anything, the one they connected.
    const wallet = submission?.wallet ?? (identity?.mode === "wallet" ? identity.wallet : null);

    const completed = new Set(own);
    let hasWallet = submission !== null;

    if (wallet) {
      const sessions = await store.getSessionsByWallet(wallet);
      const others = await Promise.all(
        sessions.filter((s) => s !== sessionId).map((s) => store.getCompletions(s))
      );
      for (const ids of others) for (const id of ids) completed.add(id);
      // We have been given this address before, so the wallet rite is done, even if it was
      // done from a device this browser has never been.
      hasWallet = hasWallet || sessions.length > 0;
    }

    return NextResponse.json({ tasks: buildQuestTasks(completed, hasWallet) });
  } catch (err) {
    // Never blank the Claim Embers plate for a DB blip: return the catalog with
    // nothing completed so the visitor can still walk the rite (writes may still fail).
    console.error("[quests] GET failed:", err);
    return NextResponse.json({ tasks: buildQuestTasks(new Set(), false) });
  }
}
