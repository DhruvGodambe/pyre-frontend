/* ============================================================================
   PYRE — Quest storage selector  ("the switch", DB edition)
   ----------------------------------------------------------------------------
   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY present → real Supabase Postgres.
   Otherwise                                        → local JSON file store.

   So the funnel works on your machine with zero setup, and goes live the moment
   the two Supabase env vars are set (locally in .env.local, in prod via the
   Vercel project's environment variables). Nothing else changes.
   ========================================================================== */

import type { QuestStore } from "./store";
import { FileStore } from "./file-store";
import { SupabaseStore } from "./supabase-store";

let instance: QuestStore | null = null;

export function getQuestStore(): QuestStore {
  if (instance) return instance;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  instance = url && key ? new SupabaseStore(url, key) : new FileStore();
  return instance;
}

/** True when the real database is wired (useful for health checks / logging). */
export function isSupabaseConfigured(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export type { QuestStore } from "./store";
