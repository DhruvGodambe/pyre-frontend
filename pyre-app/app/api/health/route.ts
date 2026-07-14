/* GET /api/health, does the deployment that is actually RUNNING have a database?

   The store selector falls back to a local JSON file when the Supabase env vars are
   missing (see lib/db/index.ts). On Vercel's serverless filesystem that fallback is
   ephemeral, so the funnel would appear to work and then quietly lose every Ember.
   And it fails SILENTLY: nothing throws, nothing logs, the Embers just evaporate.

   Checking the Vercel dashboard is not enough to rule that out. A variable can exist
   and still not be in the running deployment, because env changes only reach a build on
   redeploy. So this asks the deployment itself, and it does not merely read the env: it
   makes a real round-trip to the database, because a URL and a key that are present but
   wrong look exactly like a URL and a key that work.

   Leaks nothing: no URL, no key, no visitor data. Public on purpose, so it can be
   checked against production without a login. */

import { NextResponse } from "next/server";
import { getQuestStore, isSupabaseConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const configured = isSupabaseConfigured();
  const store = configured ? "supabase" : "file";

  // Prove the connection, don't just trust the env. Reading a session id that cannot
  // exist is a real query, and it writes nothing.
  let reachable = false;
  let error: string | null = null;
  try {
    await getQuestStore().getCompletions("__health__");
    reachable = true;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const ok = configured && reachable;
  return NextResponse.json(
    {
      ok,
      store,
      reachable,
      error,
      // Spelled out, so nobody has to interpret a boolean at 3am before a launch.
      verdict: ok
        ? "Database live. Embers are persisted."
        : configured
          ? "Supabase is configured but UNREACHABLE. Embers are NOT being saved."
          : "NO DATABASE. Falling back to the ephemeral file store: Embers will be LOST.",
    },
    { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } }
  );
}
