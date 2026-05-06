-- Atomically copy a venue hall into a brand-new wedding owned by the caller.
-- The on_wedding_created trigger (20260416000001) handles the owner row in
-- wedding_members, so the caller becomes a member as part of the insert.
--
-- Couples land on the resulting wedding via the /halls catalog. The source
-- hall is never touched: tables and fixtures are duplicated with fresh ids.
create function public.start_wedding_from_hall(
  _hall_id uuid,
  _name text,
  _date date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hall public.venue_halls%rowtype;
  new_wedding_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into hall from public.venue_halls where id = _hall_id;
  if not found then
    raise exception 'Hall not found';
  end if;

  -- Either the hall is published, or the caller owns the venue (so venues
  -- can dogfood by starting their own demo wedding from a private hall).
  if not (hall.is_public or public.is_venue_owner(hall.venue_id)) then
    raise exception 'Hall not accessible';
  end if;

  insert into public.weddings (owner_id, name, date, host_venue_id)
  values (auth.uid(), coalesce(_name, ''), _date, hall.venue_id)
  returning id into new_wedding_id;

  insert into public.halls (wedding_id, preset, width, height)
  values (new_wedding_id, hall.preset, hall.width, hall.height);

  insert into public.tables (
    id, wedding_id, name, shape, capacity, width, height, rotation, pos_x, pos_y
  )
  select
    gen_random_uuid(), new_wedding_id, vt.name, vt.shape, vt.capacity,
    vt.width, vt.height, vt.rotation, vt.pos_x, vt.pos_y
  from public.venue_hall_tables vt
  where vt.hall_id = _hall_id and vt.deleted_at is null;

  insert into public.fixtures (
    id, wedding_id, name, shape, width, height, rotation, pos_x, pos_y
  )
  select
    gen_random_uuid(), new_wedding_id, vf.name, vf.shape,
    vf.width, vf.height, vf.rotation, vf.pos_x, vf.pos_y
  from public.venue_hall_fixtures vf
  where vf.hall_id = _hall_id and vf.deleted_at is null;

  return new_wedding_id;
end;
$$;

revoke all on function public.start_wedding_from_hall(uuid, text, date) from public;
grant execute on function public.start_wedding_from_hall(uuid, text, date) to authenticated;
