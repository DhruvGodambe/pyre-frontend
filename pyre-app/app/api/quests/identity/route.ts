/* /api/quests/identity
   GET, the identity this session chose (wallet or named guest), or null.
   POST, record (or replace) it { mode, username?, wallet? }.

   This is what makes a guest's choice + name durable SERVER-SIDE (not just in
   the browser), keyed by the same anonymous session cookie as quest progress,
   so it survives a hard refresh and is queryable. No PII beyond a chosen name. */

import { NextResponse } from "next/server";
import { getQuestStore } from "@/lib/db";
import { getOrCreateSessionId } from "@/lib/quests/session";
import type { StoredIdentity } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const MAX_USERNAME = 40;

export async function GET() {
  const sessionId = await getOrCreateSessionId();
  const identity = await getQuestStore().getIdentity(sessionId);
  return NextResponse.json({ identity });
}

export async function POST(request: Request) {
  let body: { mode?: unknown; username?: unknown; wallet?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const { mode } = body;
  if (mode !== "wallet" && mode !== "guest") {
    return NextResponse.json({ ok: false, error: "Invalid mode" }, { status: 400 });
  }

  // Normalise + validate the optional fields.
  const username =
    typeof body.username === "string" && body.username.trim()
      ? body.username.trim().slice(0, MAX_USERNAME)
      : null;
  const wallet =
    typeof body.wallet === "string" && body.wallet.trim() ? body.wallet.trim().toLowerCase() : null;

  if (wallet && !EVM_ADDRESS.test(wallet)) {
    return NextResponse.json({ ok: false, error: "Invalid wallet address" }, { status: 400 });
  }
  if (mode === "guest" && !username) {
    return NextResponse.json({ ok: false, error: "A guest needs a name" }, { status: 400 });
  }

  const identity: StoredIdentity = { mode, username, wallet };
  const sessionId = await getOrCreateSessionId();
  await getQuestStore().setIdentity(sessionId, identity);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const sessionId = await getOrCreateSessionId();
  await getQuestStore().clearIdentity(sessionId);
  return NextResponse.json({ ok: true });
}
