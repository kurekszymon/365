-- Custom polygon geometry for halls, mirroring the tables/fixtures pattern
-- from 20260531000001: hall-local meters, top-left origin, bbox-min at (0,0);
-- `width`/`height` remain the polygon's AABB so canvas / world-bounds / drag
-- logic keeps working unchanged.
--
-- `geometry` payload:
--   { "vertices": [{"x":0,"y":0},{"x":10,"y":0},{"x":10,"y":6}], "closed": true }
--
-- Invariant: geometry present <=> preset != 'rectangle'. The non-rectangle
-- presets predate this migration but were only ever round-tripped, never
-- rendered, so legacy rows are normalized to 'rectangle' first.

alter table public.halls add column geometry jsonb;

update public.halls set preset = 'rectangle' where preset <> 'rectangle';

alter table public.halls
  add constraint halls_geometry_required_for_polygon
  check (
    (
      preset in ('l-shape', 'u-shape', 'custom')
      -- The explicit null guard matters: jsonb_typeof(null) is SQL NULL, and
      -- a NULL check result would let a geometry-less polygon preset through.
      and geometry is not null
      and jsonb_typeof(geometry) = 'object'
      and jsonb_typeof(geometry->'vertices') = 'array'
      and jsonb_array_length(geometry->'vertices') >= 3
      and jsonb_typeof(geometry->'closed') = 'boolean'
    )
    or (preset = 'rectangle' and geometry is null)
  );

-- Backport the same explicit `geometry is not null` guard to the sibling
-- tables/fixtures constraints from 20260531000001. Without it a 'custom' /
-- 'polygon' row carrying SQL NULL geometry slips through: jsonb_typeof(null) is
-- SQL NULL, so the whole conjunction is UNKNOWN, which Postgres treats as a
-- satisfied CHECK. The guard forces such rows down the rejecting `shape <> ...`
-- branch instead.
alter table public.tables drop constraint tables_geometry_required_for_custom;
alter table public.tables
  add constraint tables_geometry_required_for_custom
  check (
    (
      shape = 'custom'
      and geometry is not null
      and jsonb_typeof(geometry) = 'object'
      and jsonb_typeof(geometry->'vertices') = 'array'
      and jsonb_array_length(geometry->'vertices') > 0
      and jsonb_typeof(geometry->'closed') = 'boolean'
    )
    or (shape <> 'custom')
  );

alter table public.fixtures drop constraint fixtures_geometry_required_for_polygon;
alter table public.fixtures
  add constraint fixtures_geometry_required_for_polygon
  check (
    (
      shape = 'polygon'
      and geometry is not null
      and jsonb_typeof(geometry) = 'object'
      and jsonb_typeof(geometry->'vertices') = 'array'
      and jsonb_array_length(geometry->'vertices') > 0
      and jsonb_typeof(geometry->'closed') = 'boolean'
    )
    or (shape <> 'polygon')
  );

-- Carry hall geometry through the layout-replacement RPC (CAD import / local
-- wedding migration). Same signature, so grants are preserved.
create or replace function public.replace_planner_layout(
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
  -- Normalize preset/geometry together, mirroring the app-side load path
  -- (loadWedding.ts): geometry is kept only for a non-rectangle preset, and a
  -- preset whose geometry drops out falls back to 'rectangle'. Without this a
  -- CAD-import payload with a preset/geometry mismatch would hard-fail the
  -- halls_geometry_required_for_polygon CHECK instead of self-healing.
  insert into public.halls (id, wedding_id, name, floor, preset, width, height, pos_x, pos_y, geometry)
  select
    (h->>'id')::uuid,
    p_wedding_id,
    coalesce(h->>'name', ''),
    (h->>'floor')::int,
    case when norm.geometry is not null then h->>'preset' else 'rectangle' end,
    (h->>'width')::numeric,
    (h->>'height')::numeric,
    coalesce((h->>'pos_x')::numeric, 0),
    coalesce((h->>'pos_y')::numeric, 0),
    norm.geometry
  from jsonb_array_elements(coalesce(p_halls, '[]'::jsonb)) as h,
  lateral (
    select case
      when h->>'preset' is distinct from 'rectangle'
        and h ? 'geometry'
        and (h->'geometry') is not null
        and (h->'geometry') <> 'null'::jsonb
        and jsonb_typeof(h->'geometry') = 'object'
      then h->'geometry'
      else null
    end as geometry
  ) norm;

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
