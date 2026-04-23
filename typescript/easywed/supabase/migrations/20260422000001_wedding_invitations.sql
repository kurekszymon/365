-- wedding_invitations: owner-created invite tokens that let another user
-- join a wedding as editor or viewer. Shareable link, claimed by the
-- recipient after they sign up / sign in.
create table public.wedding_invitations (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  role text not null check (role in ('editor', 'viewer')),
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  invited_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '14 days'),
  claimed_at timestamptz,
  claimed_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index wedding_invitations_wedding_id_idx on public.wedding_invitations (wedding_id);
create index wedding_invitations_token_idx on public.wedding_invitations (token);

alter table public.wedding_invitations enable row level security;

-- Owners see invites for their wedding. Invitees don't need SELECT: they
-- claim via the SECURITY DEFINER function below, which bypasses RLS.
create policy "owners view invites" on public.wedding_invitations
  for select
  using (
    exists (
      select 1 from public.weddings w
      where w.id = wedding_id and w.owner_id = auth.uid()
    )
  );

create policy "owners create invites" on public.wedding_invitations
  for insert
  with check (
    invited_by = auth.uid()
    and exists (
      select 1 from public.weddings w
      where w.id = wedding_id and w.owner_id = auth.uid()
    )
  );

create policy "owners delete invites" on public.wedding_invitations
  for delete
  using (
    exists (
      select 1 from public.weddings w
      where w.id = wedding_id and w.owner_id = auth.uid()
    )
  );

-- Claim an invite by token. Security definer so the authenticated user
-- can insert into wedding_members without needing direct INSERT access
-- (which is reserved for owners). Matches the pattern in 20260416000001.
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

  -- FOR UPDATE serializes concurrent claims on the same token, preventing
  -- two simultaneous requests from both passing the unclaimed check.
  select * into inv
  from public.wedding_invitations
  where token = _token
    and claimed_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Invitation invalid or expired';
  end if;

  -- Idempotent: if already a member, preserve existing role (e.g. owner
  -- stays owner even if invited as editor).
  insert into public.wedding_members (wedding_id, user_id, role)
  values (inv.wedding_id, auth.uid(), inv.role)
  on conflict (wedding_id, user_id) do nothing;

  -- Only burn the invite if this call actually created a membership.
  -- Otherwise someone already-joined clicking the link would consume it
  -- and lock out the intended recipient.
  if found then
    update public.wedding_invitations
    set claimed_at = now(), claimed_by = auth.uid()
    where id = inv.id;
  end if;

  return inv.wedding_id;
end;
$$;

revoke all on function public.claim_wedding_invitation(text) from public;
grant execute on function public.claim_wedding_invitation(text) to authenticated;
