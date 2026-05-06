-- Replace claim_wedding_invitation so that a freshly-onboarded user arriving
-- via an invite link is silently classified as 'couple'. The invite link is
-- effectively a couple-onboarding shortcut: skip the role picker and drop
-- straight onto the wedding.
--
-- The REVOKE on profiles.user_type only blocks plain authenticated UPDATEs;
-- this function runs as SECURITY DEFINER so the direct UPDATE is permitted.
create or replace function public.claim_wedding_invitation(_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.wedding_invitations%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into inv
  from public.wedding_invitations
  where token = _token
    and claimed_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Invitation invalid or expired';
  end if;

  insert into public.wedding_members (wedding_id, user_id, role)
  values (inv.wedding_id, auth.uid(), inv.role)
  on conflict (wedding_id, user_id) do nothing;

  -- Only burn the invite if this call actually created a membership.
  if found then
    update public.wedding_invitations
    set claimed_at = now(), claimed_by = auth.uid()
    where id = inv.id;

    update public.profiles
    set user_type = 'couple', updated_at = now()
    where id = auth.uid() and user_type is null;
  end if;

  return inv.wedding_id;
end;
$$;
