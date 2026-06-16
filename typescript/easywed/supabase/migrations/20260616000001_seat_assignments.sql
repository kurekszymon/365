-- Per-seat guest assignment + manual seat positions.
--
-- `tables.seats` stores a sparse array of seat position overrides
-- ({ id, x, y } in table-local meters); seats the user has never dragged are
-- not stored and fall back to the auto layout computed client-side. Seat ids are
-- deterministic by index ("seat-0", "seat-1", ...), so `guests.seat_id` can
-- reference a seat even before the table's override array is materialized.
--
-- `guests.seat_id` pins a guest to a specific seat of its table. A guest with a
-- table but no seat_id still fills the first free seat in order (legacy behavior).

alter table public.tables
  add column seats jsonb not null default '[]'::jsonb;

alter table public.guests
  add column seat_id text;
