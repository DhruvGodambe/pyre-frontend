/* POST /api/quests/complete  { taskId }, mark a "click" task complete for this
   session. Idempotent. Rejects unknown ids and the wallet-gated task (use
   /api/quests/wallet for that).

   NOTE: completion is recorded on the visitor's say-so for now. Real
   verification (Guild.xyz / X / Telegram OAuth) plugs in here later, before the
   store write, the rest of the funnel stays the same. */

import { NextResponse } from "next/server";
import { getQuestStore } from "@/lib/db";
import { getOrCreateSessionId } from "@/lib/quests/session";
import { CLICK_TASK_IDS } from "@/lib/quests/catalog";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let taskId: unknown;
  try {
    ({ taskId } = await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  if (typeof taskId !== "string" || !CLICK_TASK_IDS.has(taskId)) {
    return NextResponse.json({ ok: false, error: "Unknown task" }, { status: 400 });
  }

  const sessionId = await getOrCreateSessionId();
  await getQuestStore().markComplete(sessionId, taskId);
  return NextResponse.json({ ok: true });
}
