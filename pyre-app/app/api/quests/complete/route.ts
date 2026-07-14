/* POST /api/quests/complete  { taskId }, mark a "click" task complete for this
   session. Idempotent. Rejects unknown ids and the wallet-gated task (use
   /api/quests/wallet for that).

   NOTE: completion is recorded on the visitor's say-so for now. Real
   verification (Guild.xyz / X / Telegram OAuth) plugs in here later, before the
   store write, the rest of the funnel stays the same. */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getQuestStore } from "@/lib/db";
import { getOrCreateSessionId } from "@/lib/quests/session";
import { CLICK_TASK_IDS, PUBLIC_TASK_IDS } from "@/lib/quests/catalog";
import { authToken, AUTH_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

/** Is this a signed-in team member (i.e. someone who can actually reach the
    kingdom)? This route is public so the sealed gate's Ember Crystal can credit
    its rites, so it re-checks the team cookie itself rather than trusting the
    middleware to have done it. */
async function isTeam(): Promise<boolean> {
  const password = process.env.DESIGNER_PASSWORD;
  if (!password) return false;
  const cookie = (await cookies()).get(AUTH_COOKIE)?.value;
  return !!cookie && cookie === (await authToken(password));
}

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

  // From outside the kingdom only the gate's rites can be claimed. `intro` and
  // `quiz` are performed INSIDE (take the tour, pass the quiz), so crediting them
  // from the public gate would be pure fabrication.
  if (!PUBLIC_TASK_IDS.has(taskId) && !(await isTeam())) {
    return NextResponse.json({ ok: false, error: "Sealed" }, { status: 403 });
  }

  const sessionId = await getOrCreateSessionId();
  await getQuestStore().markComplete(sessionId, taskId);
  return NextResponse.json({ ok: true });
}
