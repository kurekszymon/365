-- The couple's menu: which package this wedding ordered, and which dishes of it
-- are being served.
--
-- The second of three. 20260822000001 gave the venue a catalogue nobody else
-- could read; this migration lets a linked couple read it and record a choice
-- against it. Still nothing per-guest, and still nothing about any *guest*
-- reaches the venue - `guests` is untouched here, and the column that changes
-- that lands alone in 20260822000003 so it can be reviewed on its own.
--
-- Two firsts worth stating plainly, because both are boundaries:
--
--   * `wedding_menu_selections` is the first relation in the wedding tree that
--     the derived 'venue' role may SELECT *and* the couple writes. That is safe
--     here and only here: every value in the table is a uuid of the venue's own
--     catalogue, so the venue learns nothing it did not author. It stays
--     read-only for the venue - see section 3 for why that is a decision and
--     not an omission.
--
--   * The catalogue becomes readable by people who are not staff of the tenant.
--     Section 4 explains why that predicate is *not* the mistake
--     20260817000003 warns about: it runs the other way round.
--
-- No policy helper is introduced. `menu_option_in_package` in section 5 is
-- `security definer` and will look like one - it is not, nothing evaluates it
-- inside an RLS expression, so the segfault caveat in 20260817000001's header
-- does not apply and it gets the standard full revoke.

-- ---------------------------------------------------------------------------
-- 1. weddings.menu_package_id
-- ---------------------------------------------------------------------------
-- An ordinary column with an ordinary UPDATE policy, unlike `tenant_id` and
-- `venue_access`. Those two are unwritable because one attaches a wedding to a
-- venue and the other discloses special-category data; choosing a package
-- discloses nothing and grants nobody anything - it is a planning decision, the
-- same kind as naming a table.
--
-- `enforce_wedding_tenant_columns` names `tenant_id` and `venue_access`
-- literally in both its branches (20260817000002 section 2), so this column
-- does not trip it. **Do not add it there.**
--
-- `on delete restrict`, and the reasoning is the same for all three FKs the
-- menu stack points at the venue's catalogue (the other two are the one in
-- section 2 and `guests.menu_option_id` in 20260822000003).
--
-- Cascade was never a candidate: a venue hard-deleting a package must not
-- delete anybody's wedding. `set null` was, and it is what this column shipped
-- with - but it is a **write into the couple's row performed on the venue's
-- behalf**. Staff hold DELETE on `menu_packages` (20260822000001 section 4) and
-- no policy on `weddings` at all, so a referential action was reaching where
-- the policies deliberately do not: 20260817000003 section 2 calls the derived
-- venue role "read-only by construction", and a referential action is exactly
-- the construction it was not read across. Restrict makes the sentence true.
--
-- What staff lose is only the delete of a package somebody ordered from, which
-- is the case `archived_at` exists for and the case the CRM already offers
-- first. Deleting a package nobody holds still works - the typo before anyone
-- ordered, which is all 20260822000001 section 4 ever claimed DELETE was for.
--
-- **Checked against tenant retirement, in both referential orders.** Deleting a
-- tenant cascades into `menu_packages` while linked weddings still hold one, so
-- this restrict and the retirement branch of `enforce_wedding_menu_package`
-- (section 5) walk the same delete. The restrict check is an after-row event
-- appended to the same trigger queue as that clear, so it evaluates after the
-- package has been nulled and the delete succeeds - `restrict` behaves like
-- `no action` in this timing. Recreating the FK so its RI triggers sort after
-- the others gives the identical end state. Do not change either side without
-- re-checking the other; docs/supabase.md carries the psql transcript.
alter table public.weddings
  add column menu_package_id uuid references public.menu_packages(id)
    on delete restrict;

-- A referencing column with no index of its own: the `set null` above has to
-- find the weddings holding a package on every delete of one, including the
-- cascade a retired tenant runs down into `menu_packages`. Without this that is
-- a sequential scan of `weddings` per deleted package.
-- Partial for the reason `guests_menu_option_id_idx` is (20260822000003:41):
-- most weddings have picked no package, and those rows answer no question here.
create index weddings_menu_package_id_idx
  on public.weddings (menu_package_id) where menu_package_id is not null;

-- ---------------------------------------------------------------------------
-- 2. wedding_menu_selections
-- ---------------------------------------------------------------------------
-- A table, not a `uuid[]` on `weddings`, and the three reasons are all things
-- the array shape gets wrong rather than a preference:
--
--   * no referential integrity - a deleted dish leaves a dangling uuid with
--     nothing to clean it up, and no `on delete` clause to hang the cleanup on;
--   * pick and unpick become read-modify-write, so two devices editing the menu
--     lose each other's changes with no conflict to detect;
--   * the composite primary key below makes both operations idempotent single
--     statements instead.
--
-- No `updated_at`, no trigger: the row is its own key with no mutable payload.
create table public.wedding_menu_selections (
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  -- `restrict`, not the cascade this shipped with, for the reason section 1
  -- gives in full. The cascade was the worst of the three: it fired
  -- `clear_guests_menu_option`, which is `security definer` and updates
  -- `public.guests` unscoped - so a venue deleting one dish wrote guest rows of
  -- every wedding holding it, RLS not consulted and `venue_access` not
  -- consulted either. Checked against tenant retirement in both referential
  -- orders along with the other two; see section 1.
  menu_option_id uuid not null references public.menu_options(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (wedding_id, menu_option_id)
);

-- The primary key already indexes (wedding_id, ...) for "what is this wedding
-- serving"; this one is for the other direction, which the cleanup trigger in
-- 20260822000003 and any "is this dish in use" question both walk.
create index wedding_menu_selections_option_idx
  on public.wedding_menu_selections (menu_option_id);

-- ---------------------------------------------------------------------------
-- 3. RLS on the selections
-- ---------------------------------------------------------------------------
alter table public.wedding_menu_selections enable row level security;

-- Explicit role lists rather than `is_wedding_member`, so every SELECT policy
-- in the wedding tree reads the same and differs only in which roles it names -
-- the shape 20260817000003 established, and for the reason it gives: a
-- predicate that is correct only because of how a helper happens to be
-- implemented is one refactor from being wrong with nothing to catch it.
create policy "members and the venue can view menu selections"
  on public.wedding_menu_selections for select
  using (
    public.wedding_role(wedding_id) in ('owner', 'editor', 'viewer', 'venue')
  );

create policy "editors can insert menu selections"
  on public.wedding_menu_selections for insert
  with check (public.wedding_role(wedding_id) in ('owner', 'editor'));

create policy "editors can delete menu selections"
  on public.wedding_menu_selections for delete
  using (public.wedding_role(wedding_id) in ('owner', 'editor'));

-- No UPDATE policy: both columns are the primary key. Changing a selection is a
-- delete plus an insert, which is also what makes the pair idempotent.
--
-- ## Should the venue be able to write the served set?
--
-- Called out because it is the obvious next request - Bagatelka's staff
-- plausibly take the menu order over the phone - and the answer is **no, not in
-- this phase**, for three reasons that compound:
--
--   * 20260817000003 section 2 states that the derived role is "read-only by
--     construction rather than by a rule someone has to remember". One writable
--     relation makes that sentence false for every future reader of it, and the
--     next person weighing a write policy has no principle left to weigh it
--     against.
--   * `selectCanEdit` in global.store mirrors that allowlist, and CLAUDE.md
--     forbids it becoming anything else.
--   * a venue that can set the menu can change what the couple is billed for.
--     That is a different kind of act from "hand back access I no longer need",
--     which is the only write `set_venue_access` gives staff.
--
-- If phone ordering turns out to be the daily workflow, the shape that fits is
-- a definer `venue_propose_menu_selection(...)` the couple confirms - the same
-- two-step link-then-grant vocabulary this codebase already speaks. Ship the
-- closed door; it is the one that can be opened later.

-- ---------------------------------------------------------------------------
-- 4. The couple can read the catalogue
-- ---------------------------------------------------------------------------
-- One policy per table, structurally identical to "wedding members can view
-- their linked venue" (20260817000002 section 5).
--
-- Deliberately **not** gated on `venue_access = 'granted'`. A menu is the
-- venue's own data, published in order to be read, with no art. 9 consent
-- anywhere near it - and a couple deciding whether to grant access needs to see
-- the offer first. It stays readable after a revoke, because `tenant_id` still
-- carries the link and the wedding is still being held there.
--
-- `is_wedding_member` here is **not** the mistake 20260817000003 warns about,
-- and the difference is the direction of the question. That warning is about
-- never letting the derived 'venue' role reach `guests`: there, the predicate
-- asks "is the caller a member of this wedding", and the derived role sneaks in
-- through `wedding_role`'s second branch. This predicate asks whether the
-- **caller** is a member of some wedding linked to this tenant, and it is
-- evaluated against a row of the venue's catalogue. No wedding-tree row is
-- reachable through it, and the derived role plays no part.
create policy "wedding members can view their venue's menus"
  on public.menu_packages for select
  using (
    exists (
      select 1 from public.weddings w
      where w.tenant_id = menu_packages.tenant_id
        and public.is_wedding_member(w.id)
    )
  );

create policy "wedding members can view their venue's courses"
  on public.menu_courses for select
  using (
    exists (
      select 1 from public.weddings w
      where w.tenant_id = menu_courses.tenant_id
        and public.is_wedding_member(w.id)
    )
  );

create policy "wedding members can view their venue's dishes"
  on public.menu_options for select
  using (
    exists (
      select 1 from public.weddings w
      where w.tenant_id = menu_options.tenant_id
        and public.is_wedding_member(w.id)
    )
  );

-- Read only. The couple gains no INSERT, UPDATE or DELETE on any of the three,
-- and 20260822000001's staff policies are untouched.

-- ---------------------------------------------------------------------------
-- 5. Integrity: a choice has to be a choice from this wedding's menu
-- ---------------------------------------------------------------------------
-- The three functions below are `security definer`, and that is about the
-- *question* rather than about privilege. An invoker-rights trigger asking "does
-- this package belong to this tenant?" is really asking "can you see a package
-- that belongs to this tenant?", and those two answers part company the moment
-- a policy changes. An integrity check must be told the truth, so it reads the
-- rows as their owner.
--
-- None of them is a policy helper. Nothing evaluates them inside an RLS
-- expression, so 20260817000001's segfault caveat does not apply, and all three
-- get the standard full revoke in section 7.
--
-- They are also not gated on `current_user`, unlike
-- `enforce_wedding_tenant_columns`: this is a data-integrity invariant rather
-- than a client-writability rule, so seed.sql and the definer RPCs are held to
-- it too.

-- Shared by the selection trigger here and by the per-guest trigger in
-- 20260822000003, which is why it takes the `_require_per_guest` flag it does
-- not need yet.
--
-- ## Why `_require_active` is a flag and not just part of the predicate
--
-- Archived rows are filtered out of the *picker* and out of nothing else - the
-- couple keeps seeing the name of a dish they already chose, which is the whole
-- point of `archived_at` over a delete (`liveOptions` in menu.store says the
-- same thing on the client). So "is this dish still on offer" and "is this dish
-- one of the ones this wedding is serving" are two different questions, and the
-- two callers ask different ones:
--
--   * a **new selection** must be refused if the venue has retired the dish -
--     picking something no longer offered is exactly what archiving prevents,
--     and the picker never showed it, so a request naming it did not come from
--     the UI. That caller passes `true`.
--   * a **guest assignment** must not be, even for an archived dish, as long as
--     the wedding already selected it. Otherwise a venue archiving a main
--     mid-planning freezes guest edits on a wedding that legitimately ordered
--     it - a couple would be unable to seat their remaining guests because of a
--     catalogue edit made for next year. `enforce_guest_menu_option` in
--     20260822000003 keeps passing the default.
--
-- The course's own `archived_at` counts too: archiving a course retires its
-- dishes with it, and the picker already agrees (`liveCourses`). The join is
-- there for `per_guest_choice` anyway, so this costs nothing.
create function public.menu_option_in_package(
  _option uuid,
  _package uuid,
  _require_per_guest boolean default false,
  _require_active boolean default false
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.menu_options o
    join public.menu_courses c on c.id = o.menu_course_id
    where o.id = _option
      and c.menu_package_id = _package
      and (not _require_per_guest or c.per_guest_choice)
      and (
        not _require_active
        or (o.archived_at is null and c.archived_at is null)
      )
  );
$$;

-- (1) The package a wedding orders must belong to the venue it is linked to.
--
-- ## The one case that is a clear rather than a refusal
--
-- `weddings.tenant_id` is `on delete set null` (20260817000002 section 1) and
-- `menu_packages.tenant_id` is `on delete cascade` (20260822000001), so one
-- `delete from tenants` fires both, in an order nothing specifies - referential
-- triggers run in name order, which is creation order, which is a fact about
-- when two unrelated migrations happened to be written.
--
-- Without the third branch below, the older FK wins and `UPDATE ONLY weddings
-- SET tenant_id = NULL` reaches this trigger while `menu_package_id` still
-- names a package of the venue being deleted - so the refusal fires and **the
-- whole delete aborts with 23514**. Retiring a venue any couple ordered a menu
-- from would simply be impossible, which falsifies the sentence 20260817000002
-- is built on: "a retired venue must not take a couple's wedding with it. The
-- wedding survives unlinked." This trigger is deliberately not `current_user`-
-- gated the way `enforce_wedding_tenant_columns` is, so `psql` provisioning -
-- the only way a tenant is deleted at all, there being no DELETE policy on
-- `tenants` - hits the same wall.
--
-- So "the row's tenant is *becoming* null" is treated as a clear: there is no
-- correct value for `menu_package_id` to hold, refusing offers the caller
-- nothing to do, and a package-less wedding is already the tolerated state this
-- function's first branch exists for. Repair rather than refusal, the same
-- direction as soft deletes and orphan adoption.
--
-- The branch is narrow on purpose, and each of its three conditions carries
-- weight: an INSERT naming a package with no tenant is still a caller bug;
-- `old.tenant_id is not null` is what makes it "losing a venue" rather than
-- "already had none"; and an unchanged `menu_package_id` is what keeps a
-- statement that nulls the tenant *and* names a new package a refusal. In
-- particular the tenant A -> tenant B case is untouched, so
-- `link_wedding_to_venue`'s own `menu_package_id = null` (section 6) stays
-- load-bearing - do not delete it on the strength of this branch.
create function public.enforce_wedding_menu_package()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- No package is always fine, including the wedding that had one and lost its
  -- venue: `tenants ... on delete set null` leaves a null tenant_id, and a
  -- wedding must not become un-editable because its venue was retired.
  if new.menu_package_id is null then
    return new;
  end if;

  -- Short-circuit when neither column moved, so an unrelated rename does not
  -- pay for a lookup - and, more importantly, so a row that is already in an
  -- odd state (a package left behind by a retired venue) does not start
  -- refusing every subsequent update to any other column.
  if tg_op = 'UPDATE'
    and new.menu_package_id is not distinct from old.menu_package_id
    and new.tenant_id is not distinct from old.tenant_id
  then
    return new;
  end if;

  -- The venue was retired out from under this wedding: clear the package
  -- rather than refuse the statement. Trigger 2 wipes the selections that go
  -- with it - see its `when` clause, which is what makes that true here.
  if tg_op = 'UPDATE'
    and new.tenant_id is null
    and old.tenant_id is not null
    and new.menu_package_id is not distinct from old.menu_package_id
  then
    new.menu_package_id := null;
    return new;
  end if;

  if new.tenant_id is null
    or not exists (
      select 1 from public.menu_packages p
      where p.id = new.menu_package_id
        and p.tenant_id = new.tenant_id
    )
  then
    raise exception 'menu package does not belong to this wedding''s venue'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger weddings_menu_package_scope
  before insert or update of menu_package_id, tenant_id on public.weddings
  for each row execute function public.enforce_wedding_menu_package();

-- (2) Switching package clears the old choice.
--
-- A **wipe, not a "keep what still fits" sweep**, and the data model is what
-- decides that: every option row belongs to exactly one course of exactly one
-- package, so MENU II's "Rosol" and MENU III's "Rosol" are different rows with
-- different ids. A partial sweep would therefore keep nothing in practice while
-- adding a whole class of half-applied states to reason about.
--
-- In the database rather than the client because there is no rollback layer:
-- from the client this is N fire-and-forget deletes whose half-applied state is
-- "a guest is seated at a dish the kitchen is not cooking", and it cannot run
-- at all when the switch arrives from another device or from
-- `link_wedding_to_venue`.
--
-- 20260822000003 replaces this function to null `guests.menu_option_id` as
-- well. It cannot do that here - the column does not exist yet.
create function public.reset_wedding_menu_on_package_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.menu_package_id is not distinct from old.menu_package_id then
    return null;
  end if;

  delete from public.wedding_menu_selections
  where wedding_id = new.id;

  return null;
end;
$$;

-- `when (... is distinct from ...)` rather than `after update of
-- menu_package_id`, and the difference is load-bearing rather than stylistic.
-- `update of <column>` matches the **statement's SET list**, not the row that
-- ends up stored, so it would miss the clear performed by trigger 1 above: the
-- statement that reaches it is the referential `UPDATE ONLY weddings SET
-- tenant_id = NULL`, whose SET list names one column and not this one. A
-- retired venue would leave the couple's selections behind, pointing at a
-- package the wedding no longer orders.
--
-- The `when` clause is evaluated after BEFORE triggers have had NEW, so it sees
-- the cleared value and fires. It also makes the trigger *more* accurate on the
-- ordinary path - an `update ... set menu_package_id = <the same package>` no
-- longer wipes a menu it did not change - and costs one comparison on every
-- other write to `weddings`, with no lookup. The equality guard inside the
-- function is now redundant and stays anyway: it is what keeps the function
-- correct on its own terms rather than because of how it happens to be wired.
create trigger weddings_menu_package_changed
  after update on public.weddings
  for each row
  when (new.menu_package_id is distinct from old.menu_package_id)
  execute function public.reset_wedding_menu_on_package_change();

-- (3) A selected dish has to be in the package this wedding ordered, and still
-- be on offer. The `_require_active => true` is the only place that flag is
-- passed; see the function's own comment for why the guest trigger must not.
create function public.enforce_menu_selection_in_package()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_package uuid;
begin
  select w.menu_package_id into v_package
  from public.weddings w
  where w.id = new.wedding_id;

  if v_package is null
    or not public.menu_option_in_package(
      new.menu_option_id, v_package, _require_active => true
    )
  then
    raise exception 'menu option does not belong to this wedding''s package'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger wedding_menu_selections_in_package
  before insert on public.wedding_menu_selections
  for each row execute function public.enforce_menu_selection_in_package();

-- ## What is deliberately *not* enforced here: choose_count
--
-- No trigger counts the selections against `menu_courses.choose_count`, and the
-- omission is deliberate rather than pending:
--
--   * it needs a counting subquery on every insert, for a rule that changes
--     nothing about what is stored;
--   * it refuses a legitimate transient state - swapping a dish is a delete and
--     an insert, and one of those two orders would always be refused;
--   * the failure mode is benign in a way over-capacity is not. An
--     over-capacity table silently drops guests from the canvas while still
--     printing them, which is a rendering lie; six soups renders correctly as
--     six soups.
--
-- The client enforces it in the picker ("4 z 5 wybranych"). If that ever
-- becomes unacceptable, the shape that fits is a definer RPC committing the
-- whole served set in one call - not a per-row trigger.

-- ---------------------------------------------------------------------------
-- 6. link_wedding_to_venue has to clear the package
-- ---------------------------------------------------------------------------
-- **This replace is not optional, and leaving it out breaks an existing
-- feature.**
--
-- That RPC re-links an already-linked wedding on purpose - its own comment says
-- so, because consent is given to *a* recipient and pointing the link elsewhere
-- has to withdraw it. Its `UPDATE weddings SET tenant_id = ..., venue_access =
-- 'pending'` now fires the trigger in section 5, and a wedding still holding the
-- *old* venue's package fails that check with 23514. Changing venue would simply
-- stop working, and the first person to find out would be a customer.
--
-- Clearing the package in the same statement fixes it and is also the correct
-- behaviour on its own terms: the new venue does not serve the old venue's menu.
-- Trigger 2 then fires and clears the selections.
--
-- **That is also what makes the same-tenant guard load-bearing here rather than
-- merely tidy.** In 20260817000002 a re-link of the venue you are already with
-- cost a `granted` -> `pending` reset; from this migration on it additionally
-- drops `menu_package_id`, and trigger 2 takes every selection with it - and,
-- from 20260822000003, every guest's dish. A couple re-opening the venue dialog
-- and picking the same venue would lose a menu they had finished choosing. The
-- `when (new.menu_package_id is distinct from old.menu_package_id)` clause on
-- trigger 2 does not save them: on a same-venue re-link it fires *precisely
-- because* null is distinct from the package they hold.
--
-- The guard skips the whole UPDATE, so `menu_package_id = null` below stays
-- exactly as load-bearing as it was for the tenant A -> tenant B case. Do not
-- delete that line on the strength of the guard.
--
-- Verbatim from 20260817000002 apart from that one line; the comments there
-- still apply and are not repeated.
create or replace function public.link_wedding_to_venue(p_wedding_id uuid, p_slug text)
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
    raise exception 'No such venue' using errcode = 'PT404';
  end if;

  if v_tenant.status <> 'active' then
    raise exception 'Venue is not active' using errcode = 'PT410';
  end if;

  if not v_tenant.open_linking and not public.is_tenant_member(v_tenant.id) then
    raise exception 'This venue accepts links by invitation only'
      using errcode = 'PT403';
  end if;

  -- Re-linking to the venue this wedding is *already* linked to is a no-op.
  --
  -- Everything below this line exists to move a wedding from one recipient to
  -- another, and the reset that follows is how the previous recipient's consent
  -- is withdrawn. When the answer is the same venue there is nobody to withdraw
  -- it from: the couple opening the dialog and picking the venue they are
  -- already with would revoke a live grant and be asked to answer a question
  -- they have already answered - and staff would watch a granted wedding drop
  -- back to 'pending' for no act of the couple's that meant anything.
  --
  -- The checks above still run first, so this is not a way past them: an
  -- inactive venue, or one that has closed its linking, still refuses. Only the
  -- write is skipped, and the return value is the same tenant id the caller
  -- gets on a real link.
  if exists (
    select 1 from public.weddings w
    where w.id = p_wedding_id
      and w.tenant_id is not distinct from v_tenant.id
  ) then
    return v_tenant.id;
  end if;

  -- 'pending' unconditionally, including when re-linking a wedding that was
  -- already granted to a different venue: consent is given to *a* recipient, so
  -- pointing the link somewhere else has to withdraw it.
  --
  -- menu_package_id goes with it, for the same reason and one more: the old
  -- venue's package would fail enforce_wedding_menu_package against the new
  -- tenant, so without this line the whole statement raises 23514.
  update public.weddings
  set tenant_id = v_tenant.id,
      venue_access = 'pending',
      menu_package_id = null
  where id = p_wedding_id;

  return v_tenant.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Grants
-- ---------------------------------------------------------------------------
-- The three functions above are called only by triggers and by each other.
-- PostgreSQL checks EXECUTE at CREATE TRIGGER time, not when the trigger fires,
-- so revoking from every client role leaves them working - the same treatment
-- the trigger functions in 20260806000001, 20260816000001 and 20260817000001
-- get.
--
-- `menu_option_in_package` is included even though it is `security definer` and
-- reads two tables: it is reachable only from the two trigger functions, and a
-- client that could call it directly would have an oracle for "does this uuid
-- name a dish in that package" against catalogues it cannot read.
revoke all on function
  public.menu_option_in_package(uuid, uuid, boolean, boolean)
  from public, anon, authenticated;
revoke all on function public.enforce_wedding_menu_package()
  from public, anon, authenticated;
revoke all on function public.reset_wedding_menu_on_package_change()
  from public, anon, authenticated;
revoke all on function public.enforce_menu_selection_in_package()
  from public, anon, authenticated;
