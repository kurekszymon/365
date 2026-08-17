-- tenants: a wedding venue, reachable at <slug>.easywed.app.
--
-- The first half of v2. This migration introduces the tenant and who belongs to
-- it, and nothing else - no wedding is linked to a tenant yet, no role is
-- derived, no policy on the wedding tree changes. Applying this to production
-- is a no-op for every existing user: the two new tables are empty, and the
-- only edit to existing behaviour is one extra disjunct on the `profiles`
-- SELECT policy that is constant-false while `tenant_members` has no rows.
--
-- ===========================================================================
-- READ BEFORE "FIXING" A LINTER WARNING IN THIS FILE
-- ===========================================================================
-- The five helpers below (tenant_role, is_tenant_member, is_tenant_staff,
-- my_tenant_id, staff_can_view_profile) keep their `anon` EXECUTE grant, and
-- Supabase's linter will flag all five exactly as it already flags
-- is_wedding_member, wedding_role and shares_wedding_with. Do not revoke it.
--
-- These are *policy helpers*, not RPCs. They are evaluated inside RLS policy
-- expressions, which run as the querying role, and no policy in this schema
-- carries a `to` clause - so every one defaults to `to public` and `anon`
-- reaches the helper on any unauthenticated SELECT.
--
-- Revoking anon's EXECUTE does not raise 42501. It **segfaults the backend**:
-- signal 11, on every anon SELECT against a table whose policy calls the
-- helper. Measured on PostgreSQL 17.6, deterministic, and it reproduces from a
-- fresh connection in a separate transaction - a production outage on every
-- unauthenticated read, not a same-transaction artifact. The full post-mortem
-- is in 20260806000001; it applies verbatim to these five.
--
-- There is nothing to gain against that anyway: each one filters on
-- `auth.uid()`, so for anon they are constant false/null and disclose nothing.
-- The warning is about the grant, not about reachable data.
--
-- New *trigger* functions are a different case and still get the standard
-- `revoke all ... from public, anon, authenticated` at the bottom of the file.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------
create table public.tenants (
  id uuid primary key default gen_random_uuid(),

  -- The subdomain label. Bounds match TENANT_SLUG_RE in src/lib/tenant/host.ts:
  -- 3-32 characters keeps <slug>.easywed.app well inside the 63-octet DNS label
  -- limit, and the anchors forbid a leading or trailing hyphen.
  slug text not null unique
    check (slug ~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$'),

  name text not null check (length(btrim(name)) between 1 and 80),

  -- 'suspended' is a distinct state from "no such tenant" on purpose: the entry
  -- page renders something explicable rather than a 404, and tenant_public()
  -- returns the status so it can.
  status text not null default 'active'
    check (status in ('active', 'suspended')),

  locale text not null default 'pl' check (locale in ('pl', 'en')),

  -- Branding is individual columns rather than one jsonb blob, and that is
  -- load-bearing: these values are written into element.style at runtime, so
  -- the regexes below are the CSS-injection guard. A CHECK constraint cannot
  -- reach inside jsonb, so a blob would move the guard into client code, where
  -- one forgotten call site is an injection. Same reason tenant_public()
  -- projects the columns explicitly instead of returning a jsonb `brand`.
  --
  -- On logo_url, the `$` is as load-bearing as the `https://`: `~` searches
  -- rather than matches, so a prefix-only pattern pins the origin and leaves
  -- everything after the first path slash unvalidated. The value
  --   https://cdn.example.com/logo.png") ; background: url(https://evil/
  -- satisfies '^https://[a-z0-9.-]+/' completely, which makes a guard that
  -- reads like one and is not. Anchored, the tail set is RFC-3986 minus every
  -- character that can terminate a CSS url(...), a CSS declaration or an HTML
  -- attribute: no quote, paren, semicolon, backslash, angle bracket, comma,
  -- newline or space. Percent-escapes are still allowed and cost nothing -
  -- `%22` is three literal characters to a CSS parser - so an exotic logo path
  -- remains expressible encoded.
  --
  -- This is a live boundary, not provisioning hygiene: the "tenant owners can
  -- update their tenant" policy in section 4 makes all four branding columns
  -- client-writable by a venue owner.
  logo_url text check (
    logo_url is null
    or logo_url ~ '^https://[a-z0-9.-]+/[A-Za-z0-9._~:/?&=+%@-]*$'
  ),
  primary_color text
    check (primary_color is null or primary_color ~ '^#[0-9a-f]{6}$'),
  accent_color text
    check (accent_color is null or accent_color ~ '^#[0-9a-f]{6}$'),
  tagline text check (tagline is null or length(tagline) <= 160),

  -- Whether a couple may link themselves to this venue by slug. Default false
  -- means invitation-only: slugs are public URLs, so without this anyone who
  -- guesses one can fill a venue's pending queue with junk.
  open_linking boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Labels that must never become a tenant, because something else answers on
  -- them or will. Mirrors RESERVED_SUBDOMAINS in src/lib/tenant/host.ts and
  -- must stay equal to it, not merely overlap: a slug this constraint allows
  -- but the client rejects provisions a tenant nobody can reach, and the
  -- reverse only wastes an RPC. This copy is the guarantee; the client's is an
  -- optimisation that avoids issuing the lookup at all.
  constraint tenants_slug_not_reserved check (
    slug not in (
      'www', 'app', 'api', 'cdn', 'static', 'assets', 'media',
      'mail', 'smtp', 'imap', 'pop', 'ns', 'ns1', 'ns2', 'mx', 'dns',
      'vpn', 'ftp', 'webmail', 'autodiscover', 'autoconfig',
      'dev', 'staging', 'stage', 'test', 'preview', 'demo', 'local',
      'localhost', 'admin', 'internal', 'status', 'monitor', 'metrics',
      'auth', 'login', 'signup', 'account', 'settings', 'billing', 'pay',
      'checkout', 'support', 'help', 'docs', 'blog', 'changelog', 'legal',
      'privacy', 'terms', 'crm', 'venue', 'venues', 'wedding', 'weddings',
      'easywed'
    )
  )
);

create trigger tenants_set_updated_at
  before update on public.tenants
  for each row execute function public.set_updated_at();

-- tenant_members: who belongs to a tenant, in what capacity.
-- 'owner'    = the venue's account holder; can edit tenant settings
-- 'staff'    = works the venue; runs the CRM, may peek at linked weddings
-- 'customer' = a couple married at this venue; holds no CRM access at all
create table public.tenant_members (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'staff', 'customer')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

-- One tenant per user. Deliberately a unique index rather than a column on
-- auth.users or a shape baked into the primary key: if multi-tenant users are
-- ever wanted, this is a one-line DROP INDEX and nothing else moves.
--
-- It is also what makes my_tenant_id() well-defined - see below.
create unique index tenant_members_one_per_user
  on public.tenant_members (user_id);

-- ---------------------------------------------------------------------------
-- 2. Policy helpers
-- ---------------------------------------------------------------------------
-- All five mirror is_wedding_member / wedding_role exactly: `language sql`,
-- `stable`, `security definer`, `set search_path = public`. Definer for the
-- same reason those two are - they read tenant_members, whose own policies
-- call them, and a non-definer helper would recurse.
--
-- Read the header before touching their grants.

create function public.tenant_role(_tenant_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.tenant_members
  where tenant_id = _tenant_id and user_id = auth.uid();
$$;

create function public.is_tenant_member(_tenant_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.tenant_members
    where tenant_id = _tenant_id and user_id = auth.uid()
  );
$$;

-- "Staff" excludes 'customer' - a couple is a member of the venue they married
-- at, and must reach none of the CRM. Every write policy in the tenant tree
-- gates on this rather than on is_tenant_member.
create function public.is_tenant_staff(_tenant_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.tenant_role(_tenant_id) in ('owner', 'staff');
$$;

-- The caller's tenant, if any. Single-valued only because of
-- tenant_members_one_per_user; if that index is ever dropped this has to become
-- a set-returning function, and every caller has to be revisited.
--
-- Returns the tenant for *any* membership including 'customer', so a caller
-- offering the CRM link must check the role as well - being someone's customer
-- is not staff access.
create function public.my_tenant_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select tenant_id from public.tenant_members where user_id = auth.uid();
$$;

-- Modelled on shares_wedding_with (20260731000001), and needed for the same
-- reason it was: the CRM's customer list shows display names, which live in
-- `profiles`, and nothing else lets staff read them.
--
-- Not covered by shares_wedding_with, and that is worth stating explicitly
-- because it looks like it would be: that function self-joins wedding_members
-- directly rather than going through is_wedding_member, so the venue role that
-- v2 derives in a later migration never reaches it. The two helpers are
-- genuinely independent grants.
--
-- Staff-to-customer only, deliberately asymmetric: staff may read the display
-- names of their own tenant's members, and a customer gets no reciprocal
-- window into the venue's roster.
create function public.staff_can_view_profile(_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.tenant_members mine
    join public.tenant_members theirs on theirs.tenant_id = mine.tenant_id
    where mine.user_id = auth.uid()
      and mine.role in ('owner', 'staff')
      and theirs.user_id = _user_id
  );
$$;

-- ---------------------------------------------------------------------------
-- 3. Immutable columns
-- ---------------------------------------------------------------------------
-- `slug` and `status` are set at provisioning time and must not be client-
-- writable, for two different reasons:
--
--   * status - a suspended tenant that can UPDATE its own row un-suspends
--     itself, which makes the state meaningless.
--   * slug - it is a hostname. Rewriting it dead-links every couple's saved
--     URL, and frees the old label for whoever claims it next. Tenants are
--     provisioned by hand (a decision, not an oversight); renames go the same
--     way.
--
-- A trigger rather than a column revoke, because a revoke does not work here:
-- hosted Supabase grants `authenticated` table-level UPDATE through default
-- privileges, and a column-level revoke cannot subtract from a table grant.
-- That mistake is documented in 20260731000003's post-mortem of
-- `revoke update (owner_id)` in 20260418000002 - this is the shape that
-- actually holds, modelled on enforce_wedding_owner_immutable.
--
-- Gated on current_user so definer RPCs and manual `psql` provisioning, which
-- run as postgres, pass straight through.
create function public.enforce_tenant_immutable_columns()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.slug is distinct from old.slug then
      raise exception 'tenant slug is immutable' using errcode = '42501';
    end if;
    if new.status is distinct from old.status then
      raise exception 'tenant status is immutable' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger tenants_immutable_columns
  before update on public.tenants
  for each row execute function public.enforce_tenant_immutable_columns();

-- ---------------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------------
alter table public.tenants enable row level security;
alter table public.tenant_members enable row level security;

-- A tenant row is visible to its own members - including customers, who need
-- the venue's name and branding on the apex. Anonymous visitors do not read
-- this table at all; they go through tenant_public() below.
create policy "members can view their tenant"
  on public.tenants for select
  using (public.is_tenant_member(id));

-- No INSERT and no DELETE policy: tenants are provisioned and retired by hand.
-- Their absence is the intent, not an omission to fill in later.

-- `with check` as well as `using`, per the lesson in 20260816000001: with only
-- `using`, Postgres reuses it as the check and evaluates it against the NEW
-- row, so the predicate stops constraining what the row may become. The
-- immutability trigger above covers slug and status regardless; this closes the
-- general shape.
create policy "tenant owners can update their tenant"
  on public.tenants for update
  using (public.tenant_role(id) = 'owner')
  with check (public.tenant_role(id) = 'owner');

-- The "users must not leak between tenants" guarantee, in one predicate: staff
-- see their own tenant's whole roster, and everyone else sees exactly their own
-- row and no other member of anything.
create policy "staff view the roster, members view themselves"
  on public.tenant_members for select
  using (public.is_tenant_staff(tenant_id) or user_id = auth.uid());

-- Staff may add staff and customers, never an owner. Tightened from the
-- original design, which allowed any role: staff cannot promote *themselves*
-- (the primary key blocks a second row, and there is no UPDATE policy), but
-- without `role <> 'owner'` they could enrol a second account they control as
-- an owner and inherit tenant settings through it. Owners are created by the
-- same manual provisioning that creates the tenant.
create policy "staff can add members"
  on public.tenant_members for insert
  with check (public.is_tenant_staff(tenant_id) and role <> 'owner');

-- No UPDATE policy: a role change is a remove-and-re-add, so it goes through
-- the INSERT check above and cannot mint an owner either.

-- Staff can remove staff and customers; an owner row is removable only by hand.
-- Note this lets a staff member delete their own row - that is a resignation,
-- and it is one-way, since re-inserting requires being staff already.
create policy "staff can remove non-owner members"
  on public.tenant_members for delete
  using (public.is_tenant_staff(tenant_id) and role <> 'owner');

-- ---------------------------------------------------------------------------
-- 5. profiles: let staff read their customers' display names
-- ---------------------------------------------------------------------------
-- Replaces the policy from 20260731000001. The first two disjuncts are
-- verbatim; the third is the new grant.
--
-- Necessary because shares_wedding_with does not cover it: it self-joins
-- wedding_members, and a venue's link to a couple is a tenant_members row, not
-- a wedding_members one. Even after v2 derives a 'venue' wedding role, that
-- function keeps returning false for staff - it never calls is_wedding_member.
--
-- Scope is unchanged for everyone who is not tenant staff, and while
-- tenant_members is empty this disjunct is constant false.
drop policy "read own and co-members profiles" on public.profiles;

create policy "read own and co-members profiles"
  on public.profiles for select
  using (
    id = auth.uid()
    or public.shares_wedding_with(id)
    or public.staff_can_view_profile(id)
  );

-- ---------------------------------------------------------------------------
-- 6. tenant_public: the pre-login branding lookup
-- ---------------------------------------------------------------------------
-- The one deliberate exception to 20260806000001's "no anon EXECUTE on definer
-- functions" rule, and the reason is structural: a signed-out visitor landing
-- on bagatelka.easywed.app must see the venue's name and logo *before* there is
-- any session to authorize, while `tenants` SELECT is member-only. There is no
-- shape of RLS policy that expresses "anonymous, but only these columns".
--
-- Note this is a grant we decline to revoke rather than one we add: hosted
-- Supabase's default privileges already give `anon` EXECUTE on anything created
-- in `public`. The explicit grants below exist so a fresh local database - which
-- never applies those defaults - matches remote, and so the intent is written
-- down where the next reader of that rule will look.
--
-- Enumeration risk is nil. Slugs are public hostnames, so guessing one reveals
-- nothing that visiting the URL would not; the projection carries no member
-- data, no counts, and nothing about any wedding.
--
-- Returns columns rather than a jsonb `brand`, matching the table's shape for
-- the reason given there: the CHECK regexes are the CSS-injection guard for
-- values that end up in element.style, and they cannot guard inside a blob.
-- `status` is projected so a suspended tenant renders as suspended instead of
-- as "no such venue".
create function public.tenant_public(_slug text)
returns table (
  id uuid,
  slug text,
  name text,
  status text,
  logo_url text,
  primary_color text,
  accent_color text,
  tagline text
)
language sql
security definer
set search_path = public
stable
as $$
  select t.id, t.slug, t.name, t.status,
         t.logo_url, t.primary_color, t.accent_color, t.tagline
  from public.tenants t
  where t.slug = _slug;
$$;

grant execute on function public.tenant_public(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. Grants
-- ---------------------------------------------------------------------------
-- The trigger function only. It is never called directly - PostgreSQL checks
-- EXECUTE at CREATE TRIGGER time, not when the trigger fires - so revoking from
-- every client role leaves the trigger working. Same treatment as the trigger
-- functions in 20260806000001 and 20260816000001.
--
-- The five policy helpers above are deliberately absent from this list. Read
-- the header.
revoke all on function public.enforce_tenant_immutable_columns()
  from public, anon, authenticated;
