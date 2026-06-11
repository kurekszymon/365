# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm** (see `pnpm-lock.lock`). Scripts are defined in `package.json`:

- `pnpm dev` — Vite dev server on port 3000
- `pnpm run build` — production build
- `pnpm typecheck` — `tsc --noEmit` (use this for type checks; don't invoke `tsc` directly)
- `pnpm test` — `vitest run`. For a single file: `pnpm test path/to/file.test.ts`. For watch mode: `pnpm dlx vitest`
- `pnpm run lint` — ESLint (config: `eslint.config.js`, extends `@tanstack/eslint-config`)
- `pnpm run format` — Prettier

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

1. **Zustand stores** (`src/stores/*.ts`) hold the client state. `planner.store.ts` (tables/guests/hall), `reminders.store.ts`, `global.store.ts` (current `weddingId`), `auth.store.ts`, plus UI stores (`dialog`, `panel`, `view`).
2. **`src/lib/sync/loadWedding.ts`** hydrates the planner/reminders stores from Supabase in one parallel `Promise.all` call, given a wedding id. Called from `src/routes/wedding.$id.tsx` with an `AbortController`.
3. **`src/lib/sync/mutations.ts`** exports per-action functions (`insertTable`, `updateGuestTable`, `upsertHall`, …). Store actions optimistically update Zustand state first, then fire-and-forget the matching mutation (`void insertTable(...)`). The mutations currently only `console.error` on failure — there is no toast/rollback layer, so optimistic state can diverge from the DB on error. Keep this in mind when adding new mutations.

**`updateX` vs `saveX` split:** For tables and fixtures, `updateTable`/`updateFixture` are **local-only** state updates used for live preview while the user edits in the PropertyPanel. `saveTable`/`saveFixture` are the ones that call mutations and persist to Supabase. Do not treat the missing mutation call in `updateX` as a bug — it is by design.

`global.store.ts` holds the current `weddingId`. Mutations read it via `getWeddingId()` to scope inserts; if none is loaded, they no-op with a warning.

### Auth

`src/components/auth/AuthGate.tsx` wraps the root route. It hydrates the Supabase session on mount, subscribes to `onAuthStateChange`, and redirects unauthenticated users to `/login` (allowlist: `PUBLIC_PATHS = ["/login", "/auth/callback"]`). The app renders nothing until `isReady` is true.

### Supabase schema and RLS

Schema lives in `supabase/migrations/` — six tables: `weddings`, `wedding_members`, `halls`, `tables`, `guests`, `reminders`. All tables have RLS enabled; access is gated by `public.is_wedding_member(wedding_id)` and `public.wedding_role(wedding_id)` helper functions (both `security definer` to avoid recursion through `wedding_members`' own policies).

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
- `index.tsx` — wedding list / landing
- `login.tsx`, `auth.callback.tsx` — auth
- `wedding.$id.tsx` — loads a wedding via `loadWedding` and renders `<Planner />`
- `reminders/` — reminders subtree

### Planner (the main feature)

`src/components/planner/` — split into `Canvas/` (dnd-kit drag surface for tables), `Header/`, `PropertyPanel/` (the edit sidebar). `PropertyPanel/fields/` holds reusable field components (e.g. `GuestAssignmentPicker.tsx`). Drag-and-drop uses `@dnd-kit/core`; table shapes are `round` or `rectangular` with `width/height` (round uses `width` as diameter).

### Dialogs

`src/components/dialogs/` holds modal flows, registered centrally: `dialog.store.ts` holds the currently-open dialog id (e.g. `"Guest.Import"`), `DialogManager.tsx` switches on it to render the right dialog, and each subfolder (`guests/`, `planner/`, `weddings/`, plus `shared/` for cross-flow steps) has an `index` barrel. `DialogManager` is mounted once in `Planner.tsx` and `routes/index.tsx`.

**One component per file.** Keep each file to a single component — split multi-step dialogs into an orchestrator plus a file per step/preview. Examples: the guest CSV/XLSX import (`guests/ImportGuestsDialog.tsx` + `GuestImportMappingStep` + `GuestImportSheetPreview` + `GuestImportResultPreview`, with the wizard state machine in `shared/useGuestImportWizard.ts`) and the DXF import (`shared/useDxfImportWizard.ts` + `DxfLayerMappingStep` + `DxfPreviewStep`).

### Guest list import / export

- **Export** (`src/lib/export/guestsCsv.ts`): two modes — `flat` (one header row, one guest per row) and `grouped` (section headings per table, ragged rows). Only **flat** is re-importable; grouped is a human-readable report. CSV is serialized by hand (small RFC-4180 helper), not a library.
- **Import** (`src/lib/import/guestsImport.ts`): parses CSV **and** XLSX via **SheetJS**, which is the unmaintained npm `xlsx` replaced by the maintained CDN tarball (`package.json` → `"xlsx": "https://cdn.sheetjs.com/...tgz"`) and **lazy-loaded** inside `parseGuestFile` (`await import("xlsx")`) so it stays out of the main bundle. The CDN build is CJS, so resolve the API defensively (`mod.read ? mod : mod.default`). `buildGuests` matches table names case/diacritic-insensitively (incl. Polish `ł`) against existing tables, else leaves the guest unassigned — it never creates tables. The wizard expects a simple table with a header row; surface that in the UI rather than a generic "couldn't read" error.

## Reference docs

- `docs/PRD.md` — product requirements. **Marked "AI Generated Content for reference"**; treat as aspirational scope, not ground truth for what's shipped.
- `docs/supabase.md` — authoritative notes on the schema, RLS policies, triggers, and the Supabase CLI flow.
- `docs/DEVLOG.md` — development log.
