-- Take EXECUTE on every `security definer` function away from `anon`.
--
-- Why this is needed at all, given that the RPCs in 20260422000001,
-- 20260531000002, 20260731000002 and 20260804000002 already say
-- `revoke all on function ... from public`: hosted Supabase ships
--
--   alter default privileges in schema public
--     grant all on functions to postgres, anon, authenticated, service_role;
--
-- so a function created in `public` picks up *explicit* grants to `anon` and
-- `authenticated` on top of the implicit PUBLIC one. Revoking from PUBLIC does
-- not subtract an explicit role grant, so those RPCs stayed anon-callable on
-- remote. Same class of mistake as `revoke update (owner_id)` in
-- 20260418000002 (see the post-mortem in 20260731000003). Locally it looks
-- like the old revokes worked, because a fresh `supabase db reset` never
-- applies those default privileges.

-- 1. Trigger functions. Nothing should ever call these directly - PostgreSQL
--    checks EXECUTE at CREATE TRIGGER time, not when the trigger fires, so
--    revoking from every client role does not affect the triggers themselves.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.handle_new_wedding() from public, anon, authenticated;
revoke all on function public.enforce_entity_hall_wedding() from public, anon, authenticated;

-- 2. RPCs. These are meant for signed-in callers only; each one already does
--    its own authorization, but there is no reason for the grant to exist.
revoke all on function public.claim_wedding_invitation(text) from public, anon;
revoke all on function public.delete_own_account() from public, anon;
revoke all on function public.replace_planner_layout(uuid, jsonb, jsonb, jsonb) from public, anon;
revoke all on function public.save_table(
  uuid, text, text, integer, numeric, numeric, integer, jsonb, jsonb, jsonb
) from public, anon;

-- Re-assert the intended grants: the revokes above are broad, and on a fresh
-- local database `authenticated` may hold its EXECUTE via PUBLIC rather than
-- an explicit grant, which `revoke ... from public` would have stripped.
grant execute on function public.claim_wedding_invitation(text) to authenticated;
grant execute on function public.delete_own_account() to authenticated;
grant execute on function public.replace_planner_layout(uuid, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.save_table(
  uuid, text, text, integer, numeric, numeric, integer, jsonb, jsonb, jsonb
) to authenticated;

-- 3. The policy helpers - is_wedding_member, wedding_role, shares_wedding_with
--    - are deliberately NOT touched here, and splinter will keep flagging all
--    three. Do not "fix" them without reading this first.
--
--    They are not RPCs. They are evaluated inside RLS policy expressions,
--    which run as the querying role, and none of the 35 policies in this
--    schema carry a `to` clause - so they default to `to public` and `anon`
--    reaches them on any unauthenticated SELECT.
--
--    Revoking anon's EXECUTE does not produce a 42501. It **segfaults the
--    backend**: signal 11, every anon SELECT on a table whose policy calls the
--    helper. Measured on PostgreSQL 17.6 (the current Supabase image),
--    deterministic, and it reproduces from a fresh connection in a separate
--    transaction - so this is a production outage on every unauthenticated
--    read, not a same-transaction artifact. Postgres restarts and recovers,
--    then crashes again on the next such read.
--
--    There is no security gain to weigh against that anyway: every one of the
--    three filters on `= auth.uid()`, so for anon they are constant
--    false/null and disclose nothing. The warning is about the grant, not
--    about reachable data.
--
--    This is the same conclusion the note at the top of 20260731000001
--    already reached for shares_wedding_with; it applies verbatim to the
--    other two.
