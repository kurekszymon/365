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

-- A seat only means something while the guest is at a table: a non-null seat_id
-- requires a non-null table_id. (updateGuestSeat always writes both columns
-- together, so the client never trips this — it's a guard against stray rows.)
alter table public.guests
  add constraint guests_seat_requires_table
  check (seat_id is null or table_id is not null);

-- At most one guest may be pinned to a given seat of a given table. Partial so
-- the many guests with seat_id null (order-fill) don't collide. This is the
-- backstop for concurrent edits where two clients could otherwise pin the same
-- seat; the second write fails loudly instead of silently double-booking.
create unique index guests_unique_seat_per_table
  on public.guests (table_id, seat_id)
  where seat_id is not null and deleted_at is null;
