-- venue menus: the catalogue a venue authors, and nothing that reads it yet.
--
-- A venue's product *is* its menu - four packages, each a list of courses, each
-- course a "pick N of these" rule over 3-30 dishes. Until now the app had no
-- food-shaped field at all beyond `guests.dietary`, so the whole menu
-- conversation happened in PDF and email.
--
-- This is the first of three migrations and it is deliberately inert: applying
-- it to production is a no-op for every existing user. The three new tables are
-- empty, no policy on the wedding tree changes, `tenant_public()` is untouched
-- so nothing anonymous can reach a price, and no couple can read any of it -
-- that policy arrives in 20260822000002 with the surface that needs it. The
-- blast radius of this file is exactly "venue staff, their own tenant".
--
-- This migration introduces **no policy helper**. Every predicate below calls
-- `is_tenant_staff`, which already exists and already keeps its `anon` EXECUTE
-- grant for the reason 20260817000001's header gives at length. Nothing new
-- here is evaluated inside an RLS expression, so the segfault caveat does not
-- apply to anything this file creates, and the two RPCs in section 5 get the
-- standard revoke.

-- ---------------------------------------------------------------------------
-- 1. tenants.currency
-- ---------------------------------------------------------------------------
-- Prices are integer minor units (see src/lib/money.ts); this is what they are
-- denominated in. One currency per venue, sitting beside `locale`, which is the
-- same kind of setting.
--
-- A shape CHECK rather than an ISO allowlist, matching the preference stated in
-- docs/supabase.md - an allowlist is a migration the first time someone opens
-- in Prague, and the value is only ever handed to Intl.NumberFormat. The client
-- pays for that choice: `formatMoney` wraps Intl in a try/catch, because a
-- shape-checked code can be a well-formed nonsense like 'ZZZ' and Intl throws
-- RangeError on those.
--
-- Deliberately **not** added to tenant_public(). Prices are for staff and for
-- linked couples; the anonymous /venue entry page shows branding only. This
-- line is the one to revisit if a public price list is ever wanted.
alter table public.tenants
  add column currency text not null default 'PLN'
    check (currency ~ '^[A-Z]{3}$');

-- ---------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------
create table public.menu_packages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,

  name text not null check (length(btrim(name)) between 1 and 60),
  description text check (description is null or length(description) <= 400),

  -- Integer minor units (grosze). See src/lib/money.ts; the currency is
  -- tenants.currency, one per venue. The ceiling is 1 000 000.00 of whatever
  -- that is - far past any per-person price, and low enough that a slipped
  -- decimal point is caught rather than stored.
  price_per_person_minor integer not null default 0
    check (price_per_person_minor between 0 and 100000000),

  position integer not null default 0,

  -- Archived, not soft-deleted, and the distinction is real: a venue retiring
  -- last year's offer must not blank the choices of a couple who already
  -- ordered from it. Hard DELETE stays available for a typo; the FKs clean up.
  archived_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- The target of the composite FKs below. This is what makes the denormalised
  -- tenant_id on courses and options structurally impossible to get wrong -
  -- no trigger to write, no CHECK to forget, nothing to keep in step.
  unique (tenant_id, id)
);

create table public.menu_courses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  menu_package_id uuid not null,

  name text not null check (length(btrim(name)) between 1 and 60),

  -- "(do wyboru 5 pozycji)" is rendered by the client from this number via a
  -- pluralised key. The venue never types that sentence.
  choose_count integer not null default 1 check (choose_count between 1 and 50),

  -- "3 porcje/osoba". Free text the venue types, shown verbatim, never t()'d.
  serving_note text check (serving_note is null or length(serving_note) <= 120),

  -- The whole shape decision, in one boolean. false = the couple picks
  -- choose_count dishes for everyone (a buffet). true = the couple picks the
  -- served set and one of those is then assigned per guest (a plated course,
  -- which is what MENU SERWOWANE is). Two shapes, one data model.
  per_guest_choice boolean not null default false,

  position integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  foreign key (tenant_id, menu_package_id)
    references public.menu_packages (tenant_id, id) on delete cascade,
  unique (tenant_id, id)
);

create table public.menu_options (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  menu_course_id uuid not null,

  -- Venue-authored dish name, Polish free text. NEVER routed through t().
  -- Runs long: "Placki z makaronu ryzowego z dodatkiem zoltego sera i pesto na
  -- rukoli z sosem balsamicznym" is 96 characters, so 120 is the working bound,
  -- not a round number.
  name text not null check (length(btrim(name)) between 1 and 120),
  note text check (note is null or length(note) <= 80),   -- "(maj, czerwiec)"

  position integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  foreign key (tenant_id, menu_course_id)
    references public.menu_courses (tenant_id, id) on delete cascade
);

-- Ordering is a plain integer `position` with a **non-unique** index, and the
-- non-uniqueness is a decision rather than an omission. Every read orders
-- `position, created_at, id`, so a duplicate costs an arbitrary but *stable*
-- order - nothing renders wrong, nothing jumps between loads. A fractional
-- index exists to avoid the multi-row rewrite that a reorder implies, and the
-- RPCs in section 5 already do that rewrite in one statement; for lists of at
-- most thirty rows, fractional keys would be a second mechanism to own for
-- nothing.
create index menu_packages_tenant_position_idx
  on public.menu_packages (tenant_id, position);
create index menu_courses_package_position_idx
  on public.menu_courses (menu_package_id, position);
create index menu_options_course_position_idx
  on public.menu_options (menu_course_id, position);

-- ---------------------------------------------------------------------------
-- 3. Triggers
-- ---------------------------------------------------------------------------
create trigger menu_packages_set_updated_at
  before update on public.menu_packages
  for each row execute function public.set_updated_at();

create trigger menu_courses_set_updated_at
  before update on public.menu_courses
  for each row execute function public.set_updated_at();

create trigger menu_options_set_updated_at
  before update on public.menu_options
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------------
alter table public.menu_packages enable row level security;
alter table public.menu_courses enable row level security;
alter table public.menu_options enable row level security;

-- Four policies per table, all the same predicate, and the sameness is the
-- point: the denormalised `tenant_id` carried by courses and options - held
-- correct by the composite FKs, not by a trigger - is what lets every policy
-- here be one function call with no join to walk.
--
-- `is_tenant_staff` rather than `is_tenant_member`, so a 'customer' of the
-- venue reaches none of this. A couple reads menus through their *wedding's*
-- link to the tenant, and that policy is deliberately not in this migration.
--
-- Every UPDATE carries `with check` as well as `using`, per the lesson in
-- 20260816000001: with only `using`, Postgres reuses it as the check and
-- evaluates it against the NEW row, which stops the predicate constraining what
-- the row may become - here, that would let staff move a package into another
-- tenant.
--
-- DELETE is granted, and the risk is real and accepted: hard-deleting a dish a
-- couple already chose blanks their choice (the FKs in 20260822000003 are
-- `on delete set null`). `archived_at` is the mitigation and the CRM's default
-- action; DELETE exists because typos happen before anyone has ordered, and it
-- sits behind a secondary action and a confirm in the UI.
create policy "staff view their tenant's menu packages"
  on public.menu_packages for select
  using (public.is_tenant_staff(tenant_id));

create policy "staff create menu packages"
  on public.menu_packages for insert
  with check (public.is_tenant_staff(tenant_id));

create policy "staff update their menu packages"
  on public.menu_packages for update
  using (public.is_tenant_staff(tenant_id))
  with check (public.is_tenant_staff(tenant_id));

create policy "staff delete their menu packages"
  on public.menu_packages for delete
  using (public.is_tenant_staff(tenant_id));

create policy "staff view their tenant's menu courses"
  on public.menu_courses for select
  using (public.is_tenant_staff(tenant_id));

create policy "staff create menu courses"
  on public.menu_courses for insert
  with check (public.is_tenant_staff(tenant_id));

create policy "staff update their menu courses"
  on public.menu_courses for update
  using (public.is_tenant_staff(tenant_id))
  with check (public.is_tenant_staff(tenant_id));

create policy "staff delete their menu courses"
  on public.menu_courses for delete
  using (public.is_tenant_staff(tenant_id));

create policy "staff view their tenant's menu options"
  on public.menu_options for select
  using (public.is_tenant_staff(tenant_id));

create policy "staff create menu options"
  on public.menu_options for insert
  with check (public.is_tenant_staff(tenant_id));

create policy "staff update their menu options"
  on public.menu_options for update
  using (public.is_tenant_staff(tenant_id))
  with check (public.is_tenant_staff(tenant_id));

create policy "staff delete their menu options"
  on public.menu_options for delete
  using (public.is_tenant_staff(tenant_id));

-- ---------------------------------------------------------------------------
-- 5. Reorder RPCs
-- ---------------------------------------------------------------------------
-- One statement per drag, instead of N round trips that leave a half-reordered
-- list if the network drops between them.
--
-- Three properties, each deliberate:
--
--   * **Invoker rights, not `security definer`.** Staff already hold UPDATE on
--     these tables through the policies above, so RLS filters the statement:
--     ids belonging to another tenant simply do not match, and the call is a
--     silent no-op rather than needing hand-written authorization that could be
--     got wrong. A definer function here would have to re-implement
--     `is_tenant_staff` and would be the only place that check lived twice.
--
--   * **The `and ... = p_*` clause on the join.** Without it, a caller passing
--     ids from a different course of their own tenant would scramble that
--     course's order instead of doing nothing. It scopes the write to the list
--     the caller says they are reordering.
--
--   * **Two functions, not one with a `p_kind text` switch.** A text parameter
--     that selects a table is one refactor away from dynamic SQL, and this is
--     the file where that refactor would look harmless.
--
-- Positions are assigned from `with ordinality`, so they come out 1..n, dense
-- and gap-free, regardless of what they were before.
create function public.reorder_menu_courses(p_menu_package_id uuid, p_ids uuid[])
returns void
language sql
set search_path = public
as $$
  update public.menu_courses c
  set position = ord.i
  from unnest(p_ids) with ordinality as ord(id, i)
  where c.id = ord.id
    and c.menu_package_id = p_menu_package_id;
$$;

create function public.reorder_menu_options(p_course_id uuid, p_ids uuid[])
returns void
language sql
set search_path = public
as $$
  update public.menu_options o
  set position = ord.i
  from unnest(p_ids) with ordinality as ord(id, i)
  where o.id = ord.id
    and o.menu_course_id = p_course_id;
$$;

-- ---------------------------------------------------------------------------
-- 6. Grants
-- ---------------------------------------------------------------------------
-- `revoke ... from public` first, because on a fresh local database
-- `authenticated` may hold EXECUTE via PUBLIC rather than an explicit grant -
-- the shape established in 20260806000001.
--
-- Neither function is a policy helper: nothing evaluates them inside an RLS
-- expression, so the segfault caveat in 20260817000001's header does not apply,
-- and `anon` has no reason to reach either. Both are meaningless without a
-- session - with no `auth.uid()`, RLS filters the UPDATE to zero rows.
revoke all on function public.reorder_menu_courses(uuid, uuid[]) from public, anon;
revoke all on function public.reorder_menu_options(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_menu_courses(uuid, uuid[]) to authenticated;
grant execute on function public.reorder_menu_options(uuid, uuid[]) to authenticated;
