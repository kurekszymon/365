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

profiles              ← 1:1 with auth.users, outside the wedding tree
```

Frontend analogy: like setting up Zustand stores' TypeScript types once upfront, but enforced at the database level so no client bug can corrupt the shape.

## Relationships and `on delete` cascades

```sql
references public.weddings(id) on delete cascade
```

If a wedding is deleted, Postgres auto-deletes all its halls/tables/guests/reminders. Without `cascade`, a delete would fail with "FK violation". Like auto-unmounting a React component tree when the parent unmounts - but on disk.

`guests.table_id references tables(id) on delete set null` is different - deleting a table doesn't delete its guests, it just unassigns them. Matches `deleteTable` in `planner.store.ts`.

**Soft vs hard delete:** normal table/fixture deletes are _soft_ (`deleted_at` is set; `loadWedding` filters on `deleted_at is null`). The one exception is the `replace_planner_layout` RPC used by the local-wedding migration (adopting a guest-mode plan into a fresh cloud wedding), which _hard_-`delete from`s all tables and fixtures for the wedding before inserting the new layout. This is intentional - it is an explicit "replace everything" action - but it means replaced layouts leave no tombstones for the rows they removed. Guest assignments to the wiped tables fall back to `NULL` via the `on delete set null` FK above.

## Row-Level Security (RLS) - the big one

Single most important Postgres concept for SaaS. Without RLS, any authenticated user could read/write any row. With RLS, every query is implicitly filtered by policies.

```sql
alter table public.halls enable row level security;
create policy "members can view halls"
  on public.halls for select
  using (public.is_wedding_member(wedding_id));
```

At runtime: when the React app does `supabase.from("halls").select()`, Postgres rewrites it to `SELECT * FROM halls WHERE is_wedding_member(wedding_id)`. Can't forget to add the filter - impossible to leak data.

Each table has 4 policies: one per operation (SELECT/INSERT/UPDATE/DELETE). `using` applies to reads; `with check` applies to writes. `members can view` vs `editors can modify` is the role gate.

**Why this matters vs Node/Express**: traditionally you'd write `if (user.canEdit(wedding)) { ... }` in every endpoint - easy to forget one route. RLS pushes the check to the data layer - can't be bypassed by a missed middleware.

## `profiles` - and what deliberately isn't in it

`profiles` holds exactly one piece of user-visible identity: a nullable `display_name` the user types themselves (migration `20260731000001`). It exists because the header avatar stack and the members dialog need something human to show, and `wedding_members` only has a `user_id`.

What it does **not** hold is the point. Signing in with Google puts `full_name`, `picture` and `email` into `auth.users.raw_user_meta_data` whether we ask for it or not. Copying any of that into a table every co-member can read would mean accepting a wedding invite hands you the other members' contact details. So:

- Emails and OAuth metadata stay in `auth.users`, reachable only by that user and the service role.
- The Google name is offered as a **prefill** in `/settings`, client-side from the session, and is only stored once the user saves it.
- `display_name` stays null until they choose one. The UI then falls back to their role ("Editor"), never to an email or a slice of their user id.

Read access is `id = auth.uid() or public.shares_wedding_with(id)` - your own row, plus people you actually share a wedding with. `shares_wedding_with` is `security definer` for the same anti-recursion reason as `is_wedding_member` below.

`handle_new_user` (trigger on `auth.users` INSERT) creates the row at signup so the members list can look it up unconditionally, and the migration backfills everyone who predates it.

### Terms acceptance (`terms_version`, `terms_accepted_at`)

Migration `20260806000002` adds the two columns that record which version of the Regulamin a user accepted at signup. The sign-up checkbox is blocking and unticked by default, but on its own it's React state that leaves no trace — and the burden of proving the contract was concluded on those terms is the Provider's (art. 6 kc). `terms_version` holds `LEGAL_DATES.termsEffective` (the effective date *is* the version; § 16 ust. 3 moves it on every substantive change).

Two paths write it, because Supabase only offers one of them:

- **Email signup** passes `data: { terms_version }` to `signUp()`, and the replaced `handle_new_user` copies it out of `raw_user_meta_data` at the moment the user row is created — server-side, before there's a session.
- **Google** has no equivalent: `signInWithOAuth()` takes no user metadata. The accepted version rides through the redirect in `localStorage` (`easywed.terms.pending`) and `recordPendingTermsAcceptance` writes it on the first authenticated render, from `AuthGate`. It only ever fills a blank, so it can't overwrite what the trigger already recorded or re-stamp a returning user.

`terms_accepted_at` is **never client-supplied**. `stamp_terms_acceptance` (BEFORE INSERT OR UPDATE) sets `now()` whenever `terms_version` changes and carries the old value forward otherwise, so the column can't be backdated through the profiles UPDATE policy — the user chooses *which* version they accepted, never *when*.

Accounts predating the migration are left `null` rather than backfilled: null means "no evidence", which is the true state. § 16 ust. 2 (notify by email, 14 days to object) is the mechanism for putting the current version in front of them.

## Account deletion (`delete_own_account`)

`security definer` RPC (migration `20260731000002`), because `auth.users` isn't reachable by `authenticated` and the service role key that could do this client-side must never leave the server.

**It refuses while the caller owns a wedding anyone else can access.** `weddings.owner_id` is `ON DELETE CASCADE`, so proceeding would take the hall, tables and every guest with it — for the co-owner, planner or venue too. That data isn't the caller's to erase. Solo weddings do cascade away. The client re-queries the blocking weddings (`fetchSharedOwnedWeddings`) to name them; the RPC raises `account_has_shared_weddings` as the server-side copy of the same check.

**Why it locks invitations first.** The check and the `delete from auth.users` run in one READ COMMITTED transaction, but on their own they hold nothing that would stop `claim_wedding_invitation` inserting a `wedding_members` row in between — handing someone access to a wedding milliseconds before it cascades away, which is the exact outcome the check exists to prevent. So the function opens by taking `for update` on the caller's unclaimed, unexpired invitations. Every claim already locks its own invitation row first, so the two serialize on the row they share: lock first and the claim waits, then reports "invalid or expired" against a cascaded-away invite; lose the race and the count re-reads afterwards, sees the new member, and refuses. Claimed and expired rows are skipped — neither can produce a new member.

**It also checks the delete actually removed a row** (`if not found then raise 'account_not_deleted'`). It can't fail today — `postgres` has `BYPASSRLS`, so the RLS on `auth.users` doesn't filter the `security definer` delete — but that's a platform-owned role attribute, and the client's success path signs the user out and tells them the account is gone. Same rule the client already applies to its own deletes: 0 rows is a failure, not success.

The same migration fixes `wedding_invitations.claimed_by`, which was `ON DELETE NO ACTION` — meaning **any user who had ever accepted an invite link was undeletable**, including from the Supabase dashboard. It's now `on delete set null`, which keeps the burned-invite audit row visible to the wedding's owner.

## Leaving a wedding — and the owner self-removal bug (`20260731000003`)

Until this migration the only DELETE policy on `wedding_members` was "owners can remove members", so an editor or viewer could not disassociate themselves from a wedding at all — their only exit was deleting their whole account. That's the wrong shape for a plan someone was *invited* into, and it makes the advice in `delete_own_account`'s blocked state impossible to follow. `members can remove themselves` fixes it, gated on `user_id = auth.uid() and role <> 'owner'`.

Owners are excluded because `weddings.owner_id` would still point at them, leaving a wedding whose owner isn't a member of it. They delete the wedding instead.

**The `role <> 'owner'` guard is not enough on its own, and that's the part worth reading twice.** Permissive policies are OR'd together, and the pre-existing "owners can remove members" matched *every* row in the owner's wedding — including the owner's own membership row. An owner could therefore delete themselves out of their own wedding, leaving `owner_id` pointing at a non-member who then fails `is_wedding_member()` and loses access to their own halls, tables and guests. This bug predates the migration; adding a self-removal policy just made it reachable from the UI. The policy is re-created here with `user_id <> auth.uid()`, so removing yourself is only possible through the policy above — which owners can't satisfy.

Client-side, `deleteWedding` and `leaveWedding` both ask for the deleted rows back with `.select()`. A DELETE whose rows are all filtered out by RLS is not an error to PostgREST — it answers 204 with no body, which supabase-js reports as `{ data: null, error: null }`. Without the returned rows, "you aren't the owner" reads as success and the user is told their wedding is gone while it sits there.

`leaveWedding` deliberately leaves the `wedding_invitations` row that brought the member in: DELETE on that table is owner-only, so a leaving member has no way to clear it, and the owner keeps an accurate record that the link was used. The consequence is that the owner's invitation list still shows a claimed invite naming someone who left; re-inviting means issuing a new link, which is true either way since the old one is spent. Cleaning this up properly needs a trigger on membership delete, not a client-side change.

## Helper functions (`is_wedding_member`, `wedding_role`)

```sql
create function public.is_wedding_member(_wedding_id uuid)
returns boolean
language sql
security definer  ← this is key
```

`security definer` = the function runs with the privileges of whoever _defined_ it (superuser), not the caller. Why? Because `wedding_members` is itself RLS-protected. If the policy called a non-definer function that queried `wedding_members`, it would hit RLS → which would call the function again → infinite recursion.

Like a `useMemo` that bypasses React's rules: the policy calls a pre-computed check without triggering more policies.

## Triggers

Triggers are "on event X, run function Y" - like `useEffect` but running inside the DB.

- **`set_updated_at`**: on every UPDATE, bump `updated_at = now()`. Automatic, can't be forgotten.
- **`handle_new_wedding`**: when a wedding is INSERTed, auto-insert an `owner` row in `wedding_members`. Avoids a race where the creator briefly isn't a member of their own wedding.
- **`enforce_table_capacity`**: on guest INSERT/UPDATE, counts current assignees and rejects if over capacity. Mirrors the client check in `assignGuestToTable` - client for UX, DB for correctness under races.
- **`handle_new_user`**: on `auth.users` INSERT, create the matching `profiles` row (see above).

- **`enforce_wedding_owner_immutable`**: on every `weddings` UPDATE, rejects a changed `owner_id` when the caller is `authenticated` or `anon` (see below).

**Local vs remote gotcha, and why the column revokes don't work:** on a local `supabase db reset`, the `authenticated` role ends up with no CRUD grants on `public` tables (`relacl` shows only `Dxtm`) - hosted Supabase grants them via default privileges. That difference hides a real bug rather than just being an inconvenience: column-level statements like `revoke update (owner_id) on weddings` and `revoke update (id) on profiles` are **no-ops on remote precisely because the table-level grant is there** - a column revoke cannot subtract from a table grant, and the column privilege was never separately granted, so there is nothing to revoke. Locally they *appear* to hold only because `authenticated` has no grant at all. Both are defence in depth at best; the real guards are the trigger below (`owner_id`) and the UPDATE policy's `with check (id = auth.uid())` (`profiles.id`).

If you're testing RLS against the local DB with `set role authenticated`, run `grant select, insert, update, delete on all tables in schema public to authenticated` first — otherwise every query fails with "permission denied" before RLS is even consulted, *and* you will be testing a grant shape that doesn't match production.

## `weddings.owner_id` is immutable from the client (`20260731000003`)

Ownership decides who can delete a wedding, who can remove members, and whether `delete_own_account` is allowed to proceed — so being able to write it is being able to take the whole plan.

Nothing stopped that until this trigger. The `revoke` above does nothing (see the gotcha), and RLS doesn't catch it either: `"owners and editors can update weddings"` has `using` but no `with check`, so Postgres reuses `using` as the check — and an editor writing their own id into `owner_id` passes it, because the row id is unchanged and they are still an editor of that wedding. The full chain is three statements: set `owner_id` to yourself, use `"owners can remove members"` to evict the real owner, then delete the wedding outright from the wedding list UI.

`with check` has no access to `OLD`, so the guard has to be a `before update` trigger. It raises `42501` when `owner_id` changes and `current_user` is `authenticated` or `anon`. Ownership transfer is still a legitimate feature — it just has to go through a `security definer` RPC, which runs as `postgres` and passes the check.

## Check constraints

```sql
capacity integer not null check (capacity > 0),
shape text not null check (shape in ('round', 'rectangular')),
dietary text[] not null check (public.dietary_tags_valid(dietary)),
age_group text check (age_group is null or char_length(age_group) between 1 and 24)
```

TypeScript's union types as runtime rules. `shape` mirrors a TS string union.

`dietary` used to be an allowlist (`<@ array[...]`) but is now **free-form
tags**: migration `20260727000001` swapped the value allowlist for a shape rule
(`dietary_tags_valid`: at most 12 tags, each 1-24 chars). The client
(`canonicalizeDietary` in `src/lib/dietary.ts`) is the source of truth for
cleaning tags; the constraint only guards the hard limits. A CHECK can't hold a
subquery, so the per-element check lives in an immutable helper that unnests the
array.

`guests.age_group` (migration `20260728000001`) follows the same philosophy: a
bounded-length rule rather than an allowlist, because the brackets are
user-editable. **NULL means adult** - the default - so existing rows needed no
backfill and the client never writes the literal `'adult'` (see
`toStoredAgeGroup` in `src/lib/ageGroup.ts`).

Could've used Postgres enums instead of `text` + CHECK. Enums are faster but a pain to alter (`ALTER TYPE ... ADD VALUE` is locking). CHECK constraints are easier to evolve. Analogy: enums ≈ `const enum`, CHECK ≈ union type of string literals.

## Supabase CLI

Context: two modes - **local dev** (Docker Postgres on your machine) and **remote** (hosted project at supabase.co).

### Local dev flow

- **`supabase start`**: boots a local Postgres + Auth + Storage in Docker, runs all migrations from scratch.
- **`supabase db reset`**: nukes the local DB and re-runs every migration file in `supabase/migrations/` in order. This is what you run when you change a migration during dev. Equivalent to `rm -rf node_modules && npm install` - the full rebuild button.
- **`supabase db diff -f <name>`**: after hand-editing the local DB via the Studio UI, generates a new migration file from the diff. The reverse flow.

### Remote flow

- **`supabase db push`**: applies local, unapplied migrations to the remote (hosted) project. Looks at `supabase_migrations.schema_migrations` (tracks which migrations have run), finds ones you have locally but remote doesn't, runs them in order. Idempotent.
- **`supabase db pull`**: opposite - pulls remote schema into a new migration file locally. Useful when someone changed the remote via the dashboard.

### Migration file contract

Files are named `<timestamp>_<name>.sql` and run in timestamp order, exactly once each, tracked in `schema_migrations`. Same model as Rails / Django / Prisma migrations - just SQL instead of a DSL.

**Critical rule**: once a migration is pushed to production, never edit it. Make a new one. Editing a pushed migration is like force-pushing over a shared git branch.

### Typical dev flow for a new migration

1. Write the new `.sql` file under `supabase/migrations/`.
2. `supabase db reset` - destroys local DB, reruns all migrations from scratch. If there's a SQL typo, it fails loudly here; fix the file, rerun. Fast feedback loop.
3. Open local Studio (`http://localhost:54323`) and eyeball tables + policies in the UI.
4. Only `supabase db push` to remote once happy - typically on merge to `main`.
