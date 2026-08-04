import type {
  LocalGlobalSnapshot,
  LocalPlannerSnapshot,
} from "@/lib/localWedding"
import type { Reminder } from "@/stores/reminders.store"
import type { Fixture, Guest, Hall, Table } from "@/stores/planner.store"
import { supabase } from "@/lib/supabase"
import {
  insertGuests,
  insertReminders,
  replacePlannerLayout,
} from "@/lib/sync/mutations"
import { deleteWedding } from "@/lib/sync/weddings"
import { clearLocalWeddingStorage } from "@/lib/localWedding"
import { useGlobalStore } from "@/stores/global.store"

/**
 * The writes the migration is made of, injected so the commit sequence below
 * can be exercised without a Supabase round trip. `supabaseWrites` is the real
 * implementation and the default - nothing but the tests should pass this.
 */
export interface MigrationWrites {
  createWedding: (input: {
    ownerId: string
    name: string
    date: string | null
  }) => Promise<string | null>
  writeLayout: (
    halls: Array<Hall>,
    tables: Array<Table>,
    fixtures: Array<Fixture>
  ) => Promise<boolean>
  writeGuests: (guests: Array<Guest>) => Promise<boolean>
  writeReminders: (reminders: Array<Reminder>) => Promise<boolean>
  discardWedding: (weddingId: string) => Promise<boolean>
}

export const supabaseWrites: MigrationWrites = {
  createWedding: async ({ ownerId, name, date }) => {
    const { data, error } = await supabase
      .from("weddings")
      .insert({ owner_id: ownerId, name, date })
      .select("id")
      .single()

    if (error) {
      console.error("[guest-mode] failed to create wedding", error)
      return null
    }
    return data.id
  },
  writeLayout: replacePlannerLayout,
  writeGuests: insertGuests,
  writeReminders: insertReminders,
  // deleteWedding rather than a bare delete: it carries the 0-rows-is-not-
  // success check this path needs just as much as the wedding list does.
  discardWedding: async (weddingId) => {
    const { error } = await deleteWedding(weddingId)
    return error === null
  },
}

// `date` comes from localStorage, which readLocalGlobalSnapshot already filters
// for unparsable strings - re-checked here because guest-mode data is treated
// as potentially corrupted throughout, and toISOString() throws on an Invalid
// Date.
const toDateColumn = (date: Date | undefined): string | null =>
  date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : null

// Every write maps its store rows synchronously before it awaits anything, so a
// malformed locally-persisted row (a table with no `size`, a reminder whose
// `createdAt` isn't a Date) throws rather than resolving false. Both failures
// have to reach the rollback below, so they collapse into the same boolean.
const attempt = async (
  label: string,
  write: () => Promise<boolean>
): Promise<boolean> => {
  try {
    return await write()
  } catch (err) {
    console.error(`[guest-mode] failed to migrate ${label}`, err)
    return false
  }
}

const attemptCreate = async (
  create: () => Promise<string | null>
): Promise<string | null> => {
  try {
    return await create()
  } catch (err) {
    console.error("[guest-mode] failed to create wedding", err)
    return null
  }
}

export type MigrateResult = { ok: true; weddingId: string } | { ok: false }

export interface MigrateInput {
  ownerId: string
  planner: LocalPlannerSnapshot
  global: LocalGlobalSnapshot
  reminders: Array<Reminder>
  // The dialog's `t("wedding")`, passed in rather than resolved here so this
  // stays deterministic under test.
  fallbackName: string
}

/**
 * Adopts the device-local guest wedding into the signed-in user's account.
 *
 * All or nothing. Layout, guests and reminders are three separate writes (only
 * the layout has an atomic RPC), so a partial failure is reachable - and the
 * local snapshot is the only other copy of any of it. Any failure therefore
 * rolls the new wedding back and leaves localStorage untouched, so the dialog's
 * "try again" re-runs the whole thing from the same source instead of stacking
 * up a second wedding.
 *
 * That reverses the earlier "the layout is real and worth keeping" stance,
 * which paid for a successful layout write with the guest list - not a trade
 * the user was ever offered. Re-doing a discarded layout costs one round trip;
 * a discarded guest list is typed back in by hand.
 *
 * localStorage is cleared only once every write has landed.
 */
export const migrateLocalWedding = async (
  input: MigrateInput,
  writes: MigrationWrites = supabaseWrites
): Promise<MigrateResult> => {
  const weddingId = await attemptCreate(() =>
    writes.createWedding({
      ownerId: input.ownerId,
      name: input.global.name?.trim() || input.fallbackName,
      date: toDateColumn(input.global.date),
    })
  )

  // Nothing was written and nothing was cleared, so there is no rollback to do.
  if (!weddingId) return { ok: false }

  // Every write below scopes itself with getWeddingId(), so the new wedding has
  // to be the active one before any of them run. Snapshot the whole slice
  // rather than just the id: discardWedding() clears name/date/role/members too
  // when it deletes the active wedding (forgetIfCurrent), and the rollback path
  // leaves the user sitting in guest mode where those still drive the header.
  const previous = useGlobalStore.getState()
  const restore = {
    weddingId: previous.weddingId,
    name: previous.name,
    date: previous.date,
    role: previous.role,
    members: previous.members,
  }
  // `role` goes with the id, and not just for tidiness: run() refuses every
  // write unless selectCanEdit passes, and it fails closed on an unset role.
  // Nothing sets one here - loadWedding and wedding.local.tsx are the only two
  // writers, and neither has run when the prompt fires after an OAuth round
  // trip (the page reloaded into /auth/callback, and `partialize` doesn't
  // persist role). Without this, every write below is blocked, the migration
  // rolls back a wedding that was created fine, and the user is told it failed.
  // "owner" is true by construction: createWedding just set owner_id to this
  // user, and the trigger on `weddings` inserts their `owner` membership row.
  useGlobalStore.setState({ weddingId, role: "owner" })

  const rollback = async (): Promise<MigrateResult> => {
    const discarded = await attempt("rollback", () =>
      writes.discardWedding(weddingId)
    )
    if (!discarded) {
      // The wedding survived its own rollback. Nothing is lost - localStorage is
      // still intact - but the next attempt creates a second wedding alongside
      // this orphan, which the user can remove from the wedding list.
      console.error("[guest-mode] failed to roll back wedding", { weddingId })
    }
    useGlobalStore.setState(restore)
    return { ok: false }
  }

  // A hall-less snapshot has no layout to migrate - skip straight to guests.
  // (readLocalPlannerSnapshot already normalized legacy single-hall payloads to
  // the multi-hall shape.)
  const layoutOk =
    input.planner.halls.length === 0 ||
    (await attempt("layout", () =>
      writes.writeLayout(
        input.planner.halls,
        input.planner.tables,
        input.planner.fixtures
      )
    ))

  if (!layoutOk) return rollback()

  // Independent of each other, so they go together. Both are awaited before the
  // rollback decision - firing one and abandoning the other on failure would
  // leave a write in flight against a wedding we are about to delete.
  const [guestsOk, remindersOk] = await Promise.all([
    attempt("guests", () => writes.writeGuests(input.planner.guests)),
    attempt("reminders", () => writes.writeReminders(input.reminders)),
  ])

  if (!guestsOk || !remindersOk) return rollback()

  // Every write landed - the only point at which the local copy is redundant,
  // and so the only point at which it may be dropped.
  clearLocalWeddingStorage()
  return { ok: true, weddingId }
}
