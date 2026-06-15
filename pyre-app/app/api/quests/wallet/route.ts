/* POST /api/quests/wallet  { wallet } — record the address this session submits
   to receive its multiplier. Completes the wallet-gated funnel task. */

import { NextResponse } from "next/server";
import { getQuestStore } from "@/lib/db";
import { getOrCreateSessionId } from "@/lib/quests/session";

export const runtime = "nodejs";

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

export async function POST(request: Request) {
  let wallet: unknown;
  try {
    ({ wallet } = await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  if (typeof wallet !== "string" || !EVM_ADDRESS.test(wallet.trim())) {
    return NextResponse.json(
      { ok: false, error: "Enter a valid wallet address (0x…)." },
      { status: 400 }
    );
  }

  const sessionId = await getOrCreateSessionId();
  await getQuestStore().submitWallet(sessionId, wallet.trim().toLowerCase());
  return NextResponse.json({ ok: true });
}
