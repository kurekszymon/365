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

-- Backfill: create profile rows for any auth users that existed before this
-- migration (the trigger only fires for new sign-ups).
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

alter table public.profiles enable row level security;

-- Any authenticated user can read any profile row (needed so the template
-- browser can display venue display_names). user_type is not sensitive data.
create policy "authenticated users can read profiles"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Block direct writes to user_type. The row-level "users can update their
-- own profile" policy still lets users update display_name/updated_at.
revoke update (user_type) on public.profiles from authenticated;

-- One-shot setter used by /onboarding. Refuses to overwrite an existing
-- non-null user_type — there is no legitimate path to change role after
-- onboarding.
create function public.set_user_type(_user_type text)
returns void language plpgsql security definer
set search_path = public
as $$
begin
  if _user_type not in ('couple','venue','planner') then
    raise exception 'invalid user_type %', _user_type;
  end if;

  update public.profiles
    set user_type = _user_type
    where id = auth.uid() and user_type is null;

  if not found then
    raise exception 'user_type already set or profile missing';
  end if;
end; $$;

revoke execute on function public.set_user_type(text) from public;
grant execute on function public.set_user_type(text) to authenticated;

-- Subscriptions: per-user billing state. Beta-active by default; Stripe wires
-- into the same table later by inserting/updating rows via service-role.
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tier text not null check (tier in ('beta','couple_free','planner','venue')),
  status text not null check (status in ('active','expired','canceled')),
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index subscriptions_one_active_per_user
  on public.subscriptions (user_id) where status = 'active';
create index subscriptions_user_id_idx on public.subscriptions (user_id);

alter table public.subscriptions enable row level security;

create policy "users can read own subscriptions"
  on public.subscriptions for select
  using (user_id = auth.uid());
-- No INSERT/UPDATE/DELETE policies: writes only via SECURITY DEFINER helpers.

create function public.has_active_subscription(_user_id uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = _user_id
      and status = 'active'
      and (expires_at is null or expires_at > now())
  );
$$;
revoke execute on function public.has_active_subscription(uuid) from public;
grant execute on function public.has_active_subscription(uuid) to authenticated;

-- Idempotent: called from /upgrade. Don't fold this into handle_new_user —
-- the /upgrade screen is the only legitimate caller, so users can't skip it.
create function public.start_beta_subscription()
returns void language plpgsql security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.subscriptions
    where user_id = auth.uid() and status = 'active'
  ) then
    return;
  end if;
  insert into public.subscriptions (user_id, tier, status)
  values (auth.uid(), 'beta', 'active');
end; $$;
revoke execute on function public.start_beta_subscription() from public;
grant execute on function public.start_beta_subscription() to authenticated;
