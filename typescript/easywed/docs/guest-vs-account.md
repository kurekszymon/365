# Guest mode vs. signed-in - what changes

Reference for what the app shows and does depending on whether the visitor is
signed in. Guest mode is also the **free plan**: anything gated behind an
account is gated behind it because there is no wedding row on the server to
hang it on.

## The two modes

|                    | Guest (not signed in)                          | Signed in                                          |
| ------------------ | ---------------------------------------------- | -------------------------------------------------- |
| Entry point        | `/wedding/local` (landing CTAs, `/home`)       | `/home` → `/wedding/$id/planner`                   |
| `weddingId`        | `"local"` sentinel (`LOCAL_WEDDING_ID`)        | Supabase wedding uuid                              |
| Storage            | `localStorage`, this browser only              | Postgres (Supabase), RLS-scoped                    |
| Role               | always `owner` (forced in `wedding.local.tsx`) | from `wedding_members` (`owner`/`editor`/`viewer`) |
| Number of weddings | exactly one                                    | many                                               |

**How the mode is decided:** `isLocalWedding(weddingId)` in
`src/lib/localWedding.ts`. There is no auth check in the planner itself - the
sentinel id is the single source of truth, and everything downstream branches
on it.

## Routing and guards

- `PUBLIC_PATHS` in `src/components/auth/AuthGate.tsx` lists what renders
  without waiting for session hydration: `/`, `/home`, `/login`,
  `/auth/callback`, `/pl`, `/en`, `/wedding/local`.
- `requireAuth()` (`src/lib/auth/guards.ts`) is what actually redirects. It
  runs in `beforeLoad` of `/wedding/$id` and `/invite/$token`; `/wedding/local`
  deliberately has none.
- `/home` renders for everyone: signed in it lists the user's weddings, signed
  out it offers "Start planning" → `/wedding/local`.

## Persistence

Guest data lives in two `localStorage` keys, both written through
`createLocalGatedStorage()`:

- `easywed.planner.local` - tables, guests, fixtures, halls
- `easywed.global.local` - wedding name and date only

The gate matters: the planner/global stores are the **same instances** used for
cloud weddings, so writes are dropped unless the active `weddingId` is the
local sentinel. A signed-in user editing a real wedding never leaks into these
keys.

Supabase writes are skipped the same way - `run()` in
`src/lib/sync/mutations/shared.ts` returns early (reporting success) for a
local wedding, so every mutation becomes a no-op and callers that branch on the
result still behave correctly.

Not persisted in guest mode: **reminders**. `reminders.store.ts` has no
`persist` middleware and is hydrated from Supabase by `loadWedding.ts`, so a
guest's reminders live in memory for the session and are gone on reload.

## Feature matrix

| Feature                              | Guest | Signed in | Notes                                          |
| ------------------------------------ | :---: | :-------: | ---------------------------------------------- |
| Halls, tables, fixtures, seating     |  ✅   |    ✅     | identical UI, `Planner.tsx`                    |
| Guest list, CSV/XLSX import & export |  ✅   |    ✅     | parsed in-browser either way                   |
| Print / PDF export                   |  ✅   |    ✅     |                                                |
| AI assistant                         |  ✅   |    ✅     | bring-your-own key, settings in `localStorage` |
| Wedding name and date                |  ✅   |    ✅     | guest default: `wedding.default_local_name`    |
| Reminders                            |  ⚠️   |    ✅     | guest: session-only, never saved               |
| **Inviting members**                 |  ❌   |    ✅     | free-plan gate, see below                      |
| Multiple weddings                    |  ❌   |    ✅     | `/home` list requires auth                     |
| Sync across devices / browsers       |  ❌   |    ✅     |                                                |
| Roles (editor / viewer)              |  ❌   |    ✅     | guest is always owner of the one local wedding |
| Accepting an invite link             |  ❌   |    ✅     | `/invite/$token` calls `requireAuth`           |

## The members gate (free plan)

`useWeddingMembers.ts` derives `canInvite = Boolean(session) && !isLocalWedding(weddingId)`
and skips every Supabase call when it is false - the dialog never queries with
the `"local"` sentinel as a wedding id.

- `WeddingMembersDialog` renders `MembersUpgradeNotice` in place of
  `InvitationManager` when `canInvite` is false. `MemberList` stays mounted; it
  renders nothing when empty.
- The header button in `Planner.tsx` is shown to any `owner`, guests included,
  so the feature is discoverable and the upsell has somewhere to live.
- The upgrade path is signing in, not a payment - copy lives under
  `members.locked.*` in `en.json` / `pl.json`.

## Signalling and migration

- `GuestModeBanner` sits above the planner header for local weddings only:
  "your changes are stored on this device", plus a sign-in link.
- `LocalWeddingMigrationPrompt` is mounted at the root and listens for
  Supabase's `SIGNED_IN` event (not `INITIAL_SESSION`, so a returning user is
  not re-prompted). If `hasLocalWeddingData()` is true it opens
  `MigrateLocalWeddingDialog`, which creates a wedding row, pushes the layout
  through `replacePlannerLayout`, then inserts guests. Reminders are not
  migrated - there are none stored to migrate.
- Dismissal is remembered in `sessionStorage` (`easywed.guest_migration_dismissed`).

## Adding a new account-only feature

1. Gate on `isLocalWedding(weddingId)`, not on `session` alone - a stale
   session with the local wedding active must still count as guest.
2. Skip the Supabase call entirely rather than letting it fail; the sentinel is
   not a uuid and Postgrest will error.
3. Prefer showing the entry point with a locked state over hiding it, matching
   the members dialog.
4. Add both `en.json` and `pl.json` copy, and update the matrix above.
