-- profiles: one row per auth user, tracks account type and display name.
-- user_type is nullable on purpose — null means the user hasn't completed
-- onboarding yet and should be redirected to /onboarding.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_type text check (user_type in ('couple', 'venue', 'planner')),
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row (with user_type = null) whenever a new auth user
-- is created, so there's always a row to query and update in onboarding.
create function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);
