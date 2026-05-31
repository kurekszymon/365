-- Atomic "replace the entire planner layout for a wedding" RPC used by the
-- DXF import wizard. The wizard collects parsed hall + tables + fixtures
-- client-side, presents a preview, and on confirmation calls this RPC to
-- (1) upsert the hall, (2) hard-delete all existing tables and fixtures for
-- the wedding, (3) insert the new ones — all inside a single transaction.
--
-- Hard deletes are intentional: import is an explicit "replace current layout"
-- action. Guest assignments referencing the deleted tables fall back to NULL
-- through the existing `on delete set null` foreign key.
--
-- SECURITY DEFINER so the function can perform the cross-table writes without
-- each table's RLS firing per-row; the function itself enforces the
-- editor/owner check up front.
create function public.replace_planner_layout(
  p_wedding_id uuid,
  p_hall_preset text,
  p_hall_width numeric,
  p_hall_height numeric,
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

  -- 1. Hall
  insert into public.halls (wedding_id, preset, width, height)
  values (p_wedding_id, p_hall_preset, p_hall_width, p_hall_height)
  on conflict (wedding_id) do update
    set preset = excluded.preset,
        width = excluded.width,
        height = excluded.height;

  -- 2. Wipe existing tables and fixtures. `guests.table_id` FK has
  --    `on delete set null`, so guest rows survive but become unassigned.
  delete from public.tables where wedding_id = p_wedding_id;
  delete from public.fixtures where wedding_id = p_wedding_id;

  -- 3. Insert new tables.
  insert into public.tables (
    id, wedding_id, name, shape, capacity, width, height,
    rotation, pos_x, pos_y, geometry
  )
  select
    (t->>'id')::uuid,
    p_wedding_id,
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
    id, wedding_id, name, shape, width, height,
    rotation, pos_x, pos_y, geometry
  )
  select
    (f->>'id')::uuid,
    p_wedding_id,
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

revoke all on function public.replace_planner_layout(uuid, text, numeric, numeric, jsonb, jsonb) from public;
grant execute on function public.replace_planner_layout(uuid, text, numeric, numeric, jsonb, jsonb) to authenticated;
