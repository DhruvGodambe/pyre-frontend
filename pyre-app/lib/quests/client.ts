/* ============================================================================
   PYRE — Quest API client  (browser → /api/quests/*)
   ----------------------------------------------------------------------------
   The quest funnel is OFF-CHAIN and permanent — it never lives on a contract —
   so it behaves identically whether the app is in mock or chain mode. Both
   DataSource implementations delegate their quest methods here, and these call
   our own API routes (session cookie travels automatically, same-origin).
   ========================================================================== */

import type { QuestTask, StoredIdentity } from "../types";
import type { TxResult } from "../datasource/types";

async function postJson(url: string, body: unknown): Promise<TxResult> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error ?? "Request failed" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

export async function fetchQuestTasks(): Promise<QuestTask[]> {
  const res = await fetch("/api/quests", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load quests");
  const data = (await res.json()) as { tasks: QuestTask[] };
  return data.tasks;
}

export function completeQuestTask(taskId: string): Promise<TxResult> {
  return postJson("/api/quests/complete", { taskId });
}

export function submitWallet(wallet: string): Promise<TxResult> {
  return postJson("/api/quests/wallet", { wallet });
}

/* Visitor identity — durable, server-side, keyed by the session cookie. */
export async function fetchIdentity(): Promise<StoredIdentity | null> {
  try {
    const res = await fetch("/api/quests/identity", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { identity: StoredIdentity | null };
    return data.identity ?? null;
  } catch {
    return null;
  }
}

export function saveIdentity(identity: StoredIdentity): Promise<TxResult> {
  return postJson("/api/quests/identity", identity);
}

export async function clearIdentity(): Promise<void> {
  try {
    await fetch("/api/quests/identity", { method: "DELETE" });
  } catch {
    /* best-effort; local state is already cleared */
  }
}

/* --- Ember leaderboard --------------------------------------------------- */
export interface LeaderRow {
  rank: number;
  name: string;
  embers: number;
  you: boolean;
}
export interface QuestLeaderboard {
  top: LeaderRow[];
  you: { rank: number; embers: number } | null;
}
export async function fetchQuestLeaderboard(): Promise<QuestLeaderboard> {
  const res = await fetch("/api/quests/leaderboard", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load the leaderboard");
  return (await res.json()) as QuestLeaderboard;
}

/* --- Referrals ----------------------------------------------------------- */
export interface ReferralInfo {
  code: string;
  referredBy: string | null;
  count: number;
  embersEach: number;
}
export async function fetchReferral(): Promise<ReferralInfo> {
  const res = await fetch("/api/quests/referral", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load your referral link");
  return (await res.json()) as ReferralInfo;
}
/** Record that this session arrived via someone's ?ref=CODE link. Best-effort. */
export async function captureReferral(code: string): Promise<void> {
  await postJson("/api/quests/referral", { code });
}
