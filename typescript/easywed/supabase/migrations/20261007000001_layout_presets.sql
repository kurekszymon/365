-- layout presets: a venue's saved room layouts, which a linked couple copies
-- into their own wedding.
--
-- A preset is a **snapshot**, not a shared object. Applying one copies its
-- halls, tables and fixtures into the couple's wedding through
-- `replace_planner_layout`, with fresh ids, and from then on the two are
-- unrelated: the couple's edits never reach the preset, and the venue editing
-- or archiving the preset never reaches a wedding that already used it. That is
-- why there is no foreign key from the wedding tree to this table, and why
-- nothing here needs the `on delete restrict` care the menu catalogue does
-- (20260822000002 section 1).
--
-- The three payload columns hold exactly the arrays `replace_planner_layout`
-- takes (`hallRow` / `tableRow` / `fixtureRow` in mutations/shared.ts), so the
-- apply path is a re-key and one RPC call, with no second format to keep in
-- step. They are jsonb rather than child tables because nothing ever queries
-- inside a preset - it is read whole and written whole.
--
-- No guest data, ever: a preset is built from the venue's own demo wedding and
-- carries no seats, no names and no notes. That is what lets the couple-side
-- SELECT below stay independent of `venue_access`, the same way the menu does.
--
-- This migration introduces no policy helper and no function. Every predicate
-- calls `is_tenant_staff` or `is_wedding_member`, which already exist and keep
-- their `anon` EXECUTE grant for the reason 20260817000001's header gives.

create table public.layout_presets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,

  name text not null check (length(btrim(name)) between 1 and 60),

  halls jsonb not null,
  tables jsonb not null default '[]'::jsonb,
  fixtures jsonb not null default '[]'::jsonb,

  -- Archived, not deleted, purely so a venue can retire last season's layout
  -- without losing it. Unlike the menu, a hard DELETE is harmless - no wedding
  -- points here - and staff hold it too.
  archived_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Shape, not content. The row-level checks (shapes, geometry, capacity) run
  -- when the layout is *applied*, against the real `halls` / `tables` /
  -- `fixtures` CHECKs and capacity triggers, so a malformed preset fails there
  -- rather than half-applying. What is checked here is what those cannot see:
  -- that the payload is three arrays, that a preset has a room in it, and that
  -- it is a floor plan rather than a storage bucket. 60 tables is ~10 KB of
  -- JSON; the byte cap is twenty times that.
  constraint layout_presets_payload_shape check (
    jsonb_typeof(halls) = 'array'
    and jsonb_typeof(tables) = 'array'
    and jsonb_typeof(fixtures) = 'array'
    and jsonb_array_length(halls) between 1 and 20
    and jsonb_array_length(tables) <= 500
    and jsonb_array_length(fixtures) <= 500
  ),
  constraint layout_presets_payload_size check (
    octet_length(halls::text) + octet_length(tables::text)
      + octet_length(fixtures::text) <= 204800
  )
);

create index layout_presets_tenant_idx
  on public.layout_presets (tenant_id, created_at);

create trigger layout_presets_set_updated_at
  before update on public.layout_presets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.layout_presets enable row level security;

-- Staff own the catalogue: the same four `is_tenant_staff` policies as the
-- menu tables (20260822000001 section 4), for the same reasons - 'customer'
-- excluded, and UPDATE carries `with check` so a preset cannot be moved into
-- another tenant.
create policy "staff view their tenant's layout presets"
  on public.layout_presets for select
  using (public.is_tenant_staff(tenant_id));

create policy "staff create layout presets"
  on public.layout_presets for insert
  with check (public.is_tenant_staff(tenant_id));

create policy "staff update their layout presets"
  on public.layout_presets for update
  using (public.is_tenant_staff(tenant_id))
  with check (public.is_tenant_staff(tenant_id));

create policy "staff delete their layout presets"
  on public.layout_presets for delete
  using (public.is_tenant_staff(tenant_id));

-- Couples read the presets of the venue their wedding is linked to - the exact
-- predicate the menu catalogue uses (20260822000002). The `is_wedding_member`
-- here is not the spelling 20260817000003 retired from the wedding tree: it
-- asks whether the *caller* belongs to some wedding linked to this tenant, and
-- no wedding-tree row is reachable through it.
--
-- Deliberately not gated on `venue_access`. A preset is the venue's own
-- published data flowing *to* the couple, and starting from the venue's room is
-- useful long before anyone decides whether to share the plan back.
--
-- Read-only for couples: no INSERT/UPDATE/DELETE policy names them.
create policy "wedding members can view their venue's layout presets"
  on public.layout_presets for select
  using (
    exists (
      select 1 from public.weddings w
      where w.tenant_id = layout_presets.tenant_id
        and public.is_wedding_member(w.id)
    )
  );
