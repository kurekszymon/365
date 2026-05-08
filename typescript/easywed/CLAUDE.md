# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **bun** (see `bun.lock`). Scripts are defined in `package.json`:

- `bun dev` — Vite dev server on port 3000
- `bun run build` — production build
- `bun typecheck` — `tsc --noEmit` (use this for type checks; don't invoke `tsc` directly)
- `bun test` — `vitest run`. For a single file: `bun test path/to/file.test.ts`. For watch mode: `bunx vitest`
- `bun run lint` — ESLint (config: `eslint.config.js`, extends `@tanstack/eslint-config`)
- `bun run format` — Prettier

Supabase local stack (see `docs/supabase.md` for the full flow):

- `supabase start` — boots local Postgres + Auth in Docker
- `supabase db reset` — destroys local DB and re-runs all migrations from scratch (the fast-feedback loop when editing a migration)
- `supabase db push` — applies unapplied migrations to the remote project
- `supabase db diff -f <name>` — generate a migration file from local DB changes

**Critical rule:** once a migration is pushed to remote, never edit it — make a new one.

## Architecture

### Stack

TanStack Start (not plain Vite+React) + React 19 + TypeScript. File-based routing via TanStack Router. Supabase for auth + Postgres + RLS. Zustand for client state. i18next for translations. shadcn/ui primitives under `src/components/ui/`.

`src/routeTree.gen.ts` is **generated** by `@tanstack/router-plugin` from files in `src/routes/`. Do not edit it by hand.

### Data flow: stores ↔ Supabase

The app uses a specific pattern that spans three files and is easy to miss:

1. **Zustand stores** (`src/stores/*.ts`) hold the client state. `planner.store.ts` (tables/guests/hall), `reminders.store.ts`, `global.store.ts` (current `weddingId`, `userType`, `subjectKind`), `auth.store.ts`, plus UI stores (`dialog`, `panel`, `view`).
2. **`src/lib/sync/loadWedding.ts`** hydrates the planner/reminders stores from Supabase in one parallel `Promise.all` call, given a wedding id. Called from `src/routes/wedding.$id.tsx` with an `AbortController`. **`loadVenueHall.ts`** mirrors it for venue hall templates (no guests/reminders).
3. **`src/lib/sync/mutations.ts`** exports per-action functions (`insertTable`, `updateGuestTable`, `upsertHall`, …). Store actions optimistically update Zustand state first, then fire-and-forget the matching mutation (`void insertTable(...)`). The mutations currently only `console.error` on failure — there is no toast/rollback layer, so optimistic state can diverge from the DB on error. Keep this in mind when adding new mutations.

**`updateX` vs `saveX` split:** For tables and fixtures, `updateTable`/`updateFixture` are **local-only** state updates used for live preview while the user edits in the PropertyPanel. `saveTable`/`saveFixture` are the ones that call mutations and persist to Supabase. Do not treat the missing mutation call in `updateX` as a bug — it is by design.

`global.store.ts` holds the current `weddingId` plus `subjectKind`/`subjectId`. Mutations read these via `getSubject()` and route writes to either the wedding-scoped tables (`tables`, `fixtures`, `halls`) when `subjectKind === "wedding"`, or the venue-scoped tables (`venue_hall_tables`, `venue_hall_fixtures`, `venue_halls`) when `subjectKind === "venue_hall"`. The same `<Planner />` component renders both modes; only the data layer switches. Wedding-only mutations (guests, reminders, wedding name/date metadata) short-circuit when not in wedding mode.

### Auth

`src/components/auth/AuthGate.tsx` wraps the root route. It hydrates the Supabase session on mount, subscribes to `onAuthStateChange`, and redirects unauthenticated users to `/login` (allowlist: `PUBLIC_PATHS = ["/login", "/auth/callback"]`). The app renders nothing until `isReady` is true. Once a session exists it loads `profiles.user_type` into `useGlobalStore.userType` (`undefined` while loading, `null` if not yet onboarded, `"couple" | "venue"` once set). Route guards in `src/lib/auth/guards.ts` (`requireAuth`, `requireOnboarded`) gate access; `requireOnboarded` only redirects when `userType === null`, so the loading state passes through.

### User types & venue model

Two roles, gated by `profiles.user_type`:

- **couple** — default role; owns weddings via `weddings.owner_id`. New signups pick this at `/onboarding`. Anyone arriving via a `claim_wedding_invitation()` claim is silently set to `'couple'` so invitees skip the onboarding screen.
- **venue** — owns one or more `venues` rows; each venue has many `venue_halls` (with `venue_hall_tables` / `venue_hall_fixtures` mirroring the wedding-side schema). Couples browse public halls at `/halls`, click "Start wedding here", and call `start_wedding_from_hall(hall_id, name, date)` — a SECURITY DEFINER RPC that creates a fresh wedding owned by the couple, copies the hall geometry/tables/fixtures, and stamps `weddings.host_venue_id`. Venues never own the resulting wedding; the source hall is never edited by the couple.

The `set_user_type(_user_type)` RPC is one-shot: it refuses to overwrite an existing `user_type`. Direct UPDATEs to `profiles.user_type` are blocked by `revoke update (user_type) ... from authenticated`.

### Supabase schema and RLS

Schema lives in `supabase/migrations/`. Wedding-side tables: `weddings`, `wedding_members`, `halls`, `tables`, `guests`, `fixtures`, `reminders`, `wedding_invitations`. Venue-side tables: `profiles`, `venues`, `venue_halls`, `venue_hall_tables`, `venue_hall_fixtures`. All tables have RLS enabled; wedding access is gated by `public.is_wedding_member(wedding_id)` / `public.wedding_role(wedding_id)`, and venue access by `public.is_venue_owner(venue_id)` / `public.is_venue_hall_owner(hall_id)` / `public.can_view_venue_hall(hall_id)` helper functions (all `security definer` to avoid policy recursion).

Key hardening already in place:

- `revoke update (owner_id) on public.weddings from authenticated` — editors/owners cannot reassign ownership via UPDATE (migration `20260418000002`).
- Triggers handle `updated_at`, auto-insert the `owner` row into `wedding_members` on wedding creation, and enforce table capacity server-side (`enforce_table_capacity`).
- CHECK constraints enforce enum-like fields (`shape`, `dietary`) at the DB layer — the TS unions in `planner.store.ts` mirror them.

**Gotcha (from project memory):** `.insert().select()` chained together can fail RLS when the SELECT policy depends on a row inserted by an AFTER trigger. Split the insert and select, or run the select separately after the trigger has fired.

### i18n

`src/i18n/index.ts` initializes i18next with `LanguageDetector` and Suspense. Translations live in `src/i18n/locales/{en,pl}.json` as **flat dotted keys** (e.g. `"tables.guests_pick": "..."`), not nested objects. Polish plural rules need `_one`/`_few`/`_many` variants; English only uses `_one` + base key.

When adding UI strings, add keys to **both** `en.json` and `pl.json`. Polish is the primary user-facing language.

### Routing

`src/routes/`:

- `__root.tsx` — root layout, mounts `AuthGate`, devtools, tooltip provider
- `index.tsx` — wedding list / landing (couples auto-redirect to their wedding; venues redirect to `/venue`)
- `login.tsx`, `auth.callback.tsx` — auth
- `onboarding.tsx` — first-time role picker (Couple / Venue)
- `halls.tsx` — public catalog of venue halls; couple-pull entry point for `start_wedding_from_hall`
- `venue.tsx` — venue dashboard: list/CRUD of halls owned by the current venue
- `venue.halls.$id.tsx` — venue-side Planner editor for a single hall (writes to `venue_hall_*`)
- `wedding.$id.tsx` — loads a wedding via `loadWedding` and renders `<Planner />`
- `reminders/` — reminders subtree

### Planner (the main feature)

`src/components/planner/` — split into `Canvas/` (dnd-kit drag surface for tables), `Header/`, `PropertyPanel/` (the edit sidebar). `PropertyPanel/fields/` holds reusable field components (e.g. `GuestAssignmentPicker.tsx`). Drag-and-drop uses `@dnd-kit/core`; table shapes are `round` or `rectangular` with `width/height` (round uses `width` as diameter).

## Reference docs

- `docs/PRD.md` — product requirements. **Marked "AI Generated Content for reference"**; treat as aspirational scope, not ground truth for what's shipped.
- `docs/supabase.md` — authoritative notes on the schema, RLS policies, triggers, and the Supabase CLI flow.
- `docs/DEVLOG.md` — development log.
