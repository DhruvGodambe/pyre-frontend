/* GET /api/quests, the visitor's quest tasks (catalog ⨉ their session state).
   Mints the session cookie on first hit. Returns QuestTask[] (see lib/types). */

import { NextResponse } from "next/server";
import { getQuestStore } from "@/lib/db";
import { getOrCreateSessionId } from "@/lib/quests/session";
import { buildQuestTasks } from "@/lib/quests/catalog";

export const runtime = "nodejs"; // FileStore (dev) needs the Node fs APIs.
export const dynamic = "force-dynamic"; // per-visitor, never cached.

export async function GET() {
  const sessionId = await getOrCreateSessionId();
  const store = getQuestStore();

  const [completed, submission] = await Promise.all([
    store.getCompletions(sessionId),
    store.getSubmission(sessionId),
  ]);

  const tasks = buildQuestTasks(new Set(completed), submission !== null);
  return NextResponse.json({ tasks });
}
