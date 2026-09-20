# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

pnpm, scripts in `package.json`. The ones you can't guess:

- `pnpm typecheck` for type checks - don't invoke `tsc` directly.
- `pnpm test path/to/file.test.ts` for a single file; `pnpm dlx vitest` for watch mode.
- `pnpm run legal:check` fails while `src/lib/legal/config.ts` still holds `[PLACEHOLDER]`s or `launchReviewed: false`, and it gates `deploy:pages`.
- The Supabase CLI flow is in `docs/supabase.md`. `supabase db reset` is the fast-feedback loop while editing a migration.

**Critical rule:** once a migration is pushed to remote, never edit it - make a new one.

## Architecture

### Stack

TanStack Start - **not** plain Vite+React - with file-based routing, Supabase (auth + Postgres + RLS), Zustand, i18next, shadcn/ui under `src/components/ui/`, PostHog. Deployed as a mostly-prerendered static site on Cloudflare Pages.

`src/routeTree.gen.ts` is **generated** by `@tanstack/router-plugin` from `src/routes/`. Do not edit it by hand.

### Two modes: guest (local) and account (cloud)

The same planner UI serves both. `docs/guest-vs-account.md` is the feature matrix; the mechanics:

- `src/lib/localWedding.ts` defines the sentinel `LOCAL_WEDDING_ID = "local"` plus `createLocalGatedStorage()`. The planner/global/reminders stores use `persist` with that gated storage, which **only writes to localStorage while the local wedding is the active one** - so editing a cloud wedding through the same store instances can't leak into the guest snapshot.
- `/wedding/local` resets in-memory state, sets `role: "owner"`, and rehydrates from localStorage. `/wedding/$id` calls `loadWedding` instead.
- Adopting a guest plan into an account goes through `src/lib/sync/migrateLocalWedding.ts` + `MigrateLocalWeddingDialog`, which writes the whole layout atomically via the `replace_planner_layout` RPC (`mutations/layout.ts`).

### Data flow: stores ↔ Supabase

The app uses a specific pattern that spans three places and is easy to miss:

1. **Zustand stores** (`src/stores/*.ts`) hold the client state. `planner.store.ts` (halls/tables/fixtures/guests/seats, ~1.1k lines) is the big one; `global.store.ts` carries the current `weddingId`, wedding name/date, `role`, members and viewport. The rest are single-purpose UI/tooling stores.
2. **`src/lib/sync/loadWedding.ts`** hydrates the planner/reminders/global stores from Supabase in one parallel `Promise.all`, given a wedding id. Called from `src/routes/wedding.$id.tsx` with an `AbortController`. Its sibling **`loadWeddingForVenue.ts`** does the same for a venue's peek: no guests/reminders/members request at all, seats from the `wedding_seatmap` view, and every seat labelled `venue.anonymous_guest` **at the load boundary** so every downstream renderer (canvas, guest list, `PlannerPrintView`) works unchanged. The row→entity mappers both share live in `sync/rows.ts`; there is deliberately no shared *guest* mapper, because the two paths read different relations.
3. **`src/lib/sync/mutations/`** - one module per entity (`wedding`, `hall`, `tables`, `guests`, `fixtures`, `reminders`, `layout`, `menu`), re-exported from `mutations/index.ts`. Store actions optimistically update Zustand state first, then fire-and-forget the matching mutation (`void insertTable(...)`).

**Everything funnels through `run()` in `mutations/shared.ts`.** It is the contract, and it does four things:

- returns `Promise<boolean>` - `true` = persisted, `false` = failed - so callers can chain on `ok`;
- on failure (returned error *or* thrown/rejected promise) it `console.error`s and toasts `sync.save_failed` under a fixed toast id, so a burst of failed writes collapses into one toast;
- short-circuits to `true` for the local wedding, before the Postgrest thenable is ever awaited - no request is sent in guest mode, and the optimistic `set()` + `persist` already counted as the write;
- short-circuits to `false` with a `console.warn` (no toast) when `selectCanEdit` says the current role is read-only.

There is still **no rollback layer**: a failed cloud write leaves optimistic state diverged from the DB until the next load. The toast is the only signal. `shared.ts` also owns the row mappers (`hallRow`/`tableRow`/`fixtureRow`), the `Geometry → Json` cast, and the table-name-parameterized `updatePos` / `markDeleted` / `markDeletedMany` helpers; it is deliberately **not** re-exported from the barrel.

`global.store.ts` holds the current `weddingId`. Mutations read it via `getWeddingId()` to scope inserts; if none is loaded, they no-op with a warning.

**`updateX` vs `saveX` split:** For tables and fixtures, `updateTable`/`updateFixture` are **local-only** state updates used for live preview while the user edits in an entity form. `saveTable`/`saveFixture` are the ones that call mutations and persist to Supabase. Do not treat the missing mutation call in `updateX` as a bug - it is by design. `saveTable` persists attributes + seat overrides + roster in one `save_table` transaction, because the two capacity triggers want opposite write orderings (see the comment in `mutations/tables.ts`).

### Roles and read-only mode

`WeddingRole` is `owner | editor | viewer | venue`. The first three are rows in `wedding_members`; `venue` is **derived** by `wedding_role()` and never stored (see the venue section below). `selectCanEdit(state)` in `global.store.ts` mirrors the RLS predicate (`wedding_role(...) in ('owner','editor')`) and fails closed on `undefined` (pre-load *and* no-membership). It is an **allowlist**, which is why `venue` needed no change there - keep it one, since a `role !== "viewer"` formulation would silently admit the venue. The UI gates write affordances on it; `run()` re-checks as defence in depth. Guest mode carries role `"owner"`.

The role is read from the `my_wedding_role` RPC in `loadWedding.ts`, not from the member rows - a venue reads zero of those.

### Auth and route guards

`src/components/auth/AuthGate.tsx` wraps the root route. It hydrates the Supabase session, subscribes to `onAuthStateChange`, keeps the user's display name and terms status in sync, and calls `router.invalidate()` once ready - it **does not redirect**.

Redirect decisions live in `src/lib/auth/guards.ts` and are called from route `beforeLoad`:

- `requireAuth(nextPath)` - bails while `!isReady` (AuthGate's `invalidate()` re-runs it), else redirects to `/login?next=`.
- `requireAcceptedTerms(pathname)` - mounted on the root route; bounces a signed-in user with an outstanding acceptance to `/accept-terms`. `TERMS_EXEMPT_PATHS` is load-bearing (legal docs, `/reset-password`) - read the comment before trimming it.
- `redirectAuthedAwayFromLogin`, `sanitizeNextPath`.
- `authLandingPath(next)` - the single answer to "signed in, now what?", shared by the `/login` and `/signup` guards, `/auth/callback` and `/accept-terms`. **Do not hardcode `/home` at an auth terminus again**: `/home` is in `APEX_ONLY_PREFIXES`, so on a venue host the root guard carried the caller to an origin their session does not exist on - signing in worked and landed staff on the signed-out landing. Order is `next` → `/crm` on a tenant host (the role is deliberately not consulted; it is a round trip away and the CRM shell renders its own 403) → `/home` on the apex.

The apex cannot read a venue off the hostname, so `authLandingPath` arms a one-shot marker (`lib/auth/venueLanding.ts`) that `useVenueStaffLanding` spends on the next `/home`: one `fetchMyStaffTenant` lookup, then `window.location.replace` to `tenantOrigin(slug)/crm`. Marker rather than a check on every render, for two reasons - every couple would otherwise pay a query for an answer that is "no", and the venue owner who also plans their own wedding would be bounced off their list every time they reached it. Sessions are per-origin, so the hop lands on the venue host's `/login?next=/crm` rather than straight in the CRM; that is inherent, not a bug to fix by moving tokens across origins.

Both guards treat "not settled yet" (`!isReady`, `termsStatus === "unknown"`) as pass-through. `AuthGate`'s `PUBLIC_PATHS` is about rendering without waiting, not authorization.

### Supabase schema and RLS

Schema lives in `supabase/migrations/`. Live tables: `weddings`, `wedding_members`, `halls`, `tables`, `fixtures`, `guests`, `reminders`, `wedding_invitations`, `tenants`, `tenant_members`, `tenant_invitations`, `menu_packages`, `menu_courses`, `menu_options`, `wedding_menu_selections`, and `profiles` (1:1 with `auth.users`, outside the wedding tree). One view: `wedding_seatmap`. `invitation_orders` was created and later dropped (`20260804000001`) - ignore it.

All tables have RLS enabled; access is gated by `public.is_wedding_member(wedding_id)` and `public.wedding_role(wedding_id)` helper functions (both `security definer` to avoid recursion through `wedding_members`' own policies).

#### The venue role, and the one policy you must not "simplify"

A tenant (a wedding venue at `<slug>.easywed.app`) can be granted a **peek** at a linked couple's wedding, and `wedding_role()` derives `'venue'` for its staff. **Read the venue sections of `docs/supabase.md` before touching any policy on the wedding tree, the `wedding_seatmap` view, or `tenant_members`** - they carry the reasoning, the disclosure copy each rule is load-bearing for, and the honest limits on what the projection can close. What follows is only the tripwire, because down here the failure mode is silent:

- **`guests`, `reminders` and `wedding_members` SELECT are narrowed to `wedding_role(...) in ('owner','editor','viewer')` and must stay literal.** Reverting them to `is_wedding_member(wedding_id)` and adding `'venue'` to the list both look like tidying, and both are a personal-data breach that raises no error. `halls`, `tables`, `fixtures`, `weddings` and `wedding_menu_selections` are the ones that *do* admit `'venue'`.
- **`wedding_seatmap` is what a venue reads instead of `guests`**: a `security_barrier` view running as its owner, with no `name` and no `note` column in it to leak. A `create or replace` must re-declare `security_barrier` and the identical `WHERE` - dropping either removes the access control with no error.
- **No `wedding_members` row ever carries `'venue'`**, and `wedding_members_role_check` is deliberately not widened: `coalesce` prefers an explicit member row, so a hand-written one would outrank the derived branch and survive a revoke.
- **`tenant_members` has no INSERT policy and must not grow one.** Joining a venue is the recipient's act, never the venue's - `tenant_invitations` + `claim_tenant_invitation` are the door, and the *claimer* calls the definer RPC.
- **Neither `weddings.tenant_id` nor `weddings.venue_access` is client-writable** (`enforce_wedding_tenant_columns`, on INSERT as well as UPDATE); `link_wedding_to_venue` and `set_venue_access` are the only ways in.

`venueRls.test.ts` and `tenantInvitations.test.ts` assert the whole matrix against the running database and are the spec (both skip when the local stack is down). The seat-map case pins the view's **entire key set**, so any new column there is a deliberate edit to that file.

Key hardening already in place:

- `weddings.owner_id` is immutable from the client, enforced by the `enforce_wedding_owner_immutable` trigger (migration `20260731000003_leave_wedding.sql`). The older `revoke update (owner_id) ... from authenticated` in `20260418000002` reads like it does this but is a **no-op**: hosted Supabase grants `authenticated` table-level UPDATE, and a column revoke can't subtract from a table grant. Same for `revoke update (id) on public.profiles` - harmless there, since the UPDATE policy's `with check` already pins the column. Ownership transfer must go through a `security definer` RPC.
- Triggers handle `updated_at`, auto-insert the `owner` row into `wedding_members` on wedding creation, and enforce table capacity server-side in both directions (`enforce_table_capacity`, `enforce_table_capacity_floor`).
- CHECK constraints enforce enum-like fields (`shape`, `dietary`) at the DB layer - the TS unions in `planner.store.ts` mirror them.
- Table/fixture deletes are **soft** (`deleted_at`; `loadWedding` filters `is null`). The one hard delete is inside the `replace_planner_layout` RPC.

**Gotchas:**

- `.insert().select()` chained together can fail RLS when the SELECT policy depends on a row inserted by an AFTER trigger. Split the insert and select, or run the select separately after the trigger has fired.
- Don't "fix" the linter warning about `anon` execute on `is_wedding_member` / `wedding_role` / `shares_wedding_with` - revoking it has segfaulted Postgres (see `20260806000001`).

### i18n

`src/i18n/index.ts` initializes i18next with `LanguageDetector` and Suspense, `fallbackLng: "pl"`. Two namespaces:

- `translation` - the app, from `src/i18n/locales/{en,pl}.json` as **flat dotted keys** (e.g. `"tables.guests_pick": "..."`), not nested objects.
- `changelog` - assembled in `src/i18n/locales/changelog/index.ts` from one folder per release (`v1/`, `v1.1/`, plus `page/`). Referenced as `changelog:<key>`. Only the two marketing changelog pages read it; the menu label stays in `translation` as `account.changelog`.

Polish plural rules need `_one`/`_few`/`_many` variants; English only uses `_one` + base key.

When adding UI strings, add keys to **both** `en.json` and `pl.json`. Polish is the primary user-facing language.

### Routing

`src/routes/` splits into a prerendered, locale-pinned marketing site (`pl.tsx` / `en.tsx` plus their `_`-escaped siblings), the app, auth flows, and the tenant hosts under `venue.tsx` / `crm/` (`<slug>.easywed.app`, `<slug>.localhost:3000` in dev). Most of it reads off the filenames. These do not:

- `index.tsx` - `/` redirects to `/pl` or `/en` on hydration but **renders the Polish landing**, so crawlers get content.
- `home.tsx` is the signed-in wedding list, **not** `/`.
- `app-shell.tsx` renders nothing: it is the `spa.maskPath` target, emitted as `404.html` for Cloudflare's SPA fallback. Read the long comment in `vite.config.ts` before touching prerender/SPA config.
- `wedding.$id.tsx` forwards a `venue` role to `/crm/wedding/$id` once the role settles.
- Static tenant routes go in `APP_ROUTES` (`vite.config.ts`) so they answer with real HTML a crawler can read `noindex` off. **`/crm/wedding/$id` must not** - it is dynamic, like `/wedding/$id`, and `robots.txt` blocks the prefix instead.
- `venue_.invite.$token.tsx` serves on **both** the apex and a tenant host, because a couple's session lives on the apex and staff sign in on the venue's. `apexOrigin()` / `tenantOrigin(slug)` in `lib/tenant/host.ts` build the link for whichever origin the recipient needs - a `SITE_ORIGIN` constant would break `pnpm dev`. The `_` escape keeps it out of `venue.tsx`; the shared `/invite/` segment is what makes `scrubInviteTokens` cover it for free.
- `crm/menus.tsx`'s hook `useTenantMenus.ts` (in `src/components/crm/`) calls `supabase` **directly and never `run()`**, because `run()` gates on `selectCanEdit` and no wedding is loaded in the CRM - the same reason `sync/venue.ts` stands outside it.
- `crm/wedding.$id.tsx` reuses `PlannerPrintView` with `fields: ["name", "dietary", "dish"]` for the kitchen report rather than growing a second print component; that "name" is the seat's pseudonym, applied at the load boundary. `KitchenMenuTally` and `VenuePeekSummary` beside it count what `loadWeddingForVenue` already put in `planner.store` and make **no query of their own** - that is what keeps a guest name structurally out of reach, not the discipline of the file.

Reminders are **not** a route - they're a tab in the planner sidebar (`components/reminders/`, `entityList.store.ts`). Neither is the couple's **menu** (`components/planner/Menu/`, `menu.store.ts`): `/wedding` stays apex-only, and the tab is dropped entirely when `global.store.venue` is null - which is what gives guest mode and unlinked weddings no Menu tab for free, since a local wedding has no tenant.

### Planner (the main feature)

`src/components/planner/` is `Canvas/` (the dnd-kit drag surface), `Header/`, `Sidebar/`, `Guests/`, `EntityForms/` and `PlannerPrintView.tsx` (driven by `print.store.ts`). Two things the folder names don't say: the same form content renders in `Sidebar/EntityEditDialog` on desktop and `MobilePanelDrawer` on mobile via the shared `PanelBody`, and reusable field components live in `EntityForms/fields/` rather than beside their form.

Multi-hall: entity `position` is **hall-local meters** (top-left origin); the hall's world position is added at render time, so moving a hall never rewrites its children. Table shapes are `round`, `rectangular`, or `custom` (polygon `Geometry`); round uses `width` as diameter. Rotation is only `0 | 90`.

### Dialogs

`src/components/dialogs/` holds modal flows, registered centrally: `dialog.store.ts` holds the currently-open dialog id (e.g. `"Guest.Import"`), `DialogManager.tsx` switches on it to render the right dialog, and each subfolder (`guests/`, `planner/`, `weddings/`, plus `shared/` for cross-flow steps) has an `index` barrel. `DialogManager` is mounted once, in `Planner.tsx`.

**One component per file.** Keep each file to a single component - split multi-step dialogs into an orchestrator plus a file per step/preview. Example: the guest CSV/XLSX import (`guests/ImportGuestsDialog.tsx` + `GuestImportMappingStep` + `GuestImportSheetPreview` + `GuestImportResultPreview`, with the wizard state machine in `shared/useGuestImportWizard.ts`).

### Guest list import / export

- **Export**: `src/lib/export/guests.ts` (grouping + sort helpers), `guestsCsv.ts`, `guestsPdf.ts`. CSV has two modes - `flat` (one header row, one guest per row) and `grouped` (section headings per table, ragged rows). Only **flat** is re-importable; grouped is a human-readable report. CSV is serialized by hand (small RFC-4180 helper), not a library. The `dish` column (the per-guest menu choice) is offered only when `menu.store` holds a catalogue, and it is **safe for re-import**: `guestsImport` maps by column index over its own closed `GUEST_IMPORT_FIELDS`, so an unrecognised header is ignored rather than shifting the others - asserted in `guestsCsv.test.ts` against the literal header strings each locale emits. Adding a `dish` import alias would need an exact normalised match against the served set; dish names are long and near-identical, so anything looser guesses at what a couple meant to serve. The PDF path renders `PlannerPrintView` through the browser's print dialog via `print.store.ts`.
- **Import** (`src/lib/import/guestsImport.ts`): parses CSV **and** XLSX via **SheetJS**, which is the unmaintained npm `xlsx` replaced by the maintained CDN tarball (`package.json` → `"xlsx": "https://cdn.sheetjs.com/...tgz"`) and **lazy-loaded** inside `parseGuestFile` (`await import("xlsx")`) so it stays out of the main bundle. The CDN build is CJS, so resolve the API defensively (`mod.read ? mod : mod.default`). `buildGuests` matches table names case/diacritic-insensitively (incl. Polish `ł`) against existing tables, else leaves the guest unassigned - it never creates tables. The wizard expects a simple table with a header row; surface that in the UI rather than a generic "couldn't read" error.

### AI assistant (BYO key)

`src/lib/ai/` - the planner's chat assistant. The user supplies their own OpenAI-compatible endpoint + key + model (`ai.store.ts`, OpenRouter by default, llama.cpp presets included); calls go **browser → user's endpoint**, there is no server route. `runAgent.ts` streams via the Vercel AI SDK and drives a tool loop bounded by `stepCountIs(8)`; `tools.ts` mutates the planner store directly and routes destructive tools through a confirmation in `aiChat.store.ts`. The current layout is injected as a **user** message each turn (`buildLayoutMessage`), never into the system prompt, because it is full of user-supplied names - keep it that way. The key is plaintext in localStorage by design; that's disclosed in the setup UI.

### Analytics and privacy

`src/lib/analytics/track.ts` declares `AnalyticsEvents` as a **closed** map: every property is a count, enum, or boolean we write ourselves, so no user-typed string (guest/table/hall names, notes, AI prompts) can reach PostHog. Autocapture and cookies are off in `__root.tsx`; `scrubInviteTokens.ts` strips invite tokens (bearer credentials in the URL path) from events. If a new event needs a string, make it a literal union in that map. A tenant is attributed with a PostHog **group** (`identifyTenantGroup`, keyed on the tenant's uuid), never an event property - that keeps the map closed and keeps venue slugs and names out of event payloads.

### Legal documents

`src/lib/legal/config.ts` holds every legal *decision* (trader identity, effective dates, operational facts) in one file; `provider.ts` maps it to i18n interpolation vars and `dates.ts` formats per locale. Prose lives in the locale files. `pnpm run legal:check` blocks deploys while placeholders remain.

## Reference docs

- `docs/supabase.md` - authoritative notes on the schema, RLS policies, triggers, and the Supabase CLI flow.
- `docs/guest-vs-account.md` - what differs between guest mode (not signed in, the free plan) and a signed-in account: routing guards, persistence, and the feature matrix.
- `docs/DEVLOG.md` - development log.
