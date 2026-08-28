-- The per-guest dish: which of the served mains each guest is getting.
--
-- **This is the one migration in the menu stack that moves the privacy
-- boundary.** The first two touched only what a venue authored and what a
-- couple chose from it; this one adds a column to `guests` that the venue
-- reads. It ships on its own, with the disclosure copy amended in the same
-- change, so the decision can be reviewed as the decision it is.
--
-- What makes it a decision worth making rather than a line to hold:
--
--   * the column is a **foreign key**, not free text. `dietary` and `age_group`
--     - the two per-guest fields a venue already reads - are strings the couple
--       types, and their honest limit, stated in privacy.venue.shared and in
--       20260817000003, is that someone who types a guest's name into a diet
--       tag sends that name to the venue. A uuid of the venue's own catalogue
--       cannot carry a name. This is the first per-guest column the venue reads
--       that is *structurally* incapable of leaking one.
--   * the venue is the party cooking the food. "How many of each main" is the
--     single question the kitchen report exists to answer, and today it can only
--     be approximated from dietary tags.
--
-- What does not change, and must not: `guests` SELECT still names the three
-- member roles literally, so no venue reads a name or a note. What the venue
-- reads is `wedding_seatmap`, and section 4 is the delicate part of this file.

-- ---------------------------------------------------------------------------
-- 1. guests.menu_option_id
-- ---------------------------------------------------------------------------
-- `on delete restrict`. Cascade is unthinkable here for the reason that runs
-- through the whole feature - a venue hard-deleting a dish must not delete a
-- guest - but `set null`, which this column shipped with, was not the safe
-- middle it looked like: it let venue staff **write `guests`**, the one table
-- in the tree whose SELECT policy names the three member roles literally so
-- that no venue ever reads it. Being unable to see the rows it blanked did not
-- make it not a write.
--
-- Restrict is the third of the three flips; 20260822000002 section 1 carries
-- the full reasoning and the tenant-retirement check that covers all three. A
-- dish somebody is eating can now only be archived, and a lost dinner choice
-- being recoverable is no longer the argument that has to hold.
alter table public.guests
  add column menu_option_id uuid references public.menu_options(id)
    on delete restrict;

-- Partial, because the interesting reads are all "who is having this dish" and
-- the null rows are noise: a wedding that has not assigned dishes at all - the
-- common case for most of planning - contributes nothing to the index.
create index guests_menu_option_id_idx
  on public.guests (menu_option_id) where menu_option_id is not null;

-- ---------------------------------------------------------------------------
-- 2. A guest's dish has to be a dish this wedding is serving, from a course
--    that is served per guest
-- ---------------------------------------------------------------------------
-- `security definer` for the reason the triggers in 20260822000002 are: an
-- invoker-rights integrity check asks "can you *see* such a row", and that is a
-- different question from "does such a row exist" the moment a policy changes.
-- Not a policy helper - nothing evaluates it inside an RLS expression - so it
-- gets the standard full revoke in section 5.
--
-- **Both halves of the check matter.** The package half is obvious. The
-- `per_guest_choice` half is the one that would be quietly wrong if it were
-- dropped: a per-guest dish assigned from a *buffet* course would tally as a
-- portion the kitchen has to plate, on a course where nobody is plating
-- anything. It would look right on the report and be wrong in the room.
--
-- It deliberately does **not** require the option to be in
-- `wedding_menu_selections`. That is a soft rule the couple breaks transiently
-- and legitimately - unpicking a dish that guests already hold - and enforcing
-- it here would turn an unpick into a refusal the couple cannot act on. The
-- statement-level trigger in section 3 repairs that state instead of refusing
-- it, the same direction as soft deletes and orphan adoption.
create function public.enforce_guest_menu_option()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_package uuid;
begin
  -- Short-circuits so the hot paths pay nothing. Clearing a dish is always
  -- fine, and every seat move, rename and `reassignTableGuests` write leaves
  -- the column untouched - without this they would each buy a two-table join.
  if new.menu_option_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE'
    and new.menu_option_id is not distinct from old.menu_option_id
  then
    return new;
  end if;

  select w.menu_package_id into v_package
  from public.weddings w
  where w.id = new.wedding_id;

  if v_package is null
    or not public.menu_option_in_package(new.menu_option_id, v_package, true)
  then
    raise exception 'dish is not a per-guest choice of this wedding''s menu'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger guests_menu_option_scope
  before insert or update of menu_option_id on public.guests
  for each row execute function public.enforce_guest_menu_option();

-- ---------------------------------------------------------------------------
-- 3. Unpicking a dish releases the guests holding it
-- ---------------------------------------------------------------------------
-- Repair, not refusal. The couple unpicks a main that four guests were already
-- assigned; those four go back to "no dish chosen" rather than the unpick being
-- rejected with a message about guests they would then have to hunt down.
--
-- **Statement-level with a transition table**, not `for each row`. A bulk
-- unpick - and, more to the point, the package wipe in section 4, which deletes
-- every selection the wedding has - becomes one UPDATE over the joined
-- transition table instead of one per deleted row.
--
-- The unscoped `update public.guests` below is `security definer` and consults
-- no policy, which is only tolerable because of who can reach it. Since
-- `wedding_menu_selections.menu_option_id` became `on delete restrict`
-- (20260822000002 section 1) that is two callers, both acting for the couple:
-- their own unpick, and `reset_wedding_menu_on_package_change` in section 4. A
-- venue deleting a dish no longer reaches it - restoring a cascade there hands
-- this function back to them.
create function public.clear_guests_menu_option()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.guests g
  set menu_option_id = null
  from deleted d
  where g.wedding_id = d.wedding_id
    and g.menu_option_id = d.menu_option_id;

  return null;
end;
$$;

create trigger menu_selections_deleted_clear_guests
  after delete on public.wedding_menu_selections
  referencing old table as deleted
  for each statement execute function public.clear_guests_menu_option();

-- ---------------------------------------------------------------------------
-- 4. Switching package clears the guests' dishes too
-- ---------------------------------------------------------------------------
-- Replaces the function from 20260822000002, which could only delete the
-- selections: `guests.menu_option_id` did not exist yet. The comment there says
-- this replacement is coming.
--
-- It runs on every change of `weddings.menu_package_id` and not only on the
-- couple's own switch - the trigger there carries a `when` clause rather than
-- an `update of` list, so the package cleared by `enforce_wedding_menu_package`
-- when a venue is retired lands here too, and the guests' dishes go with the
-- selections instead of being left to the FK cascade to blank.
--
-- Strictly speaking the DELETE below now fires the statement-level trigger in
-- section 3, which would clear the guests on its own. The explicit UPDATE stays
-- anyway, and the ordering is the reason: it runs *first*, so the wedding is
-- never momentarily in a state where a guest holds a dish from a package the
-- wedding no longer orders. Relying on one trigger to fire another to reach a
-- consistent state is also exactly the kind of implicit dependency this file
-- has spent three migrations avoiding.
create or replace function public.reset_wedding_menu_on_package_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.menu_package_id is not distinct from old.menu_package_id then
    return null;
  end if;

  update public.guests
  set menu_option_id = null
  where wedding_id = new.id
    and menu_option_id is not null;

  delete from public.wedding_menu_selections
  where wedding_id = new.id;

  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. wedding_seatmap gains the dish
-- ---------------------------------------------------------------------------
-- ===========================================================================
-- THE SHARPEST EDGE IN THIS STACK. READ BEFORE EDITING.
-- ===========================================================================
-- `create or replace view` preserves the existing grants, which is why it is
-- used instead of a drop and recreate. It also silently accepts a definition
-- that has lost the storage parameter or the WHERE clause:
--
--   * this view runs as its owner with `security_invoker` **off**, so that
--     WHERE is its entire access control. A replace that drops it turns the
--     view into "every guest row in the database", with no error anywhere.
--   * `security_barrier = true` is what stops a caller-supplied predicate being
--     pushed below the WHERE. PostgREST lets callers supply predicates freely
--     (`?dietary=ilike.*`), so this is reachable rather than theoretical.
--
-- Both are therefore re-declared below, character for character from
-- 20260817000003. The `reloptions` check in the verification steps is the only
-- proof the barrier survived - nothing else fails if it did not.
--
-- `CREATE OR REPLACE VIEW` may only **append** columns, so the first six stay
-- in exactly this order. That is a constraint, and it is also a feature: the
-- projection can only ever grow at the end, visibly.
--
-- **No join to menu_options for the dish name**, and this is the decision the
-- rest of the feature rests on:
--
--   * the view's entire safety argument is "there is nothing in the projection
--     to redact, so no future call site can forget to". A text column here
--     would degrade venueRls.test.ts's blunt `not.toContain("name")` into an
--     allowlist that has to distinguish `name` from `menu_option_name`.
--   * it is the wrong direction on performance. 20260817000003 measured this
--     peek at ~25 ms for 435 rows because `wedding_role()` runs per row; a join
--     per row makes that worse.
--   * the venue already has the names. It wrote them, and the CRM has the
--     catalogue loaded - read **unfiltered by `archived_at`**, so a dish
--     archived after a couple ordered it is still nameable on the report.
create or replace view public.wedding_seatmap
with (security_barrier = true) as
  select
    g.id,
    g.wedding_id,
    g.table_id,
    g.seat_id,
    g.dietary,
    g.age_group,
    g.menu_option_id
  from public.guests g
  where g.deleted_at is null
    and public.wedding_role(g.wedding_id)
        in ('owner', 'editor', 'viewer', 'venue');

-- Re-stated for the same reason the definition is: a replace keeps the existing
-- grants, and writing them down is what makes that a decision rather than an
-- assumption. See 20260817000003 on why the anon revoke is honest intent rather
-- than a locally enforced boundary - seed.sql re-grants it, harmlessly, and the
-- assertions are about rows rather than grants.
revoke all on public.wedding_seatmap from anon;
grant select on public.wedding_seatmap to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Grants
-- ---------------------------------------------------------------------------
-- Trigger functions only, called by triggers rather than by clients.
-- PostgreSQL checks EXECUTE at CREATE TRIGGER time, not when the trigger fires.
-- `reset_wedding_menu_on_package_change` keeps the revoke it was given in
-- 20260822000002 - `create or replace function` preserves privileges - and is
-- re-revoked here so a partial replay of this file cannot leave it reachable.
revoke all on function public.enforce_guest_menu_option()
  from public, anon, authenticated;
revoke all on function public.clear_guests_menu_option()
  from public, anon, authenticated;
revoke all on function public.reset_wedding_menu_on_package_change()
  from public, anon, authenticated;
