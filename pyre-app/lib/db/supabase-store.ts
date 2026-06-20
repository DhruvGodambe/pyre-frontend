/* ============================================================================
   PYRE, SupabaseStore  (production quest persistence)
   ----------------------------------------------------------------------------
   Talks to the Supabase Postgres tables (see lib/db/schema.sql) using the
   SERVICE ROLE key. This runs ONLY in server-side route handlers, the service
   role bypasses Row Level Security, so the key must never reach the browser
   (no NEXT_PUBLIC_ prefix; keep it in server env only).
   ========================================================================== */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { StoredIdentity } from "../types";
import type { QuestStore, WalletSubmission, LeaderboardRow, Referral } from "./store";

const COMPLETIONS = "quest_completions";
const SUBMISSIONS = "wallet_submissions";
const IDENTITIES = "quest_identities";
const REFERRALS = "quest_referrals";

export class SupabaseStore implements QuestStore {
  private db: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.db = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async getCompletions(sessionId: string): Promise<string[]> {
    const { data, error } = await this.db
      .from(COMPLETIONS)
      .select("task_id")
      .eq("session_id", sessionId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => r.task_id as string);
  }

  async markComplete(sessionId: string, taskId: string): Promise<void> {
    // onConflict on the (session_id, task_id) PK makes this idempotent.
    const { error } = await this.db
      .from(COMPLETIONS)
      .upsert(
        { session_id: sessionId, task_id: taskId },
        { onConflict: "session_id,task_id", ignoreDuplicates: true }
      );
    if (error) throw new Error(error.message);
  }

  async getSubmission(sessionId: string): Promise<WalletSubmission | null> {
    const { data, error } = await this.db
      .from(SUBMISSIONS)
      .select("wallet, submitted_at")
      .eq("session_id", sessionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return { wallet: data.wallet as string, at: new Date(data.submitted_at as string).getTime() };
  }

  async submitWallet(sessionId: string, wallet: string): Promise<void> {
    const { error } = await this.db
      .from(SUBMISSIONS)
      .upsert(
        { session_id: sessionId, wallet, submitted_at: new Date().toISOString() },
        { onConflict: "session_id" }
      );
    if (error) throw new Error(error.message);
  }

  async getIdentity(sessionId: string): Promise<StoredIdentity | null> {
    const { data, error } = await this.db
      .from(IDENTITIES)
      .select("mode, username, wallet")
      .eq("session_id", sessionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return {
      mode: data.mode as StoredIdentity["mode"],
      username: (data.username as string | null) ?? null,
      wallet: (data.wallet as string | null) ?? null,
    };
  }

  async setIdentity(sessionId: string, identity: StoredIdentity): Promise<void> {
    const { error } = await this.db.from(IDENTITIES).upsert(
      {
        session_id: sessionId,
        mode: identity.mode,
        username: identity.username,
        wallet: identity.wallet,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" }
    );
    if (error) throw new Error(error.message);
  }

  async clearIdentity(sessionId: string): Promise<void> {
    const { error } = await this.db.from(IDENTITIES).delete().eq("session_id", sessionId);
    if (error) throw new Error(error.message);
  }

  async getLeaderboard(): Promise<LeaderboardRow[]> {
    // Pre-launch scale: a handful of small tables, so fetch + aggregate in JS.
    // Revisit (SQL view / materialised aggregate) if the funnel gets huge.
    const [comps, subs, idents, refs] = await Promise.all([
      this.db.from(COMPLETIONS).select("session_id, task_id"),
      this.db.from(SUBMISSIONS).select("session_id, wallet"),
      this.db.from(IDENTITIES).select("session_id, username, wallet"),
      this.db.from(REFERRALS).select("session_id, code, referred_by"),
    ]);
    for (const r of [comps, subs, idents, refs]) if (r.error) throw new Error(r.error.message);

    const rows = new Map<string, LeaderboardRow>();
    const row = (sid: string) => {
      let r = rows.get(sid);
      if (!r) {
        r = { sessionId: sid, taskIds: [], submitted: false, username: null, wallet: null, code: null, referredBy: null };
        rows.set(sid, r);
      }
      return r;
    };
    for (const c of comps.data ?? []) row(c.session_id as string).taskIds.push(c.task_id as string);
    for (const s of subs.data ?? []) {
      const r = row(s.session_id as string);
      r.submitted = true;
      r.wallet = r.wallet ?? ((s.wallet as string | null) ?? null);
    }
    for (const i of idents.data ?? []) {
      const r = row(i.session_id as string);
      r.username = (i.username as string | null) ?? null;
      r.wallet = (i.wallet as string | null) ?? r.wallet;
    }
    for (const f of refs.data ?? []) {
      const r = row(f.session_id as string);
      r.code = (f.code as string | null) ?? null;
      r.referredBy = (f.referred_by as string | null) ?? null;
    }
    return [...rows.values()];
  }

  async getReferral(sessionId: string, mintCode: string): Promise<Referral> {
    const { data, error } = await this.db
      .from(REFERRALS)
      .select("code, referred_by")
      .eq("session_id", sessionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return { code: data.code as string, referredBy: (data.referred_by as string | null) ?? null };

    // None yet, mint one. ignoreDuplicates guards a concurrent first hit.
    const { error: insErr } = await this.db
      .from(REFERRALS)
      .upsert({ session_id: sessionId, code: mintCode }, { onConflict: "session_id", ignoreDuplicates: true });
    if (insErr) throw new Error(insErr.message);
    // Re-read in case a concurrent request won the insert with a different code.
    const { data: after, error: reErr } = await this.db
      .from(REFERRALS)
      .select("code, referred_by")
      .eq("session_id", sessionId)
      .maybeSingle();
    if (reErr) throw new Error(reErr.message);
    return after
      ? { code: after.code as string, referredBy: (after.referred_by as string | null) ?? null }
      : { code: mintCode, referredBy: null };
  }

  async setReferredBy(sessionId: string, byCode: string): Promise<void> {
    // Only set when currently null, never overwrite an existing attribution.
    const { error } = await this.db
      .from(REFERRALS)
      .update({ referred_by: byCode })
      .eq("session_id", sessionId)
      .is("referred_by", null);
    if (error) throw new Error(error.message);
  }

  async countReferrals(code: string): Promise<number> {
    const { count, error } = await this.db
      .from(REFERRALS)
      .select("session_id", { count: "exact", head: true })
      .eq("referred_by", code);
    if (error) throw new Error(error.message);
    return count ?? 0;
  }
}
