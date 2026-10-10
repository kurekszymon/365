-- Two cross-wedding integrity holes that have been open since 20260417000001.
--
-- Scope, measured rather than assumed - this is NOT a privilege escalation:
--
--   * Both need a caller who can already *edit two weddings*, and a
--     hand-crafted PostgREST call; the UI never offers either move.
--   * Hole 1 leaves the guest's wedding_id alone, and loadWedding.ts selects
--     guests by wedding_id - so the row never appears on the other wedding's
--     canvas. enforce_table_capacity does not see it either: that trigger is
--     not `security definer`, so its count(*) is RLS-filtered to the caller's
--     own weddings. The damage is confined to the attacker's own view, where
--     the guest now points at a table that isn't in their table list.
--   * Hole 2 does move the row, but into a wedding the caller can already
--     write to - so it discloses nothing they could not have typed in by hand.
--
-- What makes it worth closing anyway is what comes next. v2 makes wedding_role
-- tenant-aware: it stops being a single lookup in wedding_members and grows a
-- second branch deriving 'venue' from the wedding's tenant. A missing WITH
-- CHECK is easy to reason about while the function is one SELECT, and much
-- less so afterwards. Land the invariant while it is still cheap to verify.
--
-- (The venue role itself is read-only - selectCanEdit excludes it and every
-- write policy demands owner/editor - so it does not widen these two holes.)
--
-- Nothing in the client changes.

-- ---------------------------------------------------------------------------
-- 1. guests.table_id may point at another wedding's table
-- ---------------------------------------------------------------------------
-- tables.hall_id has had enforce_entity_hall_wedding since 20260717000001;
-- guests.table_id never got the equivalent. The FK only proves the table
-- exists, so an editor of weddings A and B can PATCH a guest in A onto a table
-- in B and leave the row referentially valid but semantically nonsense.
--
-- The guest does NOT appear on B's canvas - loadWedding selects by wedding_id,
-- which is untouched. It goes missing from A's seat map instead, pointing at a
-- table A never loads. So this is a self-inflicted corruption, and the reason
-- to block it is that the invariant "a guest sits at a table in their own
-- wedding" should hold in the schema, not merely in the client that happens
-- never to violate it.
--
-- Deliberately EXISTS-shaped rather than `not exists (... and wedding_id = ...)`,
-- for the same reason spelled out in enforce_entity_hall_wedding: a *missing*
-- table must fall through to the foreign key, which raises 23503 naming the
-- constraint, instead of being reported here as a misleading 23514.
--
-- security definer because it reads public.tables, whose own SELECT policy
-- would otherwise hide exactly the row we need to catch.
create function public.enforce_guest_table_wedding()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.table_id is not null
     and exists (
       select 1
       from public.tables
       where id = new.table_id
         and wedding_id is distinct from new.wedding_id
     ) then
    raise exception 'table_id % does not belong to wedding %', new.table_id, new.wedding_id
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger guests_table_wedding_check
  before insert or update of table_id, wedding_id on public.guests
  for each row execute function public.enforce_guest_table_wedding();

-- ---------------------------------------------------------------------------
-- 2. wedding_id is rewritable on every child table
-- ---------------------------------------------------------------------------
-- The five "editors can update X" policies carry `using` and no `with check`.
-- Postgres then reuses `using` as the check, and `using` is evaluated against
-- the NEW row - so `update guests set wedding_id = <other>` passes as long as
-- the caller can edit the destination too. Same class of hole as the owner_id
-- one in 20260731000003.
--
-- Two layers, because neither closes it alone:
--   * `with check` stops moves into a wedding the caller cannot edit. It
--     cannot stop moves between two weddings they can, because WITH CHECK has
--     no access to OLD.
--   * the trigger stops the move outright.
-- The explicit `with check` is still worth adding: it is the layer that keeps
-- working if a future definer RPC legitimately needs to re-parent a row.

drop policy "editors can update halls" on public.halls;
create policy "editors can update halls"
  on public.halls for update
  using (public.wedding_role(wedding_id) in ('owner', 'editor'))
  with check (public.wedding_role(wedding_id) in ('owner', 'editor'));

drop policy "editors can update tables" on public.tables;
create policy "editors can update tables"
  on public.tables for update
  using (public.wedding_role(wedding_id) in ('owner', 'editor'))
  with check (public.wedding_role(wedding_id) in ('owner', 'editor'));

drop policy "editors can update guests" on public.guests;
create policy "editors can update guests"
  on public.guests for update
  using (public.wedding_role(wedding_id) in ('owner', 'editor'))
  with check (public.wedding_role(wedding_id) in ('owner', 'editor'));

drop policy "editors can update fixtures" on public.fixtures;
create policy "editors can update fixtures"
  on public.fixtures for update
  using (public.wedding_role(wedding_id) in ('owner', 'editor'))
  with check (public.wedding_role(wedding_id) in ('owner', 'editor'));

drop policy "editors can update reminders" on public.reminders;
create policy "editors can update reminders"
  on public.reminders for update
  using (public.wedding_role(wedding_id) in ('owner', 'editor'))
  with check (public.wedding_role(wedding_id) in ('owner', 'editor'));

-- Not security definer: it only reads NEW and OLD, exactly like
-- enforce_wedding_owner_immutable.
--
-- Only client roles are blocked. replace_planner_layout and save_table run as
-- postgres, so they pass straight through - and replace_planner_layout in
-- particular deletes and re-inserts rather than re-parenting, so it never
-- trips this anyway.
create function public.enforce_wedding_id_immutable()
returns trigger
language plpgsql
as $$
begin
  if new.wedding_id is distinct from old.wedding_id
     and current_user in ('authenticated', 'anon') then
    raise exception 'wedding_id is immutable'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger halls_wedding_id_immutable
  before update on public.halls
  for each row execute function public.enforce_wedding_id_immutable();

create trigger tables_wedding_id_immutable
  before update on public.tables
  for each row execute function public.enforce_wedding_id_immutable();

create trigger guests_wedding_id_immutable
  before update on public.guests
  for each row execute function public.enforce_wedding_id_immutable();

create trigger fixtures_wedding_id_immutable
  before update on public.fixtures
  for each row execute function public.enforce_wedding_id_immutable();

create trigger reminders_wedding_id_immutable
  before update on public.reminders
  for each row execute function public.enforce_wedding_id_immutable();

-- ---------------------------------------------------------------------------
-- 3. Grants
-- ---------------------------------------------------------------------------
-- Trigger functions are never called directly - PostgreSQL checks EXECUTE at
-- CREATE TRIGGER time, not when the trigger fires - so revoking from every
-- client role does not affect the triggers above. Same treatment as the
-- trigger functions in 20260806000001, and necessary for the same reason:
-- hosted Supabase's default privileges grant EXECUTE to anon and authenticated
-- on anything created in `public`.
revoke all on function public.enforce_guest_table_wedding() from public, anon, authenticated;
revoke all on function public.enforce_wedding_id_immutable() from public, anon, authenticated;
