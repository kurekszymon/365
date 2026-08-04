-- Close the last door on the "a table never holds more guests than it seats"
-- invariant, and give the table-edit save a transaction to do it in.
--
-- `enforce_table_capacity` (20260417000001) only ever fires on `guests`, so it
-- guards the invariant from one side: it refuses to seat a 9th guest at an
-- 8-seat table. Nothing guarded the other side - `update tables set capacity`
-- was free to drop below the number of guests already sitting there. The app's
-- own flows happen not to do it (the edit form truncates its guest list, and
-- the assistant's update_table refuses the shrink), so this is reachable by a
-- hand-made PostgREST call rather than by accident. It still matters, because
-- nothing downstream copes with the result: `resolveSeatOccupants` builds
-- exactly `capacity` seats and order-fills them, so the guests past the end are
-- silently dropped from the canvas, while `groupGuestsByTable` - which filters
-- on table_id alone - still prints every one of them. An overflowed table means
-- a guest who is seated everywhere except on the plan people actually follow.

create function public.enforce_table_capacity_floor()
returns trigger
language plpgsql as $$
declare
  seated_count integer;
begin
  -- Growing can't break the invariant, and the edit form sends `capacity` on
  -- every table save (not just capacity edits), so the common path must not pay
  -- for a count it doesn't need.
  if new.capacity >= old.capacity then
    return new;
  end if;

  -- Mirrors the sibling trigger's filter: soft-deleted guests are off the plan
  -- and must not hold a seat against it.
  select count(*) into seated_count
  from public.guests
  where table_id = new.id
    and deleted_at is null;

  if new.capacity < seated_count then
    raise exception
      'table % seats % guest(s); capacity cannot drop to %',
      new.id, seated_count, new.capacity
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger tables_enforce_capacity_floor
  before update of capacity on public.tables
  for each row execute function public.enforce_table_capacity_floor();

-- Saving a table is four writes that have to agree, and until now they were
-- four separate fire-and-forget requests in a fixed order (see saveTable in
-- planner.store.ts). That was already fragile - `reassignTableGuests` clears
-- every guest off the table and then re-assigns the keepers as a *second*
-- statement, so a failure between the two left the whole table unassigned in
-- the DB while the client still showed everyone seated - and the trigger above
-- makes the fixed order impossible: no single order works for both directions.
--
--   * shrinking needs the departing guests gone BEFORE the capacity write, or
--     the trigger above sees the pre-edit roster and refuses;
--   * growing needs the capacity write BEFORE the arrivals, or
--     enforce_table_capacity sees the old, smaller capacity and refuses them.
--
-- So the order is release -> capacity -> assign, and it lives here where it can
-- be one transaction: either the whole save lands or none of it does, and no
-- intermediate state is ever visible to another session.
--
-- SECURITY DEFINER for the same reason as replace_planner_layout: the writes
-- span two tables and the function does its own authorization up front.
create function public.save_table(
  p_table_id uuid,
  p_name text,
  p_shape text,
  p_capacity integer,
  p_width numeric,
  p_height numeric,
  p_rotation integer,
  p_geometry jsonb,
  p_seats jsonb,
  -- [{ "id": uuid, "seat_id": text|null }] - the table's roster after the edit.
  -- Carries seat_id so a guest's pin is written in the same transaction as
  -- their membership; the two are index-based and meaningless apart.
  p_guests jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_wedding uuid;
  caller_role text;
  guest_ids uuid[];
begin
  -- Read the wedding off the row rather than trusting a caller-supplied id:
  -- the authorization below is only as good as the wedding it checks against.
  select wedding_id into target_wedding
  from public.tables
  where id = p_table_id;

  if target_wedding is null then
    raise exception 'table % not found', p_table_id
      using errcode = 'P0002';
  end if;

  caller_role := public.wedding_role(target_wedding);
  if caller_role is null or caller_role not in ('owner', 'editor') then
    raise exception 'not authorized to save table %', p_table_id
      using errcode = '42501';
  end if;

  select coalesce(
    array_agg((g->>'id')::uuid),
    '{}'::uuid[]
  ) into guest_ids
  from jsonb_array_elements(coalesce(p_guests, '[]'::jsonb)) as g;

  -- The roster is caller-supplied ids, and `security definer` means RLS is not
  -- standing behind them: nothing about being an editor of THIS wedding says
  -- anything about the guests named here. Without this check, step 3 would
  -- happily set table_id on somebody else's guests, pulling them out of their
  -- own wedding's plan and into this table. Authorization above answers "may
  -- you edit this table"; this answers "are these your guests to seat".
  --
  -- The same hole, and the same reasoning, as enforce_entity_hall_wedding in
  -- 20260717000001 - a foreign key proves the row exists, never that it belongs
  -- to the wedding in hand. Raising rather than filtering the strays out, for
  -- the reason that function gives too: a crafted payload should fail loudly,
  -- and a legitimate client never sends one (the store only ever holds the
  -- loaded wedding's guests), so this can only fire on a bug or an attack.
  if exists (
    select 1
    from unnest(guest_ids) as roster_id
    where not exists (
      select 1
      from public.guests g
      where g.id = roster_id
        and g.wedding_id = target_wedding
    )
  ) then
    raise exception
      'guest roster for table % names guests outside wedding %',
      p_table_id, target_wedding
      using errcode = '42501';
  end if;

  -- 1. Departures. Scoped to this table, so a guest seated elsewhere is
  --    untouched, and to its wedding, so a guest already pointing here from
  --    outside it (only reachable through inconsistent data, but this function
  --    bypasses RLS and should not be the thing that spreads it) is left for
  --    their own wedding to deal with. seat_id goes with table_id - an
  --    index-based pin means nothing once the guest has left the table it was
  --    numbered against.
  update public.guests
  set table_id = null, seat_id = null
  where table_id = p_table_id
    and wedding_id = target_wedding
    and not (id = any(guest_ids));

  -- 2. The table itself, now that the roster can no longer exceed the new
  --    capacity.
  update public.tables
  set name = p_name,
      shape = p_shape,
      capacity = p_capacity,
      width = p_width,
      height = p_height,
      rotation = p_rotation,
      geometry = p_geometry,
      seats = coalesce(p_seats, '[]'::jsonb)
  where id = p_table_id;

  -- 3. Arrivals and pins, against the capacity written above. Every row in the
  --    roster is written, not just the new ones: a guest who stayed may still
  --    have had their pin pruned by a shrink, and re-writing an unchanged row
  --    is cheaper than working out which ones changed.
  --
  --    The wedding predicate is redundant against the roster check above and
  --    kept anyway: this is the statement that would do the damage, and it
  --    should not be able to write across weddings on its own terms, however
  --    the guard in front of it is later edited.
  update public.guests as tgt
  set table_id = p_table_id,
      seat_id = src.seat_id
  from (
    select (g->>'id')::uuid as id, g->>'seat_id' as seat_id
    from jsonb_array_elements(coalesce(p_guests, '[]'::jsonb)) as g
  ) as src
  where tgt.id = src.id
    and tgt.wedding_id = target_wedding;
end;
$$;

revoke all on function public.save_table(
  uuid, text, text, integer, numeric, numeric, integer, jsonb, jsonb, jsonb
) from public;
grant execute on function public.save_table(
  uuid, text, text, integer, numeric, numeric, integer, jsonb, jsonb, jsonb
) to authenticated;
