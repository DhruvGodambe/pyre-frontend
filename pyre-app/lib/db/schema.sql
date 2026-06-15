-- ============================================================================
-- PYRE — Quest funnel schema (Supabase / Postgres)
-- ----------------------------------------------------------------------------
-- Run this once in the Supabase project: Dashboard → SQL Editor → paste → Run.
-- Stores only per-visitor state; task DEFINITIONS live in code
-- (lib/quests/catalog.ts). All access is server-side via the service role key,
-- which bypasses RLS — so we enable RLS with NO public policies to deny the
-- anon/public keys by default.
-- ============================================================================

-- Which tasks a session has completed.
create table if not exists public.quest_completions (
  session_id   text        not null,
  task_id      text        not null,
  completed_at timestamptz not null default now(),
  primary key (session_id, task_id)
);

-- The wallet a session submitted to receive its multiplier.
create table if not exists public.wallet_submissions (
  session_id   text        primary key,
  wallet       text        not null,
  submitted_at timestamptz not null default now()
);

-- Look up sessions by submitted wallet (e.g. when allocating boosts at launch).
create index if not exists wallet_submissions_wallet_idx
  on public.wallet_submissions (lower(wallet));

-- How a session entered the funnel: a connected wallet, or a named guest.
-- Persisted so the choice (and guest name) survives a hard refresh server-side.
create table if not exists public.quest_identities (
  session_id text        primary key,
  mode       text        not null check (mode in ('wallet', 'guest')),
  username   text,
  wallet     text,
  updated_at timestamptz not null default now()
);

-- Referrals: each session's own shareable code + who referred it (if anyone).
create table if not exists public.quest_referrals (
  session_id  text        primary key,
  code        text        not null unique,
  referred_by text,
  created_at  timestamptz not null default now()
);
create index if not exists quest_referrals_referred_by_idx
  on public.quest_referrals (referred_by);

-- Lock down: enable RLS, add no policies. The service-role key (server only)
-- bypasses RLS; anon/public keys get nothing.
alter table public.quest_completions  enable row level security;
alter table public.wallet_submissions enable row level security;
alter table public.quest_identities   enable row level security;
alter table public.quest_referrals    enable row level security;
