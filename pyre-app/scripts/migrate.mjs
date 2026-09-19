

/* ============================================================================
   PYRE, Supabase migration runner  ("apply schema from here")
   ----------------------------------------------------------------------------
   Applies a .sql file to the Supabase project using ONLY the service-role key
   already in .env.local, so schema changes can be shipped without dashboard
   access. It works by calling a tiny `public.exec_sql(text)` RPC that runs DDL
   server-side (created once, see scripts/bootstrap-exec-sql.sql).

   Usage (from pyre-app/):
     node scripts/migrate.mjs                 # applies lib/db/schema.sql
     node scripts/migrate.mjs path/to/x.sql   # applies a specific file

   schema.sql is idempotent (create table IF NOT EXISTS …), so re-running is
   safe: existing tables/indexes are left untouched, missing ones are created.
   ========================================================================== */

import { readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

/** Minimal .env.local reader (no dependency). KEY=VALUE per line, # comments. */
async function loadEnv() {
  const raw = await readFile(path.join(ROOT, ".env.local"), "utf8").catch(() => "");
  const env = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trimStart().startsWith("#")) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

/** Split a .sql file into individual statements. schema.sql is plain DDL (no
    functions / dollar-quoting / semicolons inside strings), so a top-level
    split on ';' is correct here; comments are stripped first. */
function splitStatements(sql) {
  return sql
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function execSql(url, key, sql) {
  const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      // Supabase blocks the service (secret) key from browser-like requests.
      "User-Agent": "pyre-migrate/1.0",
    },
    body: JSON.stringify({ sql }),
  });
  const text = await res.text();
  if (!res.ok) {
    const hint =
      res.status === 404
        ? "\n  → exec_sql RPC not found. Run scripts/bootstrap-exec-sql.sql in the Supabase SQL editor once."
        : "";
    throw new Error(`HTTP ${res.status}: ${text}${hint}`);
  }
  return text;
}

async function main() {
  const env = await loadEnv();
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const file = process.argv[2] ?? "lib/db/schema.sql";
  const sql = await readFile(path.resolve(ROOT, file), "utf8");
  const statements = splitStatements(sql);
  console.log(`Applying ${statements.length} statement(s) from ${file} …`);

  for (const [i, stmt] of statements.entries()) {
    const label = stmt.replace(/\s+/g, " ").slice(0, 70);
    try {
      await execSql(url, key, stmt);
      console.log(`  ✓ [${i + 1}/${statements.length}] ${label}`);
    } catch (e) {
      console.error(`  ✗ [${i + 1}/${statements.length}] ${label}\n    ${e.message}`);
      process.exit(1);
    }
  }

  // Tell PostgREST to refresh its schema cache so new tables are queryable now.
  await execSql(url, key, "notify pgrst, 'reload schema'").catch(() => {});
  console.log("Done. PostgREST schema cache reload requested.");
}

main();
