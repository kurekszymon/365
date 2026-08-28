-- tenant_invitations: the token flow that lets a venue invite someone, and lets
-- the invited person be the one who joins.
--
-- This closes the gap left open in two places, both of which should be read
-- before this file:
--
--   * 20260817000001 section 4, which removed the INSERT policy on
--     tenant_members and explained why a venue naming a stranger's uuid is not
--     an invitation;
--   * 20260817000002 section 3, which notes that `link_wedding_to_venue`'s
--     invitation-only branch looks for exactly the `tenant_members` row that
--     nothing could then write, so an invitation-only venue - which is the
--     default, since `open_linking` defaults false - could not be linked to at
--     all without a hand-inserted row.
--
-- The shape is `wedding_invitations` (20260422000001) with the nouns changed,
-- and the parallel is deliberate rather than incidental: the same three
-- properties are what make it safe on both sides.
--
--   1. The row the venue writes names no user. It carries a token and a role,
--      and `claimed_by` stays null until someone claims it.
--   2. The claim is made by the *recipient*, calling a definer RPC with their
--      own session. That call is the consent - a `tenant_members` row is what
--      hands the venue this person's `profiles.display_name` through
--      `staff_can_view_profile`, so the person who is disclosed has to be the
--      one who acts.
--   3. Invitees need no SELECT on this table. `claim_tenant_invitation` runs as
--      definer and reads the row itself, so holding a token grants nothing but
--      the ability to spend it.
--
-- What a claimed invitation is worth is *not* symmetrical with the wedding
-- side, and the difference is the whole reason this needed thought rather than
-- a find-and-replace:
--
--   'customer'  buys the couple exactly one thing - the ability to call
--               `link_wedding_to_venue` for this venue. It grants no read of
--               any wedding, and it is emphatically not the art. 9(2)(a)
--               consent: that is still a separate `set_venue_access(true)`
--               against a dialog that names what is disclosed. Linking a
--               wedding lands it in 'pending', which discloses nothing.
--
--   'staff'     buys the whole CRM: this venue's entire roster, and the seat map
--               of every wedding whose couple has granted access. That is the
--               reason for the role split on INSERT below.

-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------
-- 'owner' is absent from the CHECK for the same reason it is absent from
-- wedding_invitations' ('editor','viewer'): there is exactly one, it is set at
-- provisioning time, and a role that can rewrite the tenant's branding is not
-- something to hand out over a link. Transferring a venue goes the way the rest
-- of provisioning goes.
create table public.tenant_invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role text not null check (role in ('staff', 'customer')),
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  invited_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '14 days'),
  claimed_at timestamptz,
  -- `set null`, not the bare `references` wedding_invitations shipped with in
  -- 20260422000001: that one was ON DELETE NO ACTION, which made every user who
  -- had ever claimed a link undeletable (23503 out of delete_own_account), and
  -- 20260731000002 had to repair it. Not cascade - the row is the venue's audit
  -- record of a burned link, and staff should keep seeing it was spent once the
  -- claimer is gone. `invited_by` above cascades because that row is the
  -- departing staff member's own.
  claimed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index tenant_invitations_tenant_id_idx
  on public.tenant_invitations (tenant_id);
create index tenant_invitations_token_idx
  on public.tenant_invitations (token);

-- The two `auth.users` references, indexed because deleting an account walks
-- both of them - `delete_own_account` (20260731000002) has to cascade the rows
-- a departing staff member issued and null the ones they claimed, and neither
-- referential action can use the indexes above.
create index tenant_invitations_invited_by_idx
  on public.tenant_invitations (invited_by);
create index tenant_invitations_claimed_by_idx
  on public.tenant_invitations (claimed_by);

-- ---------------------------------------------------------------------------
-- 2. RLS
-- ---------------------------------------------------------------------------
alter table public.tenant_invitations enable row level security;

-- Staff manage their own tenant's invitations; nobody else reads the table.
-- `is_tenant_staff` rather than `is_tenant_member`, so a 'customer' of the venue
-- cannot enumerate live tokens for it - each one is a bearer credential.
create policy "staff view their tenant's invitations"
  on public.tenant_invitations for select
  using (public.is_tenant_staff(tenant_id));

-- The role split, and it is the one judgement call in this file.
--
-- Any staff member may invite a 'customer': that is the daily job, it is what
-- unblocks a couple who wants to link, and the grant it eventually produces is
-- bounded - the couple can link, and nothing else happens without a separate
-- act by that couple.
--
-- Only the owner may invite 'staff', because a staff row is a key to the whole
-- CRM: the venue's full roster, plus the seat map and dietary tags of every
-- wedding that has granted access. Handing that out is a decision about the
-- business, not a booking.
--
-- Note this is deliberately the opposite asymmetry to the DELETE policy in
-- 20260817000001, where any staff member may remove another. That is not an
-- inconsistency: removal subtracts access and is recoverable by the owner,
-- creation adds it and is not something a compromised or departing staff
-- account should be able to do on the way out.
--
-- `invited_by = auth.uid()` mirrors wedding_invitations and keeps the audit
-- column honest - without it the inserter could attribute the invite to a
-- colleague.
create policy "staff create invitations"
  on public.tenant_invitations for insert
  with check (
    invited_by = auth.uid()
    and public.is_tenant_staff(tenant_id)
    and (role = 'customer' or public.tenant_role(tenant_id) = 'owner')
  );

-- Revoking an unclaimed invitation is ordinary roster work, so any staff member
-- may do it. Deleting a *claimed* row does not remove the membership it created
-- - that is a tenant_members delete - which matches the wedding side and is why
-- the CRM revokes only pending rows.
create policy "staff delete invitations"
  on public.tenant_invitations for delete
  using (public.is_tenant_staff(tenant_id));

-- No UPDATE policy. Every mutable field here is written by the definer function
-- below; a client-editable `expires_at` or `role` would let a stale invitation
-- be silently upgraded after the fact.

-- ---------------------------------------------------------------------------
-- 3. Members can leave
-- ---------------------------------------------------------------------------
-- Added here rather than in 20260817000001 because until this migration nobody
-- could join by consent, so nobody was stuck. Now that a couple can put
-- themselves into `tenant_members`, they must be able to take themselves out:
-- `tenant_members_one_per_user` is a unique index, so a membership with no exit
-- would permanently bar them from ever joining a different venue, and a consent
-- that cannot be withdrawn is not one.
--
-- 'owner' is excluded, matching the staff-removal policy in 20260817000001 -
-- an owner leaving would orphan the tenant, and retiring a venue is a
-- provisioning operation.
--
-- Leaving does *not* touch any wedding. `tenant_id` and `venue_access` on
-- `weddings` are owned by their own two RPCs, and the honest reading is that
-- they are separate decisions: dropping a venue's customer row does not
-- withdraw the art. 9(2)(a) consent, and `set_venue_access(false)` does not
-- resign the membership. The CRM and the couple's venue dialog each offer the
-- one that belongs to them.
create policy "members can leave their tenant"
  on public.tenant_members for delete
  using (user_id = auth.uid() and role <> 'owner');

-- ---------------------------------------------------------------------------
-- 4. claim_tenant_invitation
-- ---------------------------------------------------------------------------
-- Definer for the reason claim_wedding_invitation is: `tenant_members` has no
-- INSERT policy at all, and gaining one is precisely what must not happen. The
-- table stays closed to clients; this function is the single door, and it only
-- ever writes a row for `auth.uid()`.
--
-- Returns the tenant id so the caller can re-read the venue it just joined in
-- one round trip.
--
-- Refusals carry distinct SQLSTATEs, following `link_wedding_to_venue`
-- (20260817000002) and for the same reason: the client renders a different
-- sentence for each, and a SQLSTATE is the only part of a PostgREST error that
-- is a contract. Matching on message text is one reword away from collapsing
-- into a generic retry prompt.
--
--   PT404  no such invitation, already claimed, or expired
--   PT409  this account already belongs to a different venue
--
-- PT409 is the one that genuinely needs its own sentence. It is not a typo the
-- user can fix by retrying - `tenant_members_one_per_user` allows exactly one
-- membership per account, so the only way forward is to leave the other venue
-- or use a different account, and nothing in a generic failure says that.
create function public.claim_tenant_invitation(_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.tenant_invitations%rowtype;
  v_existing_tenant uuid;
  v_joined boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  -- FOR UPDATE serializes concurrent claims on one token, so two simultaneous
  -- requests cannot both pass the unclaimed check.
  select * into inv
  from public.tenant_invitations
  where token = _token
    and claimed_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Invitation invalid or expired' using errcode = 'PT404';
  end if;

  select tenant_id into v_existing_tenant
  from public.tenant_members
  where user_id = auth.uid();

  if v_existing_tenant is not null and v_existing_tenant <> inv.tenant_id then
    raise exception 'This account already belongs to another venue'
      using errcode = 'PT409';
  end if;

  -- Idempotent on the tenant's own primary key, and the existing role wins -
  -- same rule as claim_wedding_invitation, where an owner clicking an editor
  -- link stays an owner. Here it means a 'staff' member who follows a customer
  -- link does not demote themselves.
  --
  -- The nested block closes the race the check above cannot: between that
  -- SELECT and this INSERT, another session could have joined this account to a
  -- different tenant, which trips tenant_members_one_per_user rather than the
  -- primary key and so is not absorbed by ON CONFLICT. Translating it to PT409
  -- keeps one cause reporting as one error.
  begin
    insert into public.tenant_members (tenant_id, user_id, role)
    values (inv.tenant_id, auth.uid(), inv.role)
    on conflict (tenant_id, user_id) do nothing;

    v_joined := found;
  exception
    when unique_violation then
      raise exception 'This account already belongs to another venue'
        using errcode = 'PT409';
  end;

  -- Only burn the invitation if this call actually created the membership.
  -- Otherwise someone already on the roster following the link would consume it
  -- and lock out the person it was meant for.
  if v_joined then
    update public.tenant_invitations
    set claimed_at = now(), claimed_by = auth.uid()
    where id = inv.id;
  end if;

  return inv.tenant_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Grants
-- ---------------------------------------------------------------------------
-- Authorizes its own caller and is meaningless without a session. `revoke ...
-- from public` first, because on a fresh local database `authenticated` may
-- hold EXECUTE via PUBLIC rather than an explicit grant - the shape established
-- in 20260806000001.
--
-- Not a policy helper, so the segfault caveat in 20260817000001's header does
-- not apply: nothing evaluates this inside an RLS expression, and `anon` has no
-- reason to reach it.
revoke all on function public.claim_tenant_invitation(text) from public, anon;
grant execute on function public.claim_tenant_invitation(text) to authenticated;
