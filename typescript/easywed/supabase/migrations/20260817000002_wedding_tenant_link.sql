-- Linking a wedding to a venue, and the two-step consent that gates it.
--
-- The second half of v2's data model, and deliberately still inert: this
-- migration adds the *link* and the *state machine*, and changes no read
-- policy on the wedding tree. Nothing a venue can see moves until
-- 20260817000003 derives the 'venue' role. Applying this alone is a no-op for
-- every existing user - both new columns default to "not linked, no access".
--
-- The state machine, on public.weddings:
--
--   tenant_id     null  -> this wedding belongs to no venue.
--   venue_access  'none'     -> no access. Either never linked, or the couple
--                              said no / revoked.
--                'pending'  -> linked, and the venue is waiting on the couple.
--                              *Discloses nothing* - 20260817000003's derived
--                              role requires 'granted', so a pending wedding is
--                              invisible to venue staff, exactly as
--                              privacy.venue.intro promises ("samo powiazanie
--                              niczego nie ujawnia").
--                'granted'  -> the couple gave explicit consent. This is the
--                              art. 9(2)(a) condition for the dietary tags, so
--                              it is the one transition the recipient of the
--                              data may not perform for the data subject - see
--                              set_venue_access below.
--
-- Both columns are written *only* by the two definer RPCs here. The trigger at
-- the bottom is what makes that true rather than merely intended.

-- ---------------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------------
-- `on delete set null` rather than cascade, and the asymmetry is the point: a
-- retired venue must not take a couple's wedding with it. The wedding survives
-- unlinked. venue_access is left behind pointing at nothing, which the CHECK
-- permits and which reads correctly - see the trigger comment for why that
-- residue cannot be exploited.
alter table public.weddings
  add column tenant_id uuid references public.tenants(id) on delete set null,
  add column venue_access text not null default 'none'
    check (venue_access in ('none', 'pending', 'granted'));

-- The CRM lists its own weddings by tenant, and 20260817000003's derived role
-- reads weddings.tenant_id on every policy evaluation that misses
-- wedding_members. Both want this index.
create index weddings_tenant_id_idx on public.weddings (tenant_id);

-- ---------------------------------------------------------------------------
-- 2. Neither column is client-writable
-- ---------------------------------------------------------------------------
-- Modelled on enforce_wedding_owner_immutable (20260731000003) and
-- enforce_tenant_immutable_columns (20260817000001), and necessary for exactly
-- the same reason spelled out there: a column-level `revoke update` is a no-op
-- against hosted Supabase's table-level grant to `authenticated`, and the
-- UPDATE policy cannot help either - `with check` has no access to OLD, and the
-- caller is a legitimate owner/editor of the row in any case.
--
-- INSERT is covered as well as UPDATE, and that half is load-bearing rather
-- than belt-and-braces. "authenticated users can create their own weddings"
-- checks only `owner_id = auth.uid()`, so without this a couple could POST a
-- brand-new wedding with `tenant_id` already set and `venue_access` already
-- 'granted' - straight past link_wedding_to_venue, which is the only thing that
-- enforces tenants.open_linking. Every venue's queue would be fillable by
-- anyone who can guess a slug, which is anyone, because slugs are hostnames.
--
-- Gated on current_user so the two definer RPCs below - and manual `psql`
-- provisioning, and seed.sql - run as postgres and pass straight through.
create function public.enforce_wedding_tenant_columns()
returns trigger
language plpgsql
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  -- OLD is unassigned on INSERT, so the two operations are handled apart
  -- rather than through one `is distinct from`.
  if tg_op = 'INSERT' then
    if new.tenant_id is not null then
      raise exception 'weddings.tenant_id is not client-writable'
        using errcode = '42501';
    end if;
    if new.venue_access <> 'none' then
      raise exception 'weddings.venue_access is not client-writable'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.tenant_id is distinct from old.tenant_id then
    raise exception 'weddings.tenant_id is not client-writable'
      using errcode = '42501';
  end if;

  if new.venue_access is distinct from old.venue_access then
    raise exception 'weddings.venue_access is not client-writable'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger weddings_tenant_columns_immutable
  before insert or update on public.weddings
  for each row execute function public.enforce_wedding_tenant_columns();

-- ---------------------------------------------------------------------------
-- 3. link_wedding_to_venue
-- ---------------------------------------------------------------------------
-- Owner-only, and never grants anything: it lands the wedding in 'pending',
-- which discloses nothing. The couple then grants separately, through a dialog
-- that names exactly what will be shared. Splitting link from grant is what
-- makes the consent a deliberate act rather than a side effect of typing a
-- venue's name.
--
-- Owner rather than owner-or-editor because this is a disclosure decision about
-- the couple's guests, not a planning edit. An editor may move every table in
-- the room; handing the guest list's dietary tags to a third party is not the
-- same kind of act.
--
-- `tenants.open_linking` defaults to false, meaning invitation-only, and the
-- invitation is a `tenant_members` row: the venue adds the couple as a
-- 'customer' from its CRM ("staff can add members" in 20260817000001), and that
-- row is what is_tenant_member finds here. Without this, slugs being public
-- hostnames means any account could attach a junk wedding to any venue.
--
-- Returns the tenant id so the caller can re-read the venue it just linked to
-- in one round trip instead of two.
create function public.link_wedding_to_venue(p_wedding_id uuid, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant public.tenants%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.weddings w
    where w.id = p_wedding_id and w.owner_id = auth.uid()
  ) then
    raise exception 'Only the wedding owner can link it to a venue'
      using errcode = '42501';
  end if;

  select * into v_tenant from public.tenants where slug = p_slug;

  if not found then
    raise exception 'No such venue' using errcode = 'P0002';
  end if;

  if v_tenant.status <> 'active' then
    raise exception 'Venue is not active' using errcode = '42501';
  end if;

  if not v_tenant.open_linking and not public.is_tenant_member(v_tenant.id) then
    raise exception 'This venue accepts links by invitation only'
      using errcode = '42501';
  end if;

  -- 'pending' unconditionally, including when re-linking a wedding that was
  -- already granted to a different venue: consent is given to *a* recipient,
  -- so pointing the link somewhere else has to withdraw it.
  update public.weddings
  set tenant_id = v_tenant.id,
      venue_access = 'pending'
  where id = p_wedding_id;

  return v_tenant.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. set_venue_access
-- ---------------------------------------------------------------------------
-- Two callers, deliberately asymmetric, and the asymmetry is the whole point:
--
--   * the wedding owner may grant (true) and revoke (false);
--   * staff of the linked tenant may only revoke (false).
--
-- Staff are allowed a revoke because "this event is over, drop our access" is a
-- reasonable thing for a venue to do, and because a venue that can hand back
-- access it no longer needs is a venue that keeps less data than it otherwise
-- would.
--
-- Staff are refused a grant because granting *is* the art. 9 ust. 2 lit. a
-- consent. The recipient of special-category data cannot supply the data
-- subject's explicit consent on their behalf, and privacy.venue.optin states in
-- so many words that the application shows the couple the list and asks them to
-- confirm. A staff-callable grant would make that published sentence false, and
-- would do it silently.
--
-- Revoking lands in 'none' rather than 'pending'. tenant_id still carries the
-- link, so the wedding stays attached to its venue and the couple can grant
-- again; 'none' is "no access", 'pending' is "asked and unanswered", and a
-- revoked grant must not read to anyone as an outstanding request.
create function public.set_venue_access(p_wedding_id uuid, p_granted boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_owner_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select w.tenant_id, w.owner_id into v_tenant_id, v_owner_id
  from public.weddings w
  where w.id = p_wedding_id;

  if not found then
    raise exception 'No such wedding' using errcode = 'P0002';
  end if;

  if v_tenant_id is null then
    raise exception 'This wedding is not linked to a venue'
      using errcode = '42501';
  end if;

  if v_owner_id = auth.uid() then
    update public.weddings
    set venue_access = case when p_granted then 'granted' else 'none' end
    where id = p_wedding_id;
    return;
  end if;

  if public.is_tenant_staff(v_tenant_id) then
    if p_granted then
      raise exception 'Only the couple can grant a venue access to their wedding'
        using errcode = '42501';
    end if;

    update public.weddings
    set venue_access = 'none'
    where id = p_wedding_id;
    return;
  end if;

  raise exception 'Not permitted to change venue access for this wedding'
    using errcode = '42501';
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. The couple can read the venue they linked to
-- ---------------------------------------------------------------------------
-- `tenants` SELECT is member-only (20260817000001), and a couple linking under
-- `open_linking` is not a member of anything - so without this the grant dialog
-- could name the venue's *slug* but not its name, and would be asking for
-- consent to disclose data to "bagatelka" rather than to a venue the couple
-- recognises. That is a real defect in an informed-consent screen, not a
-- cosmetic one.
--
-- Scoped through the wedding rather than through tenant_members, so it grants
-- exactly one extra row: the venue this wedding is attached to. Nothing in the
-- projection is member data - it is the same public branding tenant_public()
-- hands to anonymous visitors of the venue's own hostname.
create policy "wedding members can view their linked venue"
  on public.tenants for select
  using (
    exists (
      select 1 from public.weddings w
      where w.tenant_id = tenants.id
        and public.is_wedding_member(w.id)
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Grants
-- ---------------------------------------------------------------------------
-- The trigger function is never called directly - PostgreSQL checks EXECUTE at
-- CREATE TRIGGER time, not when the trigger fires - so revoking from every
-- client role leaves the trigger working. It is not a policy helper, so the
-- segfault caveat in 20260817000001's header does not apply to it.
revoke all on function public.enforce_wedding_tenant_columns()
  from public, anon, authenticated;

-- Both RPCs authorize their own caller and are meaningless without a session.
-- `revoke ... from public` first, because on a fresh local database
-- `authenticated` may hold EXECUTE via PUBLIC rather than an explicit grant -
-- the shape established in 20260806000001.
revoke all on function public.link_wedding_to_venue(uuid, text) from public, anon;
revoke all on function public.set_venue_access(uuid, boolean) from public, anon;

grant execute on function public.link_wedding_to_venue(uuid, text) to authenticated;
grant execute on function public.set_venue_access(uuid, boolean) to authenticated;
