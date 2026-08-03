-- Leaving a wedding you were invited to, and the owner-integrity guards that
-- come with it. Membership churn is only safe if a wedding always has exactly
-- one owner who is also a member of it: the policies below stop an owner
-- deleting themselves out of their own wedding, and the trigger at the bottom
-- stops anyone else being written into weddings.owner_id.
--
-- Until now the only DELETE policy on wedding_members was "owners can remove
-- members", so an editor or viewer could not disassociate themselves from a
-- wedding at all - their only exit was deleting their whole account. That's
-- the wrong shape for a shared plan someone was invited into, and it makes
-- the account-deletion flow's advice impossible to follow.
--
-- Owners are excluded: weddings.owner_id would still point at them, leaving a
-- wedding whose owner isn't a member of it. Owners delete the wedding instead
-- (the "owners can delete weddings" policy already allows that).
create policy "members can remove themselves"
  on public.wedding_members for delete
  using (user_id = auth.uid() and role <> 'owner');

-- The `role <> 'owner'` guard above is not enough on its own: permissive
-- policies are OR'd, and "owners can remove members" matched *every* row in
-- the owner's wedding - including the owner's own membership. An owner could
-- therefore delete themselves out of their own wedding, leaving owner_id
-- pointing at a non-member who then fails is_wedding_member() and loses
-- access to their own halls, tables and guests.
--
-- Re-created excluding the caller's own row. Removing yourself is now only
-- reachable through the policy above, which owners can't satisfy.
drop policy "owners can remove members" on public.wedding_members;

create policy "owners can remove members"
  on public.wedding_members for delete
  using (
    user_id <> auth.uid()
    and exists (
      select 1 from public.weddings w
      where w.id = wedding_members.wedding_id
        and w.owner_id = auth.uid()
    )
  );

-- weddings.owner_id must be immutable from the client, and until now it wasn't.
--
-- 20260418000002 tried to lock it with `revoke update (owner_id) on
-- public.weddings from authenticated`. That line does nothing: hosted Supabase
-- grants `authenticated` *table-level* UPDATE on every public table through
-- default privileges, and a column-level revoke cannot subtract from a
-- table-level grant - the column privilege was never separately granted, so
-- there is nothing to revoke. (Locally it looks like it works only because a
-- fresh `supabase db reset` leaves `authenticated` with no CRUD grants at all.)
--
-- Nor does RLS catch it. "owners and editors can update weddings" has USING but
-- no WITH CHECK, so Postgres reuses USING as the check - and an editor writing
-- their own id into owner_id still passes it, because the row id is unchanged
-- and they are still an editor of that wedding. The full chain: editor sets
-- owner_id to themselves, uses "owners can remove members" to evict the real
-- owner, and now holds a wedding they can delete outright from the wedding list
-- UI, taking the hall, tables and entire guest list with it.
--
-- A policy can't express the fix - WITH CHECK has no access to OLD - so the
-- guard is a trigger.
create function public.enforce_wedding_owner_immutable()
returns trigger
language plpgsql
as $$
begin
  -- Only client roles are blocked. Ownership transfer is a legitimate operation
  -- (handing a plan to a co-owner, a venue passing an event on); it just has to
  -- go through a `security definer` RPC, which runs as postgres and passes here.
  if new.owner_id is distinct from old.owner_id
     and current_user in ('authenticated', 'anon') then
    raise exception 'owner_id is immutable'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger weddings_owner_immutable
  before update on public.weddings
  for each row execute function public.enforce_wedding_owner_immutable();
