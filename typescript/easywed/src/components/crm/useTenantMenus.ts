import { useCallback, useEffect, useState } from "react"

import type { Dispatch, SetStateAction } from "react"

import type {
  CatalogueMenuCourse,
  CatalogueMenuOption,
  CatalogueMenuPackage,
} from "@/lib/sync/menuCatalogue"
import { byPosition } from "@/lib/menu"
import { fetchMenuCatalogue } from "@/lib/sync/menuCatalogue"
import { supabase } from "@/lib/supabase"
import { track } from "@/lib/analytics/track"
import i18n from "@/i18n"

/** The three tables this screen owns, and the only ones it writes. */
type MenuTable = "menu_packages" | "menu_courses" | "menu_options"

/** Rows as this screen holds them - the shape every catalogue read returns. */
export type CrmMenuPackage = CatalogueMenuPackage
export type CrmMenuCourse = CatalogueMenuCourse
export type CrmMenuOption = CatalogueMenuOption

/**
 * Applies a persisted order to the local rows.
 *
 * Two halves, and the second is the one that is easy to leave out: the
 * positions are renumbered 1..n to match what `with ordinality` wrote
 * server-side, **and the array is re-sorted**. Every consumer renders in array
 * order - `CrmMenuPackageEditor` does `menus.courses.filter(...)`, and a filter
 * preserves the order it was given - so patching `position` alone persists the
 * reorder and shows nothing. Staff click ▲, the row does not move, they click
 * again, and the list ends up two places from where it looked.
 *
 * Sorts with `byPosition`, the same comparator the reads order by, so the local
 * order after a move is identical to the order the next load produces rather
 * than merely similar.
 */
const applyOrder = <T extends { id: string; position: number }>(
  list: Array<T>,
  ids: Array<string>
): Array<T> =>
  list
    .map((row) => {
      const at = ids.indexOf(row.id)
      return at === -1 ? row : { ...row, position: at + 1 }
    })
    .sort(byPosition)

/**
 * Undoing an optimistic edit, one row at a time.
 *
 * All three take the *current* list and change the one thing this write
 * touched, rather than reinstating an array captured before the round trip.
 * The snapshot version was the easy way to write it and quietly wrong: a menu
 * editor is a screen of small independent writes, so between the optimistic
 * edit and the refusal a staff member has typically renamed a dish, added
 * another, or toggled an archive - and putting the old array back threw all of
 * it away to undo one field. The same rule the planner's stores follow when a
 * write is refused mid-edit.
 */
const withoutRow = <T extends { id: string }>(
  list: Array<T>,
  id: string
): Array<T> => list.filter((row) => row.id !== id)

const withRows = <T extends { id: string; position: number }>(
  list: Array<T>,
  rows: Array<T>
): Array<T> =>
  [
    ...list,
    // Only the ones that are actually gone. A row somebody re-created in the
    // meantime keeps its newer version rather than being duplicated.
    ...rows.filter((row) => !list.some((item) => item.id === row.id)),
  ].sort(byPosition)

/**
 * Put back exactly the fields this write tried to change, and no others - so a
 * refused rename does not also revert an archive toggled while it was in
 * flight.
 */
const revertPatch = <T extends { id: string }>(
  list: Array<T>,
  id: string,
  before: T | undefined,
  patch: Partial<T>
): Array<T> => {
  if (!before) return list
  const keys = Object.keys(patch) as Array<keyof T>

  return list.map((row) =>
    row.id === id
      ? keys.reduce((acc, key) => ({ ...acc, [key]: before[key] }), row)
      : row
  )
}

/**
 * The sibling ids after moving one row by `delta`, or null when it cannot move.
 *
 * Pure, and separate from the write, so the new order can be shown before the
 * RPC is asked to persist it.
 */
const reorderedIds = <T extends { id: string }>(
  siblings: Array<T>,
  id: string,
  delta: -1 | 1
): Array<string> | null => {
  const index = siblings.findIndex((row) => row.id === id)
  const target = index + delta
  if (index === -1 || target < 0 || target >= siblings.length) return null

  const ids = siblings.map((row) => row.id)
  ;[ids[index], ids[target]] = [ids[target], ids[index]]
  return ids
}

/**
 * The refusal that arrives with nothing in it.
 *
 * An UPDATE or DELETE that RLS filters to nothing is a clean 204 - no error, no
 * rows - so there is no error object to log and the console would otherwise say
 * a bare `null` where the SQLSTATE and the constraint name should have been. A
 * string, because that is genuinely all that is known.
 */
const NO_ROWS = "no rows matched - RLS refused it, or the row is already gone"

/**
 * Everything the menu editor needs, and every Supabase call it makes.
 *
 * Modelled on `useTenantRoster` deliberately, down to the abort handling and
 * the restore-on-failure edits: the two screens are the same screen for two
 * different tables, and keeping the shapes aligned is what stops this one from
 * quietly inventing a laxer rule.
 *
 * ## Why these are direct `supabase` calls and not `run()`
 *
 * `run()` in `sync/mutations/shared.ts` is the contract for every write in the
 * *wedding* tree, and it must not be used here. It short-circuits to `false`
 * when `selectCanEdit(useGlobalStore.getState())` is false - and in the CRM no
 * wedding is loaded, so `role` is `undefined`, `selectCanEdit` fails closed,
 * and every write would be refused with a console warning and no toast at all.
 * It also short-circuits to `true` for the local wedding id, which is
 * meaningless here. `src/lib/sync/venue.ts` stands outside `run()` for exactly
 * the same reason.
 *
 * What replaces it is `insertRow` / `patchRow` / `deleteRow` below: optimistic
 * state change, direct write, and on a refusal undo *that row* - see
 * `withoutRow` / `withRows` / `revertPatch` - rather than reinstating an array
 * captured before the round trip.
 *
 * The read is not here at all: it is `fetchMenuCatalogue`, shared with the
 * couple's Menu tab, which asks the same three tables the same questions.
 */
export function useTenantMenus(tenantId: string | undefined) {
  const [packages, setPackages] = useState<Array<CrmMenuPackage>>([])
  const [courses, setCourses] = useState<Array<CrmMenuCourse>>([])
  const [options, setOptions] = useState<Array<CrmMenuOption>>([])
  const [currency, setCurrency] = useState("PLN")
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /**
   * How many writes are in flight, not whether one is.
   *
   * A counter because these overlap: blurring a name while a dish delete is
   * still going is ordinary use, and a boolean would have the first write to
   * finish declare the screen idle while the second is still out. Exposed as
   * the boolean `saving` - callers only ever ask the yes/no question.
   */
  const [writesInFlight, setWritesInFlight] = useState(0)

  /**
   * Read the catalogue into local state.
   *
   * The read itself is `fetchMenuCatalogue`, shared with the couple's Menu tab:
   * the two screens ask the same four questions of the same three tables and
   * differ only in where the rows land and how a failure is announced. What
   * stays here is that second half - the error banner, `loaded`, and the
   * currency.
   */
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      if (!tenantId) return

      const result = await fetchMenuCatalogue(
        tenantId,
        signal ?? new AbortController().signal
      )
      // Navigating away mid-fetch is not a failure to render, and an aborted
      // PostgREST request arrives as an error *result* - so this case is its
      // own, and it leaves `loaded` alone.
      if (result.status === "aborted") return

      if (result.status === "failed") {
        console.error("[crm] menu load failed", result.errors)
        setError(i18n.t("crm.menus.load_failed"))
        setLoaded(true)
        return
      }

      setError(null)
      setCurrency(result.catalogue.currency)
      setPackages(result.catalogue.packages)
      setCourses(result.catalogue.courses)
      setOptions(result.catalogue.options)
      setLoaded(true)
    },
    [tenantId]
  )

  useEffect(() => {
    if (!tenantId) return

    // Everything from the previous tenant goes first. `loaded` stays true
    // between tenants otherwise, so the screen renders one venue's packages
    // under another venue's name until the fetch lands - and staff who switch
    // venues are staff who are about to edit the wrong catalogue.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoaded(false)
    setPackages([])
    setCourses([])
    setOptions([])
    setError(null)

    const controller = new AbortController()
    // refresh() only setState()s after awaiting the fetch - a legitimate
    // external-data sync, not a synchronous cascading render.
    void refresh(controller.signal)
    return () => controller.abort()
  }, [tenantId, refresh])

  /**
   * Report a refused write.
   *
   * `cause` is the PostgrestError the helpers below now hand back rather than
   * swallow. It used to be null at every call site, so the console logged
   * `[crm] save option failed null` - the message, the constraint name and the
   * SQLSTATE all thrown away at the one moment somebody needs them.
   */
  const fail = useCallback((scope: string, cause: unknown, key: string) => {
    console.error(`[crm] ${scope}`, cause)
    setError(i18n.t(key))
  }, [])

  /**
   * Wrap one write: count it in, clear the last failure, count it out.
   *
   * The `setError(null)` is here rather than on success, matching
   * `useTenantRoster`: a stale red banner belongs to the action that produced
   * it, and the next action is the moment it stops being true. Clearing only on
   * success would leave one transient failure on screen for the rest of the
   * session, which is what this replaces.
   */
  const tracked = useCallback(
    async <T>(write: () => Promise<T>): Promise<T> => {
      setWritesInFlight((n) => n + 1)
      setError(null)
      try {
        return await write()
      } finally {
        setWritesInFlight((n) => n - 1)
      }
    },
    []
  )

  /**
   * The three write primitives, parameterized by table.
   *
   * Each one is a whole gesture rather than a bare request: apply the optimistic
   * change, write it, and on a refusal put back the one row the write touched
   * and say so. Written once here instead of three times over in the trios
   * below, where a rule fixed in one copy stayed broken in the other two.
   *
   * The `as never` casts are the price of the parameterization: supabase-js
   * resolves the payload type from the literal table name, and a union of three
   * collapses the accepted shape to `never`. The columns are still checked - by
   * the CHECK constraints, and by the callers, which build every payload from a
   * typed row.
   *
   * Every mutating call asks for `.select("id")` back, because an UPDATE or
   * DELETE that RLS filters to nothing is a clean 204 - no error, no rows - and
   * treating that as success would leave the screen showing an edit the
   * database refused.
   *
   * They return whether the write took, for the two callers that have something
   * further to do with the answer.
   */
  const insertRow = useCallback(
    async <T extends { id: string }>(
      table: MenuTable,
      setList: Dispatch<SetStateAction<Array<T>>>,
      row: T,
      payload: Record<string, unknown>,
      scope: string
    ): Promise<boolean> => {
      setList((list) => [...list, row])

      const { error: insertError } = await tracked(
        async () => await supabase.from(table).insert(payload as never)
      )
      if (insertError) {
        setList((list) => withoutRow(list, row.id))
        fail(`create ${scope} failed`, insertError, "crm.menus.save_failed")
        return false
      }

      return true
    },
    [tracked, fail]
  )

  const patchRow = useCallback(
    async <T extends { id: string }>(
      table: MenuTable,
      list: Array<T>,
      setList: Dispatch<SetStateAction<Array<T>>>,
      id: string,
      patch: Partial<T>,
      scope: string
    ): Promise<boolean> => {
      const before = list.find((row) => row.id === id)
      setList((rows) =>
        rows.map((row) => (row.id === id ? { ...row, ...patch } : row))
      )

      const { data, error: patchError } = await tracked(
        async () =>
          await supabase
            .from(table)
            .update(patch as never)
            .eq("id", id)
            .select("id")
      )
      // `data` is only read once `patchError` is known null, which is the only
      // state PostgREST guarantees it in.
      if (patchError || data.length === 0) {
        setList((rows) => revertPatch(rows, id, before, patch))
        fail(
          `save ${scope} failed`,
          patchError ?? NO_ROWS,
          "crm.menus.save_failed"
        )
        return false
      }

      return true
    },
    [tracked, fail]
  )

  /**
   * The one write that has to say *why* it failed, and the one whose optimistic
   * change is not a single row - so it takes the removal and its undo as
   * closures: a package drops its courses and their dishes with it.
   *
   * The three FKs the wedding tree points at this catalogue are
   * `on delete restrict` (20260822000002 section 1), so "a couple has ordered
   * this" is a routine outcome of the delete button rather than a fault, and
   * `delete_failed` - "please try again" - is the wrong thing to say about it:
   * trying again cannot work, and archiving is what the staff member wants.
   * `23503` is `foreign_key_violation`; it arrives for a package too, because
   * the delete cascades down to the options and the restrict fires there.
   */
  const deleteRow = useCallback(
    async (
      table: MenuTable,
      id: string,
      scope: string,
      inUseKey: string,
      remove: () => void,
      restore: () => void
    ): Promise<boolean> => {
      remove()

      const { data, error: deleteError } = await tracked(
        async () =>
          await supabase.from(table).delete().eq("id", id).select("id")
      )
      if (deleteError || data.length === 0) {
        restore()
        fail(
          `delete ${scope} failed`,
          deleteError ?? NO_ROWS,
          deleteError?.code === "23503" ? inUseKey : "crm.menus.delete_failed"
        )
        return false
      }

      return true
    },
    [tracked, fail]
  )

  // ---------------------------------------------------------------------
  // Packages
  // ---------------------------------------------------------------------
  const createPackage = useCallback(
    async (name: string): Promise<string | null> => {
      if (!tenantId) return null

      // The id is minted here rather than read back, so the optimistic row is
      // the real row - the same thing planner.store does for every entity.
      // `created_at` is the local guess at what the database will stamp; it is
      // only ever used as a sort tiebreaker, and the next load corrects it.
      //
      // `position` is read off the render's list, so two adds in the same tick
      // can land on the same number. Deliberately not chased: the column is
      // non-unique by design and every read orders `position, created_at, id`,
      // so a tie costs an arbitrary but *stable* order and nothing else (see
      // 20260822000001). Threading an exact position out of a setState updater
      // would be a second source of truth for a number the next reorder
      // rewrites anyway.
      const row: CrmMenuPackage = {
        id: crypto.randomUUID(),
        name,
        description: null,
        price_per_person_minor: 0,
        position: packages.length + 1,
        archived_at: null,
        created_at: new Date().toISOString(),
      }

      const ok = await insertRow(
        "menu_packages",
        setPackages,
        row,
        {
          id: row.id,
          tenant_id: tenantId,
          name: row.name,
          position: row.position,
        },
        "package"
      )

      return ok ? row.id : null
    },
    [tenantId, packages, insertRow]
  )

  const savePackage = useCallback(
    async (id: string, patch: Partial<CrmMenuPackage>) => {
      const ok = await patchRow(
        "menu_packages",
        packages,
        setPackages,
        id,
        patch,
        "package"
      )
      if (!ok) return

      // Counts only. The package's *name* is a string the venue typed, and
      // `AnalyticsEvents` is closed precisely so nothing like it can reach
      // PostHog; the venue itself is attributed with a PostHog group.
      const courseRows = courses.filter((c) => c.menu_package_id === id)
      const courseIds = new Set(courseRows.map((c) => c.id))
      track("menu_package_saved", {
        course_count: courseRows.length,
        option_count: options.filter((o) => courseIds.has(o.menu_course_id))
          .length,
        per_guest_courses: courseRows.filter((c) => c.per_guest_choice).length,
      })
    },
    [packages, courses, options, patchRow]
  )

  const deletePackage = useCallback(
    async (id: string) => {
      const courseIds = new Set(
        courses.filter((c) => c.menu_package_id === id).map((c) => c.id)
      )
      // Captured to be put back one row at a time if the delete is refused -
      // "a couple has ordered this" is a routine outcome here, not a fault.
      const removed = {
        packages: packages.filter((p) => p.id === id),
        courses: courses.filter((c) => c.menu_package_id === id),
        options: options.filter((o) => courseIds.has(o.menu_course_id)),
      }

      await deleteRow(
        "menu_packages",
        id,
        "package",
        "crm.menus.delete_package_in_use",
        () => {
          // The FK cascade removes the children in the database; the optimistic
          // state has to do the same or the screen keeps rendering orphans.
          setPackages((list) => list.filter((row) => row.id !== id))
          setCourses((list) => list.filter((row) => row.menu_package_id !== id))
          // `menu_course_id`, not `id` - an option is dropped because of the
          // course it belongs to, not because it happens to share an id with
          // one.
          setOptions((list) =>
            list.filter((row) => !courseIds.has(row.menu_course_id))
          )
        },
        () => {
          setPackages((list) => withRows(list, removed.packages))
          setCourses((list) => withRows(list, removed.courses))
          setOptions((list) => withRows(list, removed.options))
        }
      )
    },
    [packages, courses, options, deleteRow]
  )

  // ---------------------------------------------------------------------
  // Courses
  // ---------------------------------------------------------------------
  const createCourse = useCallback(
    async (packageId: string, name: string) => {
      if (!tenantId) return

      const siblings = courses.filter((c) => c.menu_package_id === packageId)
      const row: CrmMenuCourse = {
        id: crypto.randomUUID(),
        menu_package_id: packageId,
        name,
        choose_count: 1,
        serving_note: null,
        per_guest_choice: false,
        position: siblings.length + 1,
        archived_at: null,
        created_at: new Date().toISOString(),
      }

      await insertRow(
        "menu_courses",
        setCourses,
        row,
        {
          id: row.id,
          tenant_id: tenantId,
          menu_package_id: row.menu_package_id,
          name: row.name,
          position: row.position,
        },
        "course"
      )
    },
    [tenantId, courses, insertRow]
  )

  const saveCourse = useCallback(
    async (id: string, patch: Partial<CrmMenuCourse>) => {
      await patchRow("menu_courses", courses, setCourses, id, patch, "course")
    },
    [courses, patchRow]
  )

  const deleteCourse = useCallback(
    async (id: string) => {
      const removed = {
        courses: courses.filter((c) => c.id === id),
        options: options.filter((o) => o.menu_course_id === id),
      }

      await deleteRow(
        "menu_courses",
        id,
        "course",
        "crm.menus.delete_course_in_use",
        () => {
          setCourses((list) => list.filter((row) => row.id !== id))
          setOptions((list) => list.filter((row) => row.menu_course_id !== id))
        },
        () => {
          setCourses((list) => withRows(list, removed.courses))
          setOptions((list) => withRows(list, removed.options))
        }
      )
    },
    [courses, options, deleteRow]
  )

  // ---------------------------------------------------------------------
  // Options
  // ---------------------------------------------------------------------
  const createOption = useCallback(
    async (courseId: string, name: string) => {
      if (!tenantId) return

      const siblings = options.filter((o) => o.menu_course_id === courseId)
      const row: CrmMenuOption = {
        id: crypto.randomUUID(),
        menu_course_id: courseId,
        name,
        note: null,
        position: siblings.length + 1,
        archived_at: null,
        created_at: new Date().toISOString(),
      }

      await insertRow(
        "menu_options",
        setOptions,
        row,
        {
          id: row.id,
          tenant_id: tenantId,
          menu_course_id: row.menu_course_id,
          name: row.name,
          position: row.position,
        },
        "option"
      )
    },
    [tenantId, options, insertRow]
  )

  const saveOption = useCallback(
    async (id: string, patch: Partial<CrmMenuOption>) => {
      await patchRow("menu_options", options, setOptions, id, patch, "option")
    },
    [options, patchRow]
  )

  const deleteOption = useCallback(
    async (id: string) => {
      const removed = options.filter((o) => o.id === id)

      await deleteRow(
        "menu_options",
        id,
        "option",
        "crm.menus.delete_dish_in_use",
        () => setOptions((list) => list.filter((row) => row.id !== id)),
        () => setOptions((list) => withRows(list, removed))
      )
    },
    [options, deleteRow]
  )

  // ---------------------------------------------------------------------
  // Reordering
  // ---------------------------------------------------------------------
  /**
   * Persist a whole sibling order in one RPC.
   *
   * One statement per gesture rather than two UPDATEs, which is the point of
   * `reorder_menu_courses` / `reorder_menu_options`: a dropped connection
   * between two writes leaves a list with two rows claiming the same position.
   *
   * The RPCs are invoker-rights, so a caller who is not staff of the owning
   * tenant renumbers nothing and gets no error for it. That is not a case this
   * screen can produce - the /crm shell has already established staff before
   * any of this renders - and the honest statement of the limit is that such a
   * call would leave the moved row where the optimistic update put it until the
   * next load.
   */
  const persistOrder = useCallback(
    async (
      rpc: "reorder_menu_courses" | "reorder_menu_options",
      scopeKey: "p_menu_package_id" | "p_course_id",
      scopeId: string,
      ids: Array<string>,
      scope: string
    ): Promise<boolean> => {
      // `async () => await` rather than passing the builder straight through:
      // supabase-js returns a thenable, not a Promise, and `tracked` needs
      // something with a `finally` to decrement on.
      const { error: rpcError } = await tracked(
        async () =>
          await supabase.rpc(rpc, {
            [scopeKey]: scopeId,
            p_ids: ids,
          } as never)
      )
      if (rpcError) {
        fail(`reorder ${scope} failed`, rpcError, "crm.menus.save_failed")
        return false
      }

      return true
    },
    [tracked, fail]
  )

  /**
   * Move one row among its siblings.
   *
   * The new order is applied **before** the RPC, not after it. Waiting for the
   * round trip meant clicking ▲ did nothing visible for as long as the network
   * took, which is exactly what teaches somebody to click it again - and the
   * second click was computed from a sibling list that had not moved yet, so
   * the two gestures fought over the same pair of positions.
   *
   * On a refusal the original order goes back the same way, through
   * `applyOrder` over the ids as they were, so nothing else on the screen is
   * disturbed.
   */
  const moveCourse = useCallback(
    async (packageId: string, id: string, delta: -1 | 1) => {
      const siblings = courses.filter((c) => c.menu_package_id === packageId)
      const before = siblings.map((c) => c.id)
      const ids = reorderedIds(siblings, id, delta)
      // Already at the end of its list, or gone. Not a failure.
      if (!ids) return

      setCourses((list) => applyOrder(list, ids))

      const ok = await persistOrder(
        "reorder_menu_courses",
        "p_menu_package_id",
        packageId,
        ids,
        "courses"
      )
      if (!ok) setCourses((list) => applyOrder(list, before))
    },
    [courses, persistOrder]
  )

  const moveOption = useCallback(
    async (courseId: string, id: string, delta: -1 | 1) => {
      const siblings = options.filter((o) => o.menu_course_id === courseId)
      const before = siblings.map((o) => o.id)
      const ids = reorderedIds(siblings, id, delta)
      if (!ids) return

      setOptions((list) => applyOrder(list, ids))

      const ok = await persistOrder(
        "reorder_menu_options",
        "p_course_id",
        courseId,
        ids,
        "options"
      )
      if (!ok) setOptions((list) => applyOrder(list, before))
    },
    [options, persistOrder]
  )

  return {
    loaded,
    error,
    /** True while any write is out. Gates the destructive buttons. */
    saving: writesInFlight > 0,
    /**
     * Re-read the catalogue.
     *
     * Returned so the error banner can offer a retry. Without it a failed load
     * was terminal for the screen: the message sat there and the only way back
     * was a full page reload, which is not something a staff member should have
     * to work out for themselves.
     */
    refresh,
    currency,
    packages,
    courses,
    options,
    createPackage,
    savePackage,
    deletePackage,
    createCourse,
    saveCourse,
    deleteCourse,
    createOption,
    saveOption,
    deleteOption,
    moveCourse,
    moveOption,
  }
}
