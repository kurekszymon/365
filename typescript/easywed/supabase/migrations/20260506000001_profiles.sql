-- profiles: per-user metadata. user_type is null until onboarding completes;
-- auth users without a user_type are gated to /onboarding by client guards.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_type text check (user_type in ('couple', 'venue')),
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create an empty profile row on auth user creation. The user_type is
-- left null and filled in via set_user_type() at onboarding.
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

alter table public.profiles enable row level security;

-- Authenticated users can read any profile. Required so couples can render
-- venue display names from venue_halls catalog without a server hop.
create policy "authenticated can view profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Prevent direct user_type writes; channel them through set_user_type() so
-- the one-shot semantic (no overwrite) is enforced server-side.
revoke update (user_type) on public.profiles from authenticated;

-- One-shot setter: refuses overwrite of an existing user_type. Returns void;
-- callers should re-fetch the profile after a successful call.
create function public.set_user_type(_user_type text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if _user_type not in ('couple', 'venue') then
    raise exception 'Invalid user_type %', _user_type;
  end if;

  update public.profiles
    set user_type = _user_type, updated_at = now()
    where id = auth.uid() and user_type is null;

  if not found then
    raise exception 'user_type already set or profile missing';
  end if;
end;
$$;

revoke all on function public.set_user_type(text) from public;
grant execute on function public.set_user_type(text) to authenticated;
