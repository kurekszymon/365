-- venue_halls: reusable hall layouts owned by a venue. A venue can publish
-- multiple halls (e.g. main ballroom, garden tent, terrace). Couples browse
-- public halls and copy them into a fresh wedding via start_wedding_from_hall.
create table public.venue_halls (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  name text not null default '',
  description text,
  preset text not null check (preset in ('rectangle', 'l-shape', 'u-shape', 'custom')),
  width numeric not null check (width > 0),
  height numeric not null check (height > 0),
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index venue_halls_venue_id_idx on public.venue_halls (venue_id);
create index venue_halls_is_public_idx on public.venue_halls (is_public);

create trigger venue_halls_set_updated_at
  before update on public.venue_halls
  for each row execute function public.set_updated_at();

-- venue_hall_tables / venue_hall_fixtures mirror public.tables /
-- public.fixtures shape so the planner store and mutation helpers can be
-- driven by either source via a subjectKind switch in the global store.
create table public.venue_hall_tables (
  id uuid primary key,
  hall_id uuid not null references public.venue_halls(id) on delete cascade,
  name text not null default '',
  shape text not null check (shape in ('round', 'rectangular')),
  capacity integer not null check (capacity > 0),
  width numeric not null check (width > 0),
  height numeric not null check (height > 0),
  rotation integer not null default 0 check (rotation in (0, 90)),
  pos_x numeric not null,
  pos_y numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index venue_hall_tables_hall_id_idx on public.venue_hall_tables (hall_id);

create trigger venue_hall_tables_set_updated_at
  before update on public.venue_hall_tables
  for each row execute function public.set_updated_at();

create table public.venue_hall_fixtures (
  id uuid primary key,
  hall_id uuid not null references public.venue_halls(id) on delete cascade,
  name text not null default '',
  shape text not null check (shape in ('rectangle', 'circle', 'rounded')),
  width numeric not null check (width > 0),
  height numeric not null check (height > 0),
  rotation integer not null default 0 check (rotation in (0, 90)),
  pos_x numeric not null,
  pos_y numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index venue_hall_fixtures_hall_id_idx on public.venue_hall_fixtures (hall_id);

create trigger venue_hall_fixtures_set_updated_at
  before update on public.venue_hall_fixtures
  for each row execute function public.set_updated_at();

-- security definer helpers: avoid RLS recursion through child tables and
-- give policies a clean, indexable boolean. Mirrors the is_wedding_member /
-- wedding_role pattern from 20260416000001.
create function public.is_venue_owner(_venue_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.venues
    where id = _venue_id and owner_id = auth.uid()
  );
$$;

create function public.can_view_venue_hall(_hall_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.venue_halls h
    where h.id = _hall_id
      and (h.is_public or public.is_venue_owner(h.venue_id))
  );
$$;

create function public.is_venue_hall_owner(_hall_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.venue_halls h
    where h.id = _hall_id
      and public.is_venue_owner(h.venue_id)
  );
$$;

alter table public.venue_halls enable row level security;
alter table public.venue_hall_tables enable row level security;
alter table public.venue_hall_fixtures enable row level security;

-- venue_halls: public halls visible to everyone authenticated; venue owners
-- always see their own (even unpublished); only owners CRUD.
create policy "public halls visible"
  on public.venue_halls for select
  to authenticated
  using (is_public or public.is_venue_owner(venue_id));

create policy "venue owners insert halls"
  on public.venue_halls for insert
  with check (public.is_venue_owner(venue_id));

create policy "venue owners update halls"
  on public.venue_halls for update
  using (public.is_venue_owner(venue_id))
  with check (public.is_venue_owner(venue_id));

create policy "venue owners delete halls"
  on public.venue_halls for delete
  using (public.is_venue_owner(venue_id));

-- venue_hall_tables: read piggybacks on parent visibility; write requires
-- ownership of the parent venue.
create policy "view venue_hall_tables"
  on public.venue_hall_tables for select
  to authenticated
  using (public.can_view_venue_hall(hall_id));

create policy "owners insert venue_hall_tables"
  on public.venue_hall_tables for insert
  with check (public.is_venue_hall_owner(hall_id));

create policy "owners update venue_hall_tables"
  on public.venue_hall_tables for update
  using (public.is_venue_hall_owner(hall_id));

create policy "owners delete venue_hall_tables"
  on public.venue_hall_tables for delete
  using (public.is_venue_hall_owner(hall_id));

create policy "view venue_hall_fixtures"
  on public.venue_hall_fixtures for select
  to authenticated
  using (public.can_view_venue_hall(hall_id));

create policy "owners insert venue_hall_fixtures"
  on public.venue_hall_fixtures for insert
  with check (public.is_venue_hall_owner(hall_id));

create policy "owners update venue_hall_fixtures"
  on public.venue_hall_fixtures for update
  using (public.is_venue_hall_owner(hall_id));

create policy "owners delete venue_hall_fixtures"
  on public.venue_hall_fixtures for delete
  using (public.is_venue_hall_owner(hall_id));
