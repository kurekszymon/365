-- venues: a venue business owned by a single user (one-to-many supported,
-- but the UX assumes one venue per user for now). Couples cannot create
-- venues; insert is gated on profiles.user_type='venue'.
create table public.venues (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index venues_owner_id_idx on public.venues (owner_id);

create trigger venues_set_updated_at
  before update on public.venues
  for each row execute function public.set_updated_at();

alter table public.venues enable row level security;

-- Authenticated users can read any venue (couples need venue.name in the
-- public hall catalog).
create policy "authenticated can view venues"
  on public.venues for select
  to authenticated
  using (true);

-- Only users marked as user_type='venue' can create their own venue row.
create policy "venues insert own"
  on public.venues for insert
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.user_type = 'venue'
    )
  );

create policy "venue owners update"
  on public.venues for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "venue owners delete"
  on public.venues for delete
  using (owner_id = auth.uid());

-- Prevent ownership reassignment via UPDATE. Mirrors the pattern in
-- 20260418000002 for weddings.owner_id.
revoke update (owner_id) on public.venues from authenticated;
