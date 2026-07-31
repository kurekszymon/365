-- profiles: the only piece of a user's identity co-members are allowed to see.
-- Deliberately minimal - a nullable display name the user types themselves.
--
-- What is NOT here is the point: emails and OAuth metadata (Google hands us
-- full_name / picture / email in auth.users.raw_user_meta_data whether we ask
-- or not) stay in auth.users, reachable only by the user themselves and the
-- service role. Accepting a wedding invite must not hand every co-planner the
-- other members' contact details. The Google name is offered to the user as a
-- prefill in the settings form, client-side, and is only stored here once they
-- save it - so what lands in this table is always something they chose to share.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  -- Null = "hasn't set one yet"; the UI falls back to the member's role
  -- ("Editor") rather than inventing an identity for them.
  display_name text check (
    display_name is null
    or (
      display_name = btrim(display_name)
      and length(display_name) between 1 and 40
    )
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Every user gets a row at signup, so the members list can join on it
-- unconditionally instead of guessing whether a profile exists.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill everyone who signed up before this migration.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

alter table public.profiles enable row level security;

-- Security definer for the same reason as is_wedding_member: the policy below
-- reads wedding_members, whose own policies would otherwise recurse.
create function public.shares_wedding_with(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.wedding_members mine
    join public.wedding_members theirs on theirs.wedding_id = mine.wedding_id
    where mine.user_id = auth.uid()
      and theirs.user_id = _user_id
  );
$$;

-- You can read your own profile, and the profiles of people you actually share
-- a wedding with. Not the whole user table.
create policy "read own and co-members profiles"
  on public.profiles for select
  using (id = auth.uid() or public.shares_wedding_with(id));

-- The signup trigger normally creates the row; this covers a client
-- self-healing a missing one (e.g. a user created outside the trigger's watch).
create policy "users create own profile"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "users update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Same hardening as weddings.owner_id: the id is the identity, never editable.
revoke update (id) on public.profiles from authenticated;

-- No delete policy: profiles die with their auth.users row via the cascade.
