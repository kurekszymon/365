-- Add rotation (in degrees) to rectangular tables. Only 0 and 90 are supported
-- for now; 45 / 135 would require trig for AABB math and clamp logic.
alter table public.tables
  add column rotation integer not null default 0
  check (rotation in (0, 90));
