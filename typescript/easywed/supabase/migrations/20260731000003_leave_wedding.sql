-- Leaving a wedding you were invited to.
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
