-- fixtures: decorative/functional objects placed in the hall
-- (e.g. DJ booth, photo booth, stage, bar, pillars, etc.)
create table public.fixtures (
  id uuid primary key,
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  name text not null default '',
  shape text not null check (shape in ('rectangle', 'circle', 'rounded')),
  width numeric not null check (width > 0),
  height numeric not null check (height > 0),
  rotation smallint not null default 0 check (rotation in (0, 90)),
  pos_x numeric not null,
  pos_y numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index fixtures_wedding_id_idx on public.fixtures (wedding_id);

create trigger fixtures_set_updated_at
  before update on public.fixtures
  for each row execute function public.set_updated_at();

alter table public.fixtures enable row level security;

create policy "members can view fixtures"
  on public.fixtures for select
  using (public.is_wedding_member(wedding_id));

create policy "editors can insert fixtures"
  on public.fixtures for insert
  with check (public.wedding_role(wedding_id) in ('owner', 'editor'));

create policy "editors can update fixtures"
  on public.fixtures for update
  using (public.wedding_role(wedding_id) in ('owner', 'editor'));

create policy "editors can delete fixtures"
  on public.fixtures for delete
  using (public.wedding_role(wedding_id) in ('owner', 'editor'));
