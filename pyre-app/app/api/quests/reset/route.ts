/* GET /api/quests/reset, MOCK-ONLY progress reset. Visit it in the browser.

   Everything a visitor has earned hangs off ONE anonymous cookie (pyre_quest_sid):
   the rites they've completed, the wallet they submitted, the Embers those add up
   to. So the cleanest possible reset is to cut that cookie loose: the next request
   mints a fresh session, and the gate meets you as a total stranger again, with the
   Emberheart unclaimed and the whole funnel (decree, claim, follow, wallet) back at
   the top. It also clears the old session's rites on the way out, so the abandoned
   session isn't left sitting in the store carrying Embers.

   Only ever touches YOUR OWN progress: your cookie is what identifies the session,
   and nobody else's is sent. Auto-disabled at launch (USE_MOCK=false), so this can
   never wipe a real visitor. */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getQuestStore } from "@/lib/db";
import { getOrCreateSessionId, SESSION_COOKIE } from "@/lib/quests/session";
import { CLICK_TASK_IDS } from "@/lib/quests/catalog";
import { USE_MOCK, BASE_PATH } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!USE_MOCK) {
    return NextResponse.json({ ok: false, error: "disabled in production" }, { status: 403 });
  }

  const sessionId = await getOrCreateSessionId();
  const store = getQuestStore();
  const before = await store.getCompletions(sessionId);
  await Promise.all([...CLICK_TASK_IDS].map((id) => store.unmarkComplete(sessionId, id)));

  // Cut the session loose. The wallet submission is keyed to the old session id, so
  // walking away from it clears that too, which unmarking alone could not do (the
  // store has no delete for a submission).
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);

  /* It REPORTS what it did, and does not bounce you onward.

     An auto-redirect made this impossible to trust: if the Embers were still there
     afterwards, there was no way to tell whether the reset had failed or the page had
     simply come back from cache with its old state. So the page states the session it
     cut and what that session was carrying, and you click through yourself. The link
     carries a cache-buster, so the gate is genuinely re-fetched rather than restored
     from the back/forward cache with the old Embers still on screen. */
  const home = `${BASE_PATH}/?fresh=${Date.now()}`;
  const cleared = before.length ? before.join(", ") : "nothing";
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><title>Embers reset</title></head>
<body style="background:#0b0a08;color:#f0a93b;font-family:Georgia,serif;padding:2rem;line-height:1.6">
<h1 style="font-weight:400">Embers reset.</h1>
<p style="color:#a99">Cut session <code>${sessionId.slice(0, 8)}…</code>, which was carrying: <b style="color:#f0a93b">${cleared}</b>.</p>
<p style="color:#a99">You are a stranger again: 0 Embers, the Emberheart unclaimed.</p>
<p style="margin-top:1.5rem"><a href="${home}" style="color:#f0a93b;font-size:1.2rem">Return to the gate &rarr;</a></p>
</body></html>`,
    {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store, must-revalidate",
      },
    }
  );
}
