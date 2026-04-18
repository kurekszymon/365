-- halls: one row per wedding. wedding_id is both PK and FK.
create table public.halls (
  wedding_id uuid primary key references public.weddings(id) on delete cascade,
  preset text not null check (preset in ('rectangle', 'l-shape', 'u-shape', 'custom')),
  width numeric not null check (width > 0),
  height numeric not null check (height > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger halls_set_updated_at
  before update on public.halls
  for each row execute function public.set_updated_at();

-- tables: seating tables within a wedding's hall.
create table public.tables (
  id uuid primary key,
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  name text not null default '',
  shape text not null check (shape in ('round', 'rectangular')),
  capacity integer not null check (capacity > 0),
  width numeric not null check (width > 0),
  height numeric not null check (height > 0),
  pos_x numeric not null,
  pos_y numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index tables_wedding_id_idx on public.tables (wedding_id);

create trigger tables_set_updated_at
  before update on public.tables
  for each row execute function public.set_updated_at();

-- guests: attendees, optionally assigned to a table.
create table public.guests (
  id uuid primary key,
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  table_id uuid references public.tables(id) on delete set null,
  name text not null default '',
  dietary text[] not null default '{}',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint guests_dietary_values check (
    dietary <@ array['vegetarian', 'vegan', 'gluten-free', 'halal', 'kosher']::text[]
  )
);

create index guests_wedding_id_idx on public.guests (wedding_id);
create index guests_table_id_idx on public.guests (table_id);

create trigger guests_set_updated_at
  before update on public.guests
  for each row execute function public.set_updated_at();

-- enforce table capacity at the DB level; client stays authoritative for UX.
create function public.enforce_table_capacity()
returns trigger
language plpgsql as $$
declare
  table_capacity integer;
  assigned_count integer;
begin
  if new.table_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and new.table_id is not distinct from old.table_id then
    return new;
  end if;

  select capacity into table_capacity
  from public.tables
  where id = new.table_id;

  select count(*) into assigned_count
  from public.guests
  where table_id = new.table_id
    and deleted_at is null
    and id <> new.id;

  if assigned_count >= table_capacity then
    raise exception 'Table % is at capacity (%)', new.table_id, table_capacity;
  end if;

  return new;
end;
$$;

create trigger guests_enforce_capacity
  before insert or update of table_id on public.guests
  for each row execute function public.enforce_table_capacity();

-- reminders: wedding todo list.
create table public.reminders (
  id uuid primary key,
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  text text not null,
  due timestamptz,
  status text not null check (status in ('open', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reminders_wedding_id_idx on public.reminders (wedding_id);

create trigger reminders_set_updated_at
  before update on public.reminders
  for each row execute function public.set_updated_at();

alter table public.halls enable row level security;
alter table public.tables enable row level security;
alter table public.guests enable row level security;
alter table public.reminders enable row level security;

-- halls policies
create policy "members can view halls"
  on public.halls for select
  using (public.is_wedding_member(wedding_id));

create policy "editors can insert halls"
  on public.halls for insert
  with check (public.wedding_role(wedding_id) in ('owner', 'editor'));

create policy "editors can update halls"
  on public.halls for update
  using (public.wedding_role(wedding_id) in ('owner', 'editor'));

create policy "editors can delete halls"
  on public.halls for delete
  using (public.wedding_role(wedding_id) in ('owner', 'editor'));

-- tables policies
create policy "members can view tables"
  on public.tables for select
  using (public.is_wedding_member(wedding_id));

create policy "editors can insert tables"
  on public.tables for insert
  with check (public.wedding_role(wedding_id) in ('owner', 'editor'));

create policy "editors can update tables"
  on public.tables for update
  using (public.wedding_role(wedding_id) in ('owner', 'editor'));

create policy "editors can delete tables"
  on public.tables for delete
  using (public.wedding_role(wedding_id) in ('owner', 'editor'));

-- guests policies
create policy "members can view guests"
  on public.guests for select
  using (public.is_wedding_member(wedding_id));

create policy "editors can insert guests"
  on public.guests for insert
  with check (public.wedding_role(wedding_id) in ('owner', 'editor'));

create policy "editors can update guests"
  on public.guests for update
  using (public.wedding_role(wedding_id) in ('owner', 'editor'));

create policy "editors can delete guests"
  on public.guests for delete
  using (public.wedding_role(wedding_id) in ('owner', 'editor'));

-- reminders policies
create policy "members can view reminders"
  on public.reminders for select
  using (public.is_wedding_member(wedding_id));

create policy "editors can insert reminders"
  on public.reminders for insert
  with check (public.wedding_role(wedding_id) in ('owner', 'editor'));

create policy "editors can update reminders"
  on public.reminders for update
  using (public.wedding_role(wedding_id) in ('owner', 'editor'));

create policy "editors can delete reminders"
  on public.reminders for delete
  using (public.wedding_role(wedding_id) in ('owner', 'editor'));
