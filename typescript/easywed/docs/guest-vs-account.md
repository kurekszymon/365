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

Guest data lives in three `localStorage` keys, all written through
`createLocalGatedStorage()`:

- `easywed.planner.local` - tables, guests, fixtures, halls
- `easywed.global.local` - wedding name and date only
- `easywed.reminders.local` - the reminder list

The gate matters: the planner/global/reminders stores are the **same instances**
used for cloud weddings, so writes are dropped unless the active `weddingId` is
the local sentinel. A signed-in user editing a real wedding never leaks into
these keys.

Supabase writes are skipped the same way - `run()` in
`src/lib/sync/mutations/shared.ts` returns early (reporting success) for a
local wedding, so every mutation becomes a no-op and callers that branch on the
result still behave correctly.

All three stores use `skipHydration: true`; `/wedding/local` resets them and
calls `persist.rehydrate()` explicitly, so a cloud wedding left over from a
client-side nav can't leak into a guest session. `loadWedding.ts` is what fills
the same stores for a signed-in wedding.

Reminders carry two extra wrinkles the planner/global keys don't:

- Their three date fields (`createdAt`, `updatedAt`, `due`) round-trip through
  JSON as strings, so `normalizeLocalRemindersSnapshot` in
  `src/lib/localWedding.ts` revives them on the way back in. It also drops rows
  whose `uuid`/`text`/`status` are missing or malformed, and backfills
  unparsable timestamps with "now" - guest storage is treated as potentially
  corrupted (`Reminder` types `createdAt`/`updatedAt` as non-optional and every
  consumer reads them unguarded).
- The store's persist `merge` and `readLocalRemindersSnapshot` share that one
  normalizer, so the live-hydration path and the migration-read path can't
  drift apart.

## Feature matrix

| Feature                              | Guest | Signed in | Notes                                          |
| ------------------------------------ | :---: | :-------: | ---------------------------------------------- |
| Halls, tables, fixtures, seating     |  ✅   |    ✅     | identical UI, `Planner.tsx`                    |
| Guest list, CSV/XLSX import & export |  ✅   |    ✅     | parsed in-browser either way                   |
| Print / PDF export                   |  ✅   |    ✅     |                                                |
| AI assistant                         |  ✅   |    ✅     | bring-your-own key, settings in `localStorage` |
| Wedding name and date                |  ✅   |    ✅     | guest default: `wedding.default_local_name`    |
| Reminders                            |  ✅   |    ✅     | `easywed.reminders.local`, migrated on sign-in |
| **Inviting members**                 |  ❌   |    ✅     | free-plan gate, see below                      |
| Multiple weddings                    |  ❌   |    ✅     | `/home` list requires auth                     |
| Sync across devices / browsers       |  ❌   |    ✅     |                                                |
| Roles (editor / viewer)              |  ❌   |    ✅     | guest is always owner of the one local wedding |
| Accepting an invite link             |  ❌   |    ✅     | `/invite/$token` calls `requireAuth`           |
| Display name (`/settings`)           |  ❌   |    ✅     | `profiles.display_name`, avatar stack          |
| Leaving a wedding                    |  ❌   |    ✅     | row menu on `/home`, members only              |
| Deleting a wedding                   |  ❌   |    ✅     | row menu on `/home`, owner only                |
| Deleting your account                |  ❌   |    ✅     | `delete_own_account()`; guest data is local    |

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

## Account surface (`/settings`, leaving, deleting)

None of this exists in guest mode, and not as a gate we chose - there is no
account and no server row to act on.

- `/settings` runs `requireAuth("/settings")` in `beforeLoad`. It holds the
  display name form (`profiles.display_name`) and the delete-account section.
- The wedding row menu - **Delete wedding** (owner) and **Leave wedding**
  (member) - lives in the `/home` list, and `home.tsx` returns the "Start
  planning" CTA instead of the list when there is no session. A guest has one
  local wedding, is always its owner, and nobody else can reach it.
- The guest equivalent of deleting your account is clearing the three
  `localStorage` keys; nothing about a guest ever reaches Postgres.
- `delete_own_account()` refuses while the caller owns a wedding someone else
  can access, and points them at the two ways out - remove the members, or
  delete the wedding. Both are in the row menu above, which is why that menu and
  the delete dialog had to ship together.

## Signalling and migration

- `GuestModeBanner` sits above the planner header for local weddings only:
  "your changes are stored on this device", plus a sign-in link.
- `LocalWeddingMigrationPrompt` is mounted at the root and listens for
  Supabase's `SIGNED_IN` event (not `INITIAL_SESSION`, so a returning user is
  not re-prompted). If `hasLocalWeddingData()` is true it opens
  `MigrateLocalWeddingDialog`, which creates a wedding row, pushes the layout
  through `replacePlannerLayout`, then inserts guests and reminders in
  parallel (`insertGuests` / `insertReminders`). Only a layout failure rolls
  the wedding back; a guests/reminders failure keeps the wedding and surfaces
  `guest_mode.migrate.partial_failed` as a toast after navigating.
- Dismissal is remembered in `sessionStorage` (`easywed.guest_migration_dismissed`).

## Adding a new account-only feature

1. Gate on `isLocalWedding(weddingId)`, not on `session` alone - a stale
   session with the local wedding active must still count as guest.
2. Skip the Supabase call entirely rather than letting it fail; the sentinel is
   not a uuid and Postgrest will error.
3. Prefer showing the entry point with a locked state over hiding it, matching
   the members dialog.
4. Add both `en.json` and `pl.json` copy, and update the matrix above.
