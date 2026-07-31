-- Account deletion (right to erasure), plus the FK fix that currently makes it
-- impossible for most users.

-- `claimed_by` was ON DELETE NO ACTION, so deleting any user who had ever
-- accepted an invite link failed with an FK violation - including from the
-- Supabase dashboard. Set null instead of cascade: the invitation row is an
-- audit record of a burned link belonging to someone else's wedding, and the
-- owner should keep seeing that it was used even once the claimer is gone.
-- `if exists` so a name that doesn't match Postgres' default (a constraint
-- created by hand at some point) fails the ALTER below with a clear error
-- instead of aborting the whole push here.
alter table public.wedding_invitations
  drop constraint if exists wedding_invitations_claimed_by_fkey;

alter table public.wedding_invitations
  add constraint wedding_invitations_claimed_by_fkey
  foreign key (claimed_by) references auth.users(id) on delete set null;

-- Deleting your own account. Security definer because auth.users is not
-- reachable by `authenticated`, and the service role key that could do this
-- from the client must never leave the server.
--
-- Refuses while the caller owns a wedding someone else can access.
-- weddings.owner_id is ON DELETE CASCADE, so going ahead would silently take
-- the hall, tables and every guest with it - for the co-owner, planner or
-- venue too. Their data is not the caller's to erase. Solo weddings do
-- cascade away: those are only the caller's.
create function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  blocking int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select count(*) into blocking
  from public.weddings w
  where w.owner_id = auth.uid()
    and exists (
      select 1
      from public.wedding_members m
      where m.wedding_id = w.id
        and m.user_id <> auth.uid()
    );

  if blocking > 0 then
    -- The client catches this code to show the "which weddings" list rather
    -- than a raw error; it re-queries them itself (RLS already lets an owner
    -- read their own weddings and members).
    raise exception 'account_has_shared_weddings'
      using errcode = 'P0001';
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
