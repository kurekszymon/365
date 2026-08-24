# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm** (see `pnpm-lock.yaml`). Scripts are defined in `package.json`:

- `pnpm dev` - Vite dev server on port 3000
- `pnpm run build` - production build
- `pnpm typecheck` - `tsc --noEmit` (use this for type checks; don't invoke `tsc` directly)
- `pnpm test` - `vitest run`. For a single file: `pnpm test path/to/file.test.ts`. For watch mode: `pnpm dlx vitest`
- `pnpm run lint` - ESLint (config: `eslint.config.js`, extends `@tanstack/eslint-config`)
- `pnpm run format` - Prettier
- `pnpm run legal:check` - `scripts/check-legal-placeholders.mjs`; fails while `src/lib/legal/config.ts` still has `[PLACEHOLDER]`s or `launchReviewed: false`
- `pnpm run deploy:pages` - legal check → build → `wrangler pages deploy .output/public` (Cloudflare Pages)

Supabase local stack (see `docs/supabase.md` for the full flow):

- `supabase start` - boots local Postgres + Auth in Docker
- `supabase db reset` - destroys local DB and re-runs all migrations from scratch (the fast-feedback loop when editing a migration)
- `supabase db push` - applies unapplied migrations to the remote project
- `supabase db diff -f <name>` - generate a migration file from local DB changes

**Critical rule:** once a migration is pushed to remote, never edit it - make a new one.

## Architecture

### Stack

TanStack Start (not plain Vite+React) + React 19 + TypeScript. File-based routing via TanStack Router. Supabase for auth + Postgres + RLS. Zustand for client state. i18next for translations. shadcn/ui primitives under `src/components/ui/`. PostHog for product analytics. Deployed as a mostly-prerendered static site on Cloudflare Pages.

`src/routeTree.gen.ts` is **generated** by `@tanstack/router-plugin` from files in `src/routes/`. Do not edit it by hand.

### Two modes: guest (local) and account (cloud)

The same planner UI serves both. `docs/guest-vs-account.md` is the feature matrix; the mechanics:

- `src/lib/localWedding.ts` defines the sentinel `LOCAL_WEDDING_ID = "local"` plus `createLocalGatedStorage()`. The planner/global/reminders stores use `persist` with that gated storage, which **only writes to localStorage while the local wedding is the active one** - so editing a cloud wedding through the same store instances can't leak into the guest snapshot.
- `/wedding/local` resets in-memory state, sets `role: "owner"`, and rehydrates from localStorage. `/wedding/$id` calls `loadWedding` instead.
- Adopting a guest plan into an account goes through `src/lib/sync/migrateLocalWedding.ts` + `MigrateLocalWeddingDialog`, which writes the whole layout atomically via the `replace_planner_layout` RPC (`mutations/layout.ts`).

### Data flow: stores ↔ Supabase

The app uses a specific pattern that spans three places and is easy to miss:

1. **Zustand stores** (`src/stores/*.ts`) hold the client state. Domain: `planner.store.ts` (halls/tables/fixtures/guests/seats, ~1.1k lines - the big one), `reminders.store.ts`, `global.store.ts` (current `weddingId`, wedding name/date, `role`, members, viewport), `auth.store.ts`, `profile.store.ts` (display name + terms status). UI/tooling: `dialog`, `panel`, `view`, `entityList`, `clipboard`, `measures`, `print`, `theme`, `ai` (BYO-key settings), `aiChat`.
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

A tenant (a wedding venue at `<slug>.easywed.app`) can be granted a **peek** at a linked couple's wedding. `wedding_role()` derives `'venue'` when `weddings.tenant_id` is set, `venue_access = 'granted'`, and the caller is `is_tenant_staff` of that tenant. No `wedding_members` row ever carries the value, and `wedding_members_role_check` is deliberately not widened - `coalesce` prefers an explicit member row, so a hand-written `venue` row would outrank the derived branch and survive a revoke.

**`guests`, `reminders` and `wedding_members` SELECT are narrowed to `wedding_role(...) in ('owner','editor','viewer')` and must stay that way.** Two edits look like tidying and are a personal-data breach:

- reverting to `is_wedding_member(wedding_id)` - equivalent only because `wedding_role()`'s *first* branch happens to be a lookup in that same table. The venue branch broke the equivalence; a policy that is safe because of a helper's current implementation is one refactor away from shipping every guest name to a third party, and nothing errors when it does.
- adding `'venue'` to the list - `guests` holds full names and the couple's notes about people who never agreed to anything, and `privacy.venue.hidden` promises in writing that a venue never receives either.

`halls`, `tables`, `fixtures`, `weddings` and `wedding_menu_selections` are the ones that *do* admit `'venue'`. What a venue reads instead of `guests` is `wedding_seatmap`: a `security_barrier` view running as its owner, whose own `WHERE` is its entire access control, projecting seat position + `dietary` + `age_group` + `menu_option_id` and **no `name` or `note` column at all**. Honest limit, disclosed rather than engineered around: `dietary` and `age_group` are free text the couple types, so a name typed into a diet tag reaches the venue. `menu_option_id` is deliberately **not** in that category and that is the point of it being a uuid: it is a key into the venue's own catalogue, structurally incapable of carrying a typed name, and the view does **not** join the dish label in - a text column here would degrade the test's blunt "no `name` key" assertion into an allowlist. `venueRls.test.ts` pins the view's **whole key set**, so any future column is a deliberate edit to that file. Replacing the view (`create or replace`) must re-declare `security_barrier` and the identical `WHERE`; dropping either removes the access control with no error.

The whole matrix is asserted against the running database in `src/lib/sync/venueRls.test.ts` (skips when the local stack is down). Its seat-map assertion checks **key absence**, not value absence, on purpose. Full write-up in `docs/supabase.md`.

Neither `weddings.tenant_id` nor `weddings.venue_access` is client-writable (`enforce_wedding_tenant_columns`, on INSERT as well as UPDATE); `link_wedding_to_venue` and `set_venue_access` are the only ways in. `set_venue_access` lets the wedding owner grant or revoke and lets venue staff **only revoke** - granting is the art. 9(2)(a) consent, and the recipient of the data cannot supply it for the data subject.

**Joining a venue is the recipient's act, never the venue's.** `tenant_members` has no INSERT policy and must not grow one - a row written by the venue hands it a stranger's `display_name`, bars that account from every other venue (`tenant_members_one_per_user` is unique), and makes their wedding attachable. `tenant_invitations` + `claim_tenant_invitation` (`20260820000001`) are the door, mirroring `wedding_invitations` + `claim_wedding_invitation`: the row names nobody, the *claimer* calls the definer RPC, and invitees get no SELECT on the table. Two asymmetries with the wedding side are load-bearing - only a tenant **owner** may invite `staff` (any staff member may invite a `customer`), and `PT409` is its own SQLSTATE because one account can belong to one venue and retrying cannot fix that. Surfaced as `/crm/roster` (issue and revoke links, see who joined) and `/venue/invite/$token` (claim one). Asserted in `src/lib/sync/tenantInvitations.test.ts`.

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

`src/routes/` splits into a prerendered marketing site, the app, and auth flows.

Marketing (locale-pinned, prerendered to real HTML - see `vite.config.ts`):

- `index.tsx` - `/` is a language dispatcher that redirects to `/pl` or `/en` on hydration, but renders the Polish landing so crawlers get content.
- `pl.tsx` / `en.tsx`, and the `_`-escaped siblings `pl_.venues`, `pl_.changelog`, `pl_.privacy`, `pl_.terms` (and the `en_.` set).

App:

- `__root.tsx` - root layout: `AuthGate`, `requireAcceptedTerms`, PostHog provider, devtools, tooltip provider, toaster.
- `home.tsx` - the wedding list (the signed-in dashboard; **not** `/`).
- `wedding.$id.tsx` - `requireAuth` + `loadWedding`, renders an `<Outlet />`; `wedding.$id/index.tsx` redirects to `wedding.$id/planner.tsx`, which renders `<Planner />`. A `venue` role is forwarded to `/crm/wedding/$id` once the role settles.
- `wedding.local.tsx` + `wedding.local/` - the same shape for guest mode, no auth.
- `settings.tsx`, `invite.$token.tsx` (redeems a `wedding_invitations` token via the `claim_wedding_invitation` RPC), `accept-terms.tsx`.
- `app-shell.tsx` - renders nothing; it is the `spa.maskPath` target, emitted as `404.html` for Cloudflare's SPA fallback. Read the long comment in `vite.config.ts` before touching prerender/SPA config.

Tenant hosts (`<slug>.easywed.app`, and `<slug>.localhost:3000` in dev):

- `venue.tsx` - the anonymous branded entry page; `crm.tsx` + `crm/index.tsx` - the staff shell and overview; `crm/roster.tsx` - the venue's couples and staff, plus the invitation links that put them there; `crm/menus.tsx` - the menu catalogue (`menu_packages` → `menu_courses` → `menu_options`), whose hook `useTenantMenus.ts` calls `supabase` **directly and never `run()`**, because `run()` gates on `selectCanEdit` and no wedding is loaded in the CRM - the same reason `sync/venue.ts` stands outside it; `crm/wedding.$id.tsx` - the peek at one granted wedding, which reuses `PlannerPrintView` with `fields: ["dietary"]` for the kitchen report rather than growing a second print component.
- Static tenant routes go in `APP_ROUTES` (`vite.config.ts`) so they answer with real HTML a crawler can read `noindex` off. **`/crm/wedding/$id` must not** - it is dynamic, same as `/wedding/$id`, and `robots.txt` blocks the prefix instead.

`venue_.invite.$token.tsx` (`/venue/invite/$token`) is the odd one out: it serves on **both** the apex and a tenant host, because a couple's session lives on the apex and staff sign in on the venue's. `apexOrigin()` / `tenantOrigin(slug)` in `lib/tenant/host.ts` build the link for whichever origin the recipient needs - `SITE_ORIGIN` is a constant and would break `pnpm dev`. The `_` escape keeps it out of `venue.tsx`, and the shared `/invite/` segment is what makes `scrubInviteTokens` cover it for free.

Auth: `login.tsx`, `signup.tsx`, `forgot-password.tsx`, `reset-password.tsx`, `auth.callback.tsx`.

Reminders are **not** a route - they're a tab in the planner sidebar (`components/reminders/`, `entityList.store.ts`). Neither is the couple's **menu** (`components/planner/Menu/`, `menu.store.ts`): `/wedding` stays apex-only, and the tab is dropped entirely when `global.store.venue` is null - which is what gives guest mode and unlinked weddings no Menu tab for free, since a local wedding has no tenant.

### Planner (the main feature)

`src/components/planner/`:

- `Canvas/` - the dnd-kit drag surface: halls (`HallView`, `HallSurface`, `HallOutline`), tables/fixtures (`DraggableTable`, `DraggableFixture`), seats (`TableSeats`, `seatLayout.ts`), plus the polygon `ShapeEditOverlay`, measuring tool, minimap, context menu, pan/zoom/snap/clipboard hooks.
- `Header/`, `Sidebar/` (desktop rail + mobile bottom tab bar + entity list + add/edit dialogs), `Guests/` (guest list, seat-assign sheet, seating progress).
- `EntityForms/` - table/fixture/hall form contents, the add hub, the AI chat panel, and the mobile `MobilePanelDrawer` that hosts them; `EntityForms/fields/` holds reusable field components (e.g. `GuestAssignmentPicker.tsx`, `TableSeatMap.tsx`). The same form content renders in `Sidebar/EntityEditDialog` on desktop and `MobilePanelDrawer` on mobile via the shared `PanelBody`.
- `PlannerPrintView.tsx` + `usePrintShortcut.ts` - the print/PDF surface driven by `print.store.ts`.

Multi-hall: entity `position` is **hall-local meters** (top-left origin); the hall's world position is added at render time, so moving a hall never rewrites its children. Table shapes are `round`, `rectangular`, or `custom` (polygon `Geometry`); round uses `width` as diameter. Rotation is only `0 | 90`.

### Dialogs

`src/components/dialogs/` holds modal flows, registered centrally: `dialog.store.ts` holds the currently-open dialog id (e.g. `"Guest.Import"`), `DialogManager.tsx` switches on it to render the right dialog, and each subfolder (`guests/`, `planner/`, `weddings/`, plus `shared/` for cross-flow steps) has an `index` barrel. `DialogManager` is mounted once, in `Planner.tsx`.

**One component per file.** Keep each file to a single component - split multi-step dialogs into an orchestrator plus a file per step/preview. Example: the guest CSV/XLSX import (`guests/ImportGuestsDialog.tsx` + `GuestImportMappingStep` + `GuestImportSheetPreview` + `GuestImportResultPreview`, with the wizard state machine in `shared/useGuestImportWizard.ts`).

### Guest list import / export

- **Export**: `src/lib/export/guests.ts` (grouping + sort helpers), `guestsCsv.ts`, `guestsPdf.ts`. CSV has two modes - `flat` (one header row, one guest per row) and `grouped` (section headings per table, ragged rows). Only **flat** is re-importable; grouped is a human-readable report. CSV is serialized by hand (small RFC-4180 helper), not a library. The PDF path renders `PlannerPrintView` through the browser's print dialog via `print.store.ts`.
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
