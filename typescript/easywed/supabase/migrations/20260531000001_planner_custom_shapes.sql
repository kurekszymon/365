-- Add polygon geometry support to tables and fixtures so CAD-imported shapes
-- (and any future hand-drawn ones) can be persisted instead of being flattened
-- to a bounding box. `width`/`height` continue to be the AABB of the polygon,
-- so all existing canvas / drag / clamp logic keeps working unchanged.
--
-- `geometry` payload (object-local, top-left origin, meters):
--   { "vertices": [{"x":0,"y":0},{"x":1.5,"y":0},{"x":1.5,"y":0.7}], "closed": true }

alter table public.tables add column geometry jsonb;
alter table public.fixtures add column geometry jsonb;

-- Extend shape unions and require geometry for the new variants.
alter table public.tables drop constraint tables_shape_check;
alter table public.tables
  add constraint tables_shape_check
  check (shape in ('round', 'rectangular', 'custom'));

-- jsonb_typeof guards against `'null'::jsonb` and primitive payloads that
-- would satisfy `is not null` but carry no usable geometry.
alter table public.tables
  add constraint tables_geometry_required_for_custom
  check (
    (
      shape = 'custom'
      and jsonb_typeof(geometry) = 'object'
      and jsonb_typeof(geometry->'vertices') = 'array'
      and jsonb_array_length(geometry->'vertices') > 0
      and jsonb_typeof(geometry->'closed') = 'boolean'
    )
    or (shape <> 'custom')
  );

alter table public.fixtures drop constraint fixtures_shape_check;
alter table public.fixtures
  add constraint fixtures_shape_check
  check (shape in ('rectangle', 'circle', 'rounded', 'polygon'));

alter table public.fixtures
  add constraint fixtures_geometry_required_for_polygon
  check (
    (
      shape = 'polygon'
      and jsonb_typeof(geometry) = 'object'
      and jsonb_typeof(geometry->'vertices') = 'array'
      and jsonb_array_length(geometry->'vertices') > 0
      and jsonb_typeof(geometry->'closed') = 'boolean'
    )
    or (shape <> 'polygon')
  );
