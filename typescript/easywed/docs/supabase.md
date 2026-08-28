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

## Tenants, the derived `venue` role, and the one policy you must not simplify

Migrations `20260817000001`-`20260817000003` add a **tenant** (a wedding venue at `<slug>.easywed.app`) with its own `tenants` / `tenant_members` tables and five policy helpers (`tenant_role`, `is_tenant_member`, `is_tenant_staff`, `my_tenant_id`, `staff_can_view_profile`). Those five keep their `anon` EXECUTE grant for the reason in the segfault section below — they are policy helpers, not RPCs.

A couple can link their wedding to a venue (`weddings.tenant_id`) and then, separately, grant it access (`weddings.venue_access`, one of `none` / `pending` / `granted`). Neither column is client-writable: `enforce_wedding_tenant_columns` blocks `authenticated` and `anon` on **INSERT as well as UPDATE**, so the only ways in are `link_wedding_to_venue` and `set_venue_access`. The INSERT half matters — the weddings INSERT policy only checks `owner_id = auth.uid()`, so without it anyone could POST a wedding that arrives pre-linked and pre-granted, straight past the `open_linking` check.

`wedding_role()` then grows a second branch: `'venue'` when the wedding names a tenant, `venue_access = 'granted'`, and the caller `is_tenant_staff` of it. **No row ever carries that value** — `wedding_members_role_check` is deliberately not widened, because `coalesce` prefers an explicit member row and a hand-written `venue` row would outrank the derived branch and survive `set_venue_access`.

### The `guests` SELECT policy

This is the single highest-risk line in the whole feature, so it is written out here as well as in the migration and in CLAUDE.md.

```sql
create policy "members can view guests"
  on public.guests for select
  using (public.wedding_role(wedding_id) in ('owner', 'editor', 'viewer'));
```

It names the three member roles **literally**, and must keep doing so. Two edits look like tidying and are a personal-data breach:

- **Reverting it to `is_wedding_member(wedding_id)`.** That is equivalent *today* only because `wedding_role()`'s first branch is a lookup in the same table. The second branch broke the equivalence, and nothing guarantees the first stays a plain lookup. A policy that is safe because of how a helper happens to be implemented is one refactor away from handing every guest name to a third party, silently — nothing errors, the venue simply starts receiving names.
- **Adding `'venue'` to the list.** `guests` holds full names and the couple's free-text notes about people who never agreed to anything. `privacy.venue.hidden` promises in writing that a venue never receives either.

`reminders` and `wedding_members` are narrowed the same way. `halls`, `tables`, `fixtures` and `weddings` are the ones that gain `'venue'` — the room, and the wedding's name and date, all named in `privacy.venue.shared`.

What the venue reads instead is `wedding_seatmap`, a `security_barrier` view running as its owner (so the `guests` policy above does not filter it) whose entire access control is its own `WHERE`. It projects seat position, `dietary` and `age_group` — **no `name` column and no `note` column exist in it to leak**. The honest limit, disclosed rather than engineered around: `dietary` and `age_group` are free text the couple types, so a name typed into a diet tag reaches the venue. The projection guarantees what *we* send, not what someone put in a field we do send.

`my_wedding_role(p_wedding_id)` exists because narrowing `wedding_members` means the client can no longer derive its own role from the member rows it fetches — a venue reads zero of them, and "no row" is indistinguishable from "no access".

### `tenant_members` has no INSERT policy, on purpose

Membership of a venue is not something a venue may decide about a person. An earlier `"staff can add members"` policy let staff insert any `user_id` they could name as their `customer`, which did three things to an account that had agreed to nothing: handed the venue that user's `profiles.display_name` (`staff_can_view_profile` keys off this table), barred them from ever joining another venue (`tenant_members_one_per_user` is unique), and satisfied the invitation-only gate in `link_wedding_to_venue`.

Joining a *wedding* needs a token the owner generated plus `claim_wedding_invitation`, which the joiner calls. The tenant side now has the same shape — see below — so the INSERT policy is still absent and the only write path is a definer RPC the *recipient* calls.

### `tenant_invitations` and `claim_tenant_invitation` (`20260820000001`)

The token flow that closes the gap the previous section used to describe. Until this migration, `tenants.open_linking` defaulted to false, the invitation-only branch of `link_wedding_to_venue` looked for a `tenant_members` row with role `customer`, and nothing but hand-written SQL could produce one — so **no couple could link to an invitation-only venue at all**.

`tenant_invitations` mirrors `wedding_invitations` field for field (token, `invited_by`, 14-day `expires_at`, `claimed_at` / `claimed_by`), and the three properties that make that shape safe carry over: the row names no user, the claim is made by the recipient with their own session, and invitees need no SELECT because the definer function reads the row itself.

One field is mirrored from the **repaired** `wedding_invitations`, not the original: `claimed_by` is `on delete set null` inline. Copied literally from `20260422000001` it would have been `ON DELETE NO ACTION` and would have reintroduced the exact undeletable-account bug `20260731000002` exists to fix — anyone who claimed a venue invite gets 23503 out of `delete_own_account`. When copying a table shape, copy the migrations that repaired it too: an FK to `auth.users` is `cascade` or `set null`, never `no action`, and `delete_own_account` is what breaks when it is.

Two things are **not** symmetrical with the wedding side, and both are deliberate:

- **The role split on INSERT.** Any staff member may invite a `customer`; only the owner may invite `staff` (`role = 'customer' or tenant_role(tenant_id) = 'owner'`). A customer row buys exactly one thing — the ability to call `link_wedding_to_venue` for this venue — while a staff row is a key to the whole CRM, including the seat map of every granted wedding. Note this is the *opposite* asymmetry to the DELETE policy from `20260817000001`, where any staff member may remove another: removal subtracts access and the owner can undo it, creation does neither. `owner` is absent from the CHECK entirely.
- **`PT409`.** `tenant_members_one_per_user` allows one membership per account, so claiming into a second venue cannot succeed. It gets its own SQLSTATE because retrying cannot fix it — the only ways forward are leaving the other venue or using a different account, and a generic failure says neither. Checked before the insert *and* caught as a `unique_violation` around it, since the pre-check races and the unique index is not the one `on conflict` absorbs.

The same migration adds `"members can leave their tenant"` (`user_id = auth.uid() and role <> 'owner'`) on `tenant_members`. It belongs with this change rather than with `20260817000001`: until a couple could put themselves on a roster by consent, nobody was stuck on one, and a membership with no exit would bar them from every other venue permanently. Leaving touches no wedding — membership and `venue_access` are separate decisions with separate RPCs, and neither implies the other.

Client side: `claimTenantInvitation` in `src/lib/sync/tenant.ts`, the claim page at `/venue/invite/$token`, and the CRM roster at `/crm/roster`. The claim route lives under the `/invite/` segment on purpose — `scrubInviteTokens` matches that substring anywhere, so both token routes are redacted out of PostHog by one pattern. `robots.txt` cannot share the trick and needs its own `Disallow: /venue/invite/`, because Disallow is a prefix match from the root. `src/lib/sync/tenantInvitations.test.ts` asserts the whole matrix against the running database.

### Venue menus (`20260822000001`)

A venue's product is its menu, so `menu_packages` → `menu_courses` → `menu_options` is the catalogue it authors in `/crm/menus`. Three tables, one tenant, no couple involved yet: applying this migration is a no-op for every existing user, and nothing in the wedding tree changes.

Four things in it are decisions rather than defaults:

- **The composite foreign keys.** `menu_courses` and `menu_options` carry a denormalised `tenant_id`, and it is held correct by `foreign key (tenant_id, menu_package_id) references menu_packages (tenant_id, id)` — which is what the `unique (tenant_id, id)` on the parents exists for. That is the same guarantee `20260816000001` needed a `security definer` trigger for, with nothing to execute and nothing to keep in step. It also lets all twelve policies be one `is_tenant_staff(tenant_id)` call with no join to walk. `src/lib/sync/menuRls.test.ts` asserts the isolation **per table** for exactly this reason: three tables, three policies, and a missing one on `menu_options` would still leave the other two green.
- **`menu_courses.per_guest_choice`.** The whole two-shapes decision in one boolean instead of two parallel data models. False is a buffet — the couple picks `choose_count` dishes for everyone. True is a plated course (Bagatelka's `MENU SERWOWANE`) — the couple narrows the list and each guest is then assigned one of the survivors.
- **`archived_at`, not a soft delete.** A venue retiring last year's offer must not blank the choices of a couple who already ordered from it. Hard DELETE stays reachable through RLS for a typo caught before anyone ordered, behind a confirm in the UI — and now for that case only: the three FKs pointing here from the wedding tree are `on delete restrict`, so a dish, course or package a couple holds refuses the delete with `23503` and `archived_at` is the only way to retire it. `useTenantMenus` branches on that code and says "archive it instead" rather than "please try again". See the paragraph on the restrict flip below for why they are not `set null`.
- **The two reorder RPCs are invoker-rights, not `security definer`.** Staff already hold UPDATE through the policies, so RLS filters the statement and a cross-tenant id is a silent no-op rather than something to authorize by hand. Each carries `and c.menu_package_id = p_menu_package_id` (or the option equivalent) so ids from another list do nothing instead of scrambling it, and there are two functions rather than one with a `p_kind text` switch — a text parameter that selects a table is one refactor from dynamic SQL. `position` is a plain non-unique integer: every read orders `position, created_at, id`, so a duplicate costs an arbitrary but *stable* order.

`tenants.currency` (shape CHECK `^[A-Z]{3}$`, not an ISO allowlist) arrives with it and is deliberately **not** added to `tenant_public()` — prices are for staff and linked couples, and that projection is the anonymous branding lookup. Prices are integer minor units; `src/lib/money.ts` owns the formatting and the parser, which is hand-written because `Math.round(4.055 * 100)` is 405.

### The couple's menu (`20260822000002`)

`weddings.menu_package_id` plus `wedding_menu_selections (wedding_id, menu_option_id)`. The column is an **ordinary client-writable one** with an ordinary UPDATE policy, unlike `tenant_id` and `venue_access` — choosing a package discloses nothing and grants nobody anything. `enforce_wedding_tenant_columns` names those two literally in both branches, so this column does not trip it and **must not be added there**.

`wedding_menu_selections` is a table rather than a `uuid[]` on `weddings` because an array has no referential integrity, makes pick/unpick a read-modify-write that two devices lose each other's changes through, and gives a cleanup trigger nothing to hang off. The composite primary key makes both operations idempotent single statements.

Two boundaries move here, and both are stated in the migration header:

- It is the **first relation in the wedding tree that the derived `venue` role may SELECT and the couple writes**. Safe here and only here: every value in it is a uuid of the venue's own catalogue. Staff stay read-only — that is asserted, not assumed, because "read-only by construction" (`20260817000003`) stops being true the moment one writable relation exists. If phone ordering ever needs it, the shape is a definer `venue_propose_menu_selection(...)` the couple confirms, not a write policy.
- The catalogue becomes readable by people who are not tenant staff, via one `exists (select 1 from weddings w where w.tenant_id = <table>.tenant_id and is_wedding_member(w.id))` per table. That `is_wedding_member` is **not** the mistake `20260817000003` warns about: it runs the other way round, asking whether the *caller* is a member of a wedding linked to this tenant, and no wedding-tree row is reachable through it. Deliberately not gated on `venue_access` — a menu is the venue's own published data, and a couple deciding whether to grant access needs to see the offer first.

Three `security definer` trigger functions keep a choice a choice from this wedding's menu: `enforce_wedding_menu_package` (the package belongs to the linked tenant), `reset_wedding_menu_on_package_change` (switching package wipes the selections — a wipe, not a "keep what still fits" sweep, since every option row belongs to exactly one package), and `enforce_menu_selection_in_package`. Definer because an invoker-rights integrity check is really asking "can you *see* such a row", and those answers part company the moment a policy changes.

**Archiving retires an offer; it does not cancel an order**, and that asymmetry is a parameter rather than a predicate. `menu_option_in_package` takes `_require_active`, and exactly one caller passes it: `enforce_menu_selection_in_package`, so a couple cannot newly *pick* a dish (or a dish on a course) the venue has archived — the picker never showed it, so such a request did not come from the UI. `enforce_guest_menu_option` (`20260822000003`) deliberately passes the default, so seating the remaining guests on a dish the wedding already selected keeps working after the venue archives it for next season. Enforcing it in both places would let a catalogue edit freeze planning on a wedding that did nothing wrong; enforcing it in neither is the bug this replaced. `menuRls.test.ts` pins both directions.

**The three FKs into the catalogue are `on delete restrict`, and that is a security boundary, not a preference.** `weddings.menu_package_id`, `wedding_menu_selections.menu_option_id` and `guests.menu_option_id` (`20260822000003`) all point at rows venue staff hold DELETE on. Shipped as `set null` / `cascade` / `set null`, they made one `delete from menu_options` a write into three tables of the couple's wedding — including `guests`, whose SELECT policy names the three member roles literally so that no venue ever reads it, and via `clear_guests_menu_option`, a `security definer` function doing an unscoped `update public.guests` with RLS and `venue_access` both out of the picture. "Read-only by construction" was a statement about *policies*; referential actions were the hole. Restrict closes it: staff can still hard-delete a dish nobody ordered, and anything a couple holds has to be archived. The reasoning lives in `20260822000002` section 1 and the other two FKs cross-reference it; `menuRls.test.ts` asserts the refusal on all three levels and that the couple's rows are untouched after the attempt.

**Retiring a venue is a clear, not a refusal.** `weddings.tenant_id` is `on delete set null` and `menu_packages.tenant_id` is `on delete cascade`, so one `delete from tenants` fires both in an order nothing specifies — referential triggers run in name order, i.e. creation order, i.e. which migration happened to be written first. The older FK wins today, so `UPDATE ONLY weddings SET tenant_id = NULL` reaches `enforce_wedding_menu_package` while the couple still holds a package of the venue being deleted, and the refusal aborts the whole delete with `23514` — falsifying the sentence `20260817000002` is built on, that a retired venue must not take a couple's wedding with it. The trigger is not `current_user`-gated, so `psql` provisioning (the only way a tenant is deleted at all — `tenants` has no DELETE policy) hits it too. So the function has a third branch: `tg_op = 'UPDATE'` **and** the tenant is *becoming* null **and** `menu_package_id` is unchanged ⇒ null the package and return. Every other shape still raises, tenant A → tenant B included, so `link_wedding_to_venue`'s own `menu_package_id = null` stays load-bearing.

That branch is why trigger 2 is `after update ... when (new.menu_package_id is distinct from old.menu_package_id)` rather than `after update of menu_package_id`. `update of` matches the statement's **SET list**, not the row that ends up stored, and the SET list of that referential update names one column — `tenant_id`. A retired venue would otherwise leave the couple's selections (and, from `20260822000003`, their guests' dishes) behind, pointing at a package the wedding no longer orders. The `when` clause is evaluated after BEFORE triggers have had `NEW`, so it sees the cleared value and fires; it also stops an `update ... set menu_package_id = <the same package>` wiping a menu it did not change.

Not covered by `menuRls.test.ts`: deleting a tenant needs privileges no signed-in client has, and the suites hold only anon-key sessions. Verified with `psql` instead — `begin; delete from public.tenants where id = <bagatelka>;` leaves both linked weddings with a null `tenant_id`, a null `menu_package_id` and no selections, and their guests, halls, tables and fixtures untouched.

**The restrict flip was re-checked on that same path, in both referential orders**, because a retired tenant cascades into `menu_packages` while a linked wedding still holds one — so the new refusal and the clear above walk the same delete. It survives: the restrict check is an after-row event appended to the *same* trigger queue as the retirement clear, so it evaluates after `enforce_wedding_menu_package` has nulled the package, and `restrict` behaves like `no action` in this timing. Re-running the delete with `weddings_tenant_id_fkey` dropped and recreated — which gives its RI triggers newer oids, so they sort *after* `menu_packages`' cascade instead of before it, confirmed in `pg_trigger` — gives the identical end state: both weddings unlinked, package null, no selections, all 44 guests present with no dish. The refusal still fires when nothing clears the reference, which is the case the flip is for. Changing either the FK actions or that trigger branch means redoing this check.

**`link_wedding_to_venue` is replaced in this migration**, adding `menu_package_id = null` to its UPDATE. That RPC re-links an already-linked wedding on purpose, its UPDATE now fires the first trigger, and a wedding still holding the old venue's package would fail with `23514` — changing venue would simply stop working. `menuRls.test.ts` covers exactly that round trip, on a throwaway wedding rather than the seeded one, because re-linking resets `venue_access` to `'pending'` and `venueRls.test.ts` runs concurrently against the same database.

`choose_count` is deliberately **not** enforced in the database: it needs a counting subquery per insert, it would refuse the transient state of swapping a dish (a delete plus an insert), and the failure mode is benign — six soups renders correctly as six soups, unlike an over-capacity table, which silently drops guests from the canvas while still printing them. The client counts it in the picker.

### The per-guest dish (`20260822000003`)

`guests.menu_option_id`, and it is the one migration in the menu stack that **moves the privacy boundary** — hence its own change, with the disclosure copy amended in the same diff.

What makes it defensible is the column type. `dietary` and `age_group`, the two per-guest fields a venue already reads, are strings the couple types, and their honest limit is that a name typed into a diet tag reaches the venue. A uuid of the venue's own catalogue cannot carry a name. This is the first per-guest column the venue reads that is *structurally* incapable of leaking one, and `venueRls.test.ts` asserts the value is a uuid-or-null rather than trusting the projection.

Two more triggers, both `security definer` for the reason the ones in `20260822000002` are:

- `enforce_guest_menu_option` — the dish must be in the wedding's package **and its course must have `per_guest_choice = true`**. The second half matters as much as the first: a per-guest dish on a buffet course would tally as a plated portion, look right on the report and be wrong in the room. It deliberately does *not* require membership of `wedding_menu_selections` — that is a soft rule the couple transiently breaks by unpicking a dish guests already hold, and enforcing it here turns an unpick into a refusal. It short-circuits on null and on an unchanged value, so seat moves, renames and `reassignTableGuests` never pay for it.
- `clear_guests_menu_option` — **statement-level** `AFTER DELETE` on `wedding_menu_selections` with a transition table, so a bulk unpick (or the package wipe) is one `UPDATE` rather than one per row. Repair rather than refusal, the same direction as soft deletes and orphan adoption. `reset_wedding_menu_on_package_change` is replaced in the same migration to null the column too, ahead of its `DELETE`, so the wedding is never momentarily in a state where a guest holds a dish from a package it no longer orders.

**`wedding_seatmap` is replaced, and that is the sharpest edge in the stack.** `create or replace view` preserves grants but silently accepts a definition that has lost the storage parameter or the `WHERE` — and this view runs as its owner with `security_invoker` off, so that `WHERE` is its entire access control and `security_barrier` is what stops a caller-supplied PostgREST predicate being pushed below it. Both are re-declared character for character. `CREATE OR REPLACE VIEW` may only append, so the first six columns keep their order. Verify with `psql -c "select reloptions from pg_class where relname='wedding_seatmap';"` → `{security_barrier=true}`; nothing else fails if the barrier is gone.

No join to `menu_options` for the dish name. The view's whole safety argument is "there is nothing in the projection to redact, so no call site can forget to", and a text column would degrade the key-absence test into an allowlist distinguishing `name` from `menu_option_name`. It is also the wrong direction on cost — `wedding_role()` already runs per row. The venue resolves names client-side from the catalogue it wrote, read **unfiltered by `archived_at`** so a dish archived after a couple ordered it is still nameable.

### Why `link_wedding_to_venue`'s refusals carry `PT` SQLSTATEs

`PT404` (no such venue), `PT410` (venue not active) and `PT403` (invitation only) — one code per refusal the couple can actually cause, because each renders a different sentence and the SQLSTATE is the only part of a PostgREST error that is a contract. `PTxyz` is PostgREST's convention for "answer with HTTP xyz", so the statuses come out as 404/410/403 rather than a default. This replaces a `error.message.includes("invitation only")` match in `src/lib/sync/venue.ts`: rewording a `raise` would have degraded that case into the generic "could not link, try again" — the one refusal where retrying is exactly the wrong advice. The two refusals a couple cannot trigger from the dialog (no session, not the owner) stay `42501`.

All of this is asserted, not asserted-about: `src/lib/sync/venueRls.test.ts` runs two signed-in clients against the local stack and checks the row counts, the seat map's **key absence**, the write refusals, revocation, and cross-tenant isolation. It skips when Docker is down.

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

### Password recovery (`/forgot-password`, `/reset-password`)

No schema behind it — it's `supabase.auth.resetPasswordForEmail()` out and `updateUser({ password })` back. Three things about the wiring are worth knowing:

- **The recovery link creates a real session.** `createClient` runs the implicit flow with `detectSessionInUrl` on, so `/reset-password` lands as `#access_token=…&refresh_token=…&type=recovery` and the client has consumed it before `AuthGate`'s `getSession()` resolves. `isReady` is therefore the verdict on the link: session means good, no session means expired, spent, or the path was typed. Both routes are in `PUBLIC_PATHS`, so the page renders its own "checking…" state rather than blanking.
- **Both routes are in `TERMS_EXEMPT_PATHS`.** A signed-in user is exactly what `requireAcceptedTerms` acts on, so without the exemption someone mid-recovery gets bounced to `/accept-terms` and on to `/home` with the password unchanged.
- **Those tokens are scrubbed from analytics.** PostHog captures `$current_url` on every pageview and `$referrer` on the next one; a recovery token in the event store is an account takeover. `scrubInviteTokens` redacts `code`/`access_token`/`refresh_token` values alongside invite tokens. The session-replay gap documented in that file applies here too.

**Remote config:** the reset URL has to be reachable from the project's Auth → URL Configuration. Redirect targets are matched against Site URL's origin, so `https://easywed.app/reset-password` is already covered by the existing Site URL — but if a preview deployment is ever added to the allowlist, its `/reset-password` needs to be too. Locally, `site_url` in `config.toml` covers it the same way `/auth/callback` is covered.

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
