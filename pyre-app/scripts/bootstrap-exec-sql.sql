-- ============================================================================
-- PYRE, one-time bootstrap: the exec_sql migration RPC
-- ----------------------------------------------------------------------------
-- Run this ONCE in the Supabase SQL editor (Dashboard → SQL Editor → Run).
-- After this, scripts/migrate.mjs can apply any schema change using only the
-- service-role key in .env.local, with no dashboard access required.
--
-- SECURITY: this runs arbitrary SQL server-side, so it is locked to the
-- service_role ONLY (revoked from anon/authenticated/public). The service-role
-- key is server-only (never NEXT_PUBLIC), and already grants full table access
-- via PostgREST, so this adds DDL capability for an already-trusted key, not a
-- new exposure surface. Do not grant it to anon/authenticated.
-- ============================================================================

create or replace function public.exec_sql(sql text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  execute sql;
end;
$$;

revoke all on function public.exec_sql(text) from public;
revoke all on function public.exec_sql(text) from anon;
revoke all on function public.exec_sql(text) from authenticated;
grant execute on function public.exec_sql(text) to service_role;

-- Refresh PostgREST so the new function is callable immediately.
notify pgrst, 'reload schema';
