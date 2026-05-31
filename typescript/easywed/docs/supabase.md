# Supabase / Postgres reference

Personal notes on what's in the schema, why, and how the Supabase CLI flow works. Written from a frontend-proficient perspective.

## What the migration does

6 tables across 2 migration files:

```
weddings              ← top-level project
  ├─ wedding_members  ← join table: who has access, what role
  ├─ halls            ← 1:1 with wedding (the floor plan)
  ├─ tables           ← 1:N (seating tables)
  ├─ guests           ← 1:N, optionally FK → tables
  └─ reminders        ← 1:N (wedding todo list)
```

Frontend analogy: like setting up Zustand stores' TypeScript types once upfront, but enforced at the database level so no client bug can corrupt the shape.

## Relationships and `on delete` cascades

```sql
references public.weddings(id) on delete cascade
```

If a wedding is deleted, Postgres auto-deletes all its halls/tables/guests/reminders. Without `cascade`, a delete would fail with "FK violation". Like auto-unmounting a React component tree when the parent unmounts — but on disk.

`guests.table_id references tables(id) on delete set null` is different — deleting a table doesn't delete its guests, it just unassigns them. Matches `deleteTable` in `planner.store.ts`.

**Soft vs hard delete:** normal table/fixture deletes are *soft* (`deleted_at` is set; `loadWedding` filters on `deleted_at is null`). The one exception is the `replace_planner_layout` RPC used by the DXF import wizard, which *hard*-`delete from`s all tables and fixtures for the wedding before inserting the imported layout. This is intentional — import is an explicit "replace everything" action — but it means imported layouts leave no tombstones for the rows they replaced. Guest assignments to the wiped tables fall back to `NULL` via the `on delete set null` FK above.

## Row-Level Security (RLS) — the big one

Single most important Postgres concept for SaaS. Without RLS, any authenticated user could read/write any row. With RLS, every query is implicitly filtered by policies.

```sql
alter table public.halls enable row level security;
create policy "members can view halls"
  on public.halls for select
  using (public.is_wedding_member(wedding_id));
```

At runtime: when the React app does `supabase.from("halls").select()`, Postgres rewrites it to `SELECT * FROM halls WHERE is_wedding_member(wedding_id)`. Can't forget to add the filter — impossible to leak data.

Each table has 4 policies: one per operation (SELECT/INSERT/UPDATE/DELETE). `using` applies to reads; `with check` applies to writes. `members can view` vs `editors can modify` is the role gate.

**Why this matters vs Node/Express**: traditionally you'd write `if (user.canEdit(wedding)) { ... }` in every endpoint — easy to forget one route. RLS pushes the check to the data layer — can't be bypassed by a missed middleware.

## Helper functions (`is_wedding_member`, `wedding_role`)

```sql
create function public.is_wedding_member(_wedding_id uuid)
returns boolean
language sql
security definer  ← this is key
```

`security definer` = the function runs with the privileges of whoever *defined* it (superuser), not the caller. Why? Because `wedding_members` is itself RLS-protected. If the policy called a non-definer function that queried `wedding_members`, it would hit RLS → which would call the function again → infinite recursion.

Like a `useMemo` that bypasses React's rules: the policy calls a pre-computed check without triggering more policies.

## Triggers

Triggers are "on event X, run function Y" — like `useEffect` but running inside the DB.

- **`set_updated_at`**: on every UPDATE, bump `updated_at = now()`. Automatic, can't be forgotten.
- **`handle_new_wedding`**: when a wedding is INSERTed, auto-insert an `owner` row in `wedding_members`. Avoids a race where the creator briefly isn't a member of their own wedding.
- **`enforce_table_capacity`**: on guest INSERT/UPDATE, counts current assignees and rejects if over capacity. Mirrors the client check in `assignGuestToTable` — client for UX, DB for correctness under races.

## Check constraints

```sql
capacity integer not null check (capacity > 0),
shape text not null check (shape in ('round', 'rectangular')),
dietary text[] not null check (dietary <@ array[...]::text[])
```

TypeScript's union types as runtime rules. `<@` means "subset of" — dietary values must all be in the allowlist.

Could've used Postgres enums instead of `text` + CHECK. Enums are faster but a pain to alter (`ALTER TYPE ... ADD VALUE` is locking). CHECK constraints are easier to evolve. Analogy: enums ≈ `const enum`, CHECK ≈ union type of string literals.

## Supabase CLI

Context: two modes — **local dev** (Docker Postgres on your machine) and **remote** (hosted project at supabase.co).

### Local dev flow

- **`supabase start`**: boots a local Postgres + Auth + Storage in Docker, runs all migrations from scratch.
- **`supabase db reset`**: nukes the local DB and re-runs every migration file in `supabase/migrations/` in order. This is what you run when you change a migration during dev. Equivalent to `rm -rf node_modules && npm install` — the full rebuild button.
- **`supabase db diff -f <name>`**: after hand-editing the local DB via the Studio UI, generates a new migration file from the diff. The reverse flow.

### Remote flow

- **`supabase db push`**: applies local, unapplied migrations to the remote (hosted) project. Looks at `supabase_migrations.schema_migrations` (tracks which migrations have run), finds ones you have locally but remote doesn't, runs them in order. Idempotent.
- **`supabase db pull`**: opposite — pulls remote schema into a new migration file locally. Useful when someone changed the remote via the dashboard.

### Migration file contract

Files are named `<timestamp>_<name>.sql` and run in timestamp order, exactly once each, tracked in `schema_migrations`. Same model as Rails / Django / Prisma migrations — just SQL instead of a DSL.

**Critical rule**: once a migration is pushed to production, never edit it. Make a new one. Editing a pushed migration is like force-pushing over a shared git branch.

### Typical dev flow for a new migration

1. Write the new `.sql` file under `supabase/migrations/`.
2. `supabase db reset` — destroys local DB, reruns all migrations from scratch. If there's a SQL typo, it fails loudly here; fix the file, rerun. Fast feedback loop.
3. Open local Studio (`http://localhost:54323`) and eyeball tables + policies in the UI.
4. Only `supabase db push` to remote once happy — typically on merge to `main`.
