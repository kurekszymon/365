-- weddings: top-level container. One row per couple/planner project.
create table public.weddings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- wedding_members: who can access a wedding, with what role.
-- 'owner' = creator, can invite/remove members, delete wedding
-- 'editor' = can modify data
-- 'viewer' = read-only
create table public.wedding_members (
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (wedding_id, user_id)
);

create index wedding_members_user_id_idx on public.wedding_members (user_id);

-- security definer helpers bypass RLS when called from policies,
-- avoiding self-referential recursion on wedding_members.
create function public.is_wedding_member(_wedding_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.wedding_members
    where wedding_id = _wedding_id and user_id = auth.uid()
  );
$$;

create function public.wedding_role(_wedding_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.wedding_members
  where wedding_id = _wedding_id and user_id = auth.uid();
$$;

-- auto-insert the creator as owner-member on wedding creation.
create function public.handle_new_wedding()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.wedding_members (wedding_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

create trigger on_wedding_created
  after insert on public.weddings
  for each row execute function public.handle_new_wedding();

-- touch updated_at on every update.
create function public.set_updated_at()
returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger weddings_set_updated_at
  before update on public.weddings
  for each row execute function public.set_updated_at();

alter table public.weddings enable row level security;
alter table public.wedding_members enable row level security;

-- weddings policies
create policy "members can view their weddings"
  on public.weddings for select
  using (public.is_wedding_member(id));

create policy "authenticated users can create their own weddings"
  on public.weddings for insert
  with check (owner_id = auth.uid());

create policy "owners and editors can update weddings"
  on public.weddings for update
  using (public.wedding_role(id) in ('owner', 'editor'));

create policy "owners can delete weddings"
  on public.weddings for delete
  using (owner_id = auth.uid());

-- wedding_members policies
create policy "members can view co-members"
  on public.wedding_members for select
  using (public.is_wedding_member(wedding_id));

create policy "owners can add members"
  on public.wedding_members for insert
  with check (
    exists (
      select 1 from public.weddings w
      where w.id = wedding_members.wedding_id
        and w.owner_id = auth.uid()
    )
  );

create policy "owners can remove members"
  on public.wedding_members for delete
  using (
    exists (
      select 1 from public.weddings w
      where w.id = wedding_members.wedding_id
        and w.owner_id = auth.uid()
    )
  );
