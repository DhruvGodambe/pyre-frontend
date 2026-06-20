/* ============================================================================
   PYRE, QuestStore interface  ("the one switch", DB edition)
   ----------------------------------------------------------------------------
   The persistence boundary for the quest funnel. Two implementations:

     • FileStore, a JSON file under .data/ (zero config, local dev only)
     • SupabaseStore, the real Postgres tables (production)

   lib/db/index.ts picks one based on env (Supabase keys present → Supabase).
   The API routes depend ONLY on this interface, so swapping dev↔prod storage is
   invisible to them, exactly like the mock↔chain DataSource switch.
   ========================================================================== */

import type { StoredIdentity } from "../types";

export interface WalletSubmission {
  wallet: string;
  at: number; // ms timestamp
}

/** Raw per-session progress for the quest (Ember) leaderboard. The Ember TOTAL
    is computed in the route from the catalog point values, kept out of the DB
    so changing a rite's worth doesn't need a migration. */
export interface LeaderboardRow {
  sessionId: string;
  taskIds: string[]; // completed "click" tasks
  submitted: boolean; // whether a wallet was submitted (the wallet-gated rite)
  username: string | null;
  wallet: string | null;
  code: string | null; // this session's referral code (if minted)
  referredBy: string | null; // the code that referred this session (if any)
}

/** A session's referral identity: its own shareable code + who referred it. */
export interface Referral {
  code: string;
  referredBy: string | null;
}

export interface QuestStore {
  /** Task ids this session has completed. */
  getCompletions(sessionId: string): Promise<string[]>;
  /** Idempotently mark a task complete for this session. */
  markComplete(sessionId: string, taskId: string): Promise<void>;
  /** The wallet this session submitted, if any. */
  getSubmission(sessionId: string): Promise<WalletSubmission | null>;
  /** Record (or replace) the wallet this session submitted. */
  submitWallet(sessionId: string, wallet: string): Promise<void>;
  /** How this session entered the funnel (wallet or named guest), if chosen. */
  getIdentity(sessionId: string): Promise<StoredIdentity | null>;
  /** Record (or replace) this session's identity choice. */
  setIdentity(sessionId: string, identity: StoredIdentity): Promise<void>;
  /** Forget this session's identity choice (e.g. "change how I enter"). */
  clearIdentity(sessionId: string): Promise<void>;

  /** Every session's raw progress, for the Ember leaderboard. */
  getLeaderboard(): Promise<LeaderboardRow[]>;

  /** This session's referral code + who referred it, minting a code if absent.
      `mintCode` is a fresh candidate the store uses only when none exists. */
  getReferral(sessionId: string, mintCode: string): Promise<Referral>;
  /** Record who referred this session (only if not already set). */
  setReferredBy(sessionId: string, byCode: string): Promise<void>;
  /** How many sessions a given referral code has brought in. */
  countReferrals(code: string): Promise<number>;
}
