-- Account deletion (right to erasure), plus the FK fix that currently makes it
-- impossible for most users.

-- `claimed_by` was ON DELETE NO ACTION, so deleting any user who had ever
-- accepted an invite link failed with an FK violation - including from the
-- Supabase dashboard. Set null instead of cascade: the invitation row is an
-- audit record of a burned link belonging to someone else's wedding, and the
-- owner should keep seeing that it was used even once the claimer is gone.
--
-- Deliberately not `drop constraint if exists`. Postgres allows two foreign
-- keys on the same column under different names and fires both on delete, so
-- a drop that quietly matched nothing followed by a successful add would leave
-- the old NO ACTION constraint in place: the migration reports success while
-- the users it exists to unblock stay undeletable. The name below is the one
-- Postgres assigns to the inline `references` in 20260422000001, so a mismatch
-- means the schema was changed outside migrations and the push should stop.
alter table public.wedding_invitations
  drop constraint wedding_invitations_claimed_by_fkey;

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

  -- Close the window between the check below and the delete. Both run in one
  -- READ COMMITTED transaction, but nothing here would otherwise block a
  -- concurrent claim_wedding_invitation from inserting a wedding_members row
  -- after we counted and before we cascade - handing someone access to a
  -- wedding milliseconds before it is destroyed underneath them, which is the
  -- exact outcome this function exists to prevent.
  --
  -- Locking the live invitations is enough because every claim has to take
  -- FOR UPDATE on its own invitation row first (see claim_wedding_invitation
  -- in 20260422000001), so the two serialize on the row they share:
  --   * we lock first -> the claim waits, then finds the invitation cascaded
  --     away and reports "invalid or expired". Nobody joins a dead wedding.
  --   * they lock first -> we wait, and the count below re-reads afterwards,
  --     sees the new member, and refuses.
  --
  -- Claimed and expired invitations are skipped: neither can produce a new
  -- member, so locking them would only widen the blast radius.
  perform 1
  from public.wedding_invitations i
  where i.claimed_at is null
    and i.expires_at > now()
    and exists (
      select 1
      from public.weddings w
      where w.id = i.wedding_id
        and w.owner_id = auth.uid()
    )
  for update;

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

  -- The client's success path signs the user out and tells them the account is
  -- gone, so a delete that matched nothing must not return void quietly. It
  -- can't happen today - `postgres` has BYPASSRLS, so the RLS on auth.users
  -- doesn't filter this - but that's a role attribute owned by the platform,
  -- not by us, and if it ever changes the failure mode is telling someone their
  -- data is erased when it isn't. Same rule the client already applies to its
  -- own deletes (see weddings.ts, useWeddingMembers): 0 rows is a failure.
  if not found then
    raise exception 'account_not_deleted'
      using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
