-- Multi-hall support: a wedding can now have several halls (rooms/floors),
-- each with a name, an optional floor number, and a world-space position
-- (meters, top-left origin) so all halls render together on one canvas.
-- Entity positions (tables/fixtures) stay hall-local; render position is
-- hall position + entity position, so existing coordinates remain valid
-- with the legacy hall backfilled at world (0, 0).

-- 1. halls: give the table its own identity. wedding_id was both PK and FK
--    (hard 1:1); it becomes a plain indexed FK.
alter table public.halls drop constraint halls_pkey;
alter table public.halls add column id uuid not null default gen_random_uuid();
alter table public.halls add primary key (id);
create index halls_wedding_id_idx on public.halls (wedding_id);

alter table public.halls add column name text not null default '';
alter table public.halls add column floor integer;
alter table public.halls add column pos_x numeric not null default 0;
alter table public.halls add column pos_y numeric not null default 0;

-- 2. Backfill: weddings that already have tables/fixtures but never saved a
--    hall row get the client's default 20x12 hall (mirrors the loadWedding
--    fallback), so every existing entity can be attached to a hall below.
insert into public.halls (wedding_id, preset, width, height)
select w.wedding_id, 'rectangle', 20, 12
from (
  select wedding_id from public.tables
  union
  select wedding_id from public.fixtures
) w
where not exists (
  select 1 from public.halls h where h.wedding_id = w.wedding_id
);

-- 3. tables/fixtures reference their hall. Nullable with `on delete set null`:
--    the client adopts orphaned rows into the wedding's first hall on load,
--    and the hall-deletion UI moves or deletes contents explicitly first.
alter table public.tables
  add column hall_id uuid references public.halls(id) on delete set null;
alter table public.fixtures
  add column hall_id uuid references public.halls(id) on delete set null;
create index tables_hall_id_idx on public.tables (hall_id);
create index fixtures_hall_id_idx on public.fixtures (hall_id);

-- 4. Attach existing entities. Pre-migration every wedding has at most one
--    hall row (old PK), so this join is unambiguous.
update public.tables t
set hall_id = h.id
from public.halls h
where h.wedding_id = t.wedding_id;

update public.fixtures f
set hall_id = h.id
from public.halls h
where h.wedding_id = f.wedding_id;

-- 5. Replace the DXF-import RPC with a hall-aware signature: the client sends
--    the full hall list plus tables/fixtures carrying hall_id. Semantics are
--    unchanged otherwise: explicit "replace current layout", hard deletes,
--    guests fall back to unassigned via the `on delete set null` FK.
drop function public.replace_planner_layout(uuid, text, numeric, numeric, jsonb, jsonb);

create function public.replace_planner_layout(
  p_wedding_id uuid,
  p_halls jsonb,
  p_tables jsonb,
  p_fixtures jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
begin
  caller_role := public.wedding_role(p_wedding_id);
  if caller_role is null or caller_role not in ('owner', 'editor') then
    raise exception 'not authorized to replace planner layout for wedding %', p_wedding_id
      using errcode = '42501';
  end if;

  -- 1. Wipe the existing layout. Tables/fixtures first for clarity; their
  --    hall_id FK is `on delete set null` so order is not load-bearing.
  delete from public.tables where wedding_id = p_wedding_id;
  delete from public.fixtures where wedding_id = p_wedding_id;
  delete from public.halls where wedding_id = p_wedding_id;

  -- 2. Insert halls. Ids are client-generated so tables/fixtures below can
  --    reference them.
  insert into public.halls (id, wedding_id, name, floor, preset, width, height, pos_x, pos_y)
  select
    (h->>'id')::uuid,
    p_wedding_id,
    coalesce(h->>'name', ''),
    (h->>'floor')::int,
    h->>'preset',
    (h->>'width')::numeric,
    (h->>'height')::numeric,
    coalesce((h->>'pos_x')::numeric, 0),
    coalesce((h->>'pos_y')::numeric, 0)
  from jsonb_array_elements(coalesce(p_halls, '[]'::jsonb)) as h;

  -- 3. Insert new tables.
  insert into public.tables (
    id, wedding_id, hall_id, name, shape, capacity, width, height,
    rotation, pos_x, pos_y, geometry
  )
  select
    (t->>'id')::uuid,
    p_wedding_id,
    (t->>'hall_id')::uuid,
    coalesce(t->>'name', ''),
    t->>'shape',
    (t->>'capacity')::int,
    (t->>'width')::numeric,
    (t->>'height')::numeric,
    coalesce((t->>'rotation')::int, 0),
    (t->>'pos_x')::numeric,
    (t->>'pos_y')::numeric,
    case when t ? 'geometry' and (t->'geometry') is not null and (t->'geometry') <> 'null'::jsonb
         then t->'geometry'
         else null end
  from jsonb_array_elements(coalesce(p_tables, '[]'::jsonb)) as t;

  -- 4. Insert new fixtures.
  insert into public.fixtures (
    id, wedding_id, hall_id, name, shape, width, height,
    rotation, pos_x, pos_y, geometry
  )
  select
    (f->>'id')::uuid,
    p_wedding_id,
    (f->>'hall_id')::uuid,
    coalesce(f->>'name', ''),
    f->>'shape',
    (f->>'width')::numeric,
    (f->>'height')::numeric,
    coalesce((f->>'rotation')::int, 0),
    (f->>'pos_x')::numeric,
    (f->>'pos_y')::numeric,
    case when f ? 'geometry' and (f->'geometry') is not null and (f->'geometry') <> 'null'::jsonb
         then f->'geometry'
         else null end
  from jsonb_array_elements(coalesce(p_fixtures, '[]'::jsonb)) as f;
end;
$$;

revoke all on function public.replace_planner_layout(uuid, jsonb, jsonb, jsonb) from public;
grant execute on function public.replace_planner_layout(uuid, jsonb, jsonb, jsonb) to authenticated;
