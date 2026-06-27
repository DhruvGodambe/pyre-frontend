/* GET /api/quests/reset, MOCK-ONLY tour/quest reset.

   The guided tour grants the "intro" quest on finish, and that completion is
   stored per session, so once you've finished the tour the skip-confirmation
   shows the "already earned" copy instead of the points warning. Visiting this
   in the browser clears YOUR session's "intro" completion (your cookie is sent,
   so it only ever touches your own progress), then bounces back to the app so the
   tour + its warning can be re-tested. Auto-disabled at launch (USE_MOCK=false). */

import { NextResponse } from "next/server";
import { getQuestStore } from "@/lib/db";
import { getOrCreateSessionId } from "@/lib/quests/session";
import { USE_MOCK } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!USE_MOCK) {
    return NextResponse.json({ ok: false, error: "disabled in production" }, { status: 403 });
  }
  const sessionId = await getOrCreateSessionId();
  await getQuestStore().unmarkComplete(sessionId, "intro");
  // Bounce back into the app so it reloads with a fresh tour state.
  return NextResponse.redirect(new URL("/app", req.url));
}
