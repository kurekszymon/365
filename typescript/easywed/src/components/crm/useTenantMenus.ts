import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import type { Dispatch, SetStateAction } from "react"

import type {
  CatalogueMenuCourse,
  CatalogueMenuOption,
  CatalogueMenuPackage,
} from "@/lib/sync/menuCatalogue"
import { byPosition, coursesOf, optionsOf } from "@/lib/menu"
import { DEFAULT_CURRENCY } from "@/lib/money"
import { fetchMenuCatalogue } from "@/lib/sync/menuCatalogue"
import { supabase } from "@/lib/supabase"
import { track } from "@/lib/analytics/track"

/** The three tables this screen owns, and the only ones it writes. */
type MenuTable = "menu_packages" | "menu_courses" | "menu_options"

/** Rows as this screen holds them - the shape every catalogue read returns. */
export type CrmMenuPackage = CatalogueMenuPackage
export type CrmMenuCourse = CatalogueMenuCourse
export type CrmMenuOption = CatalogueMenuOption

/**
 * Applies a persisted order to the local rows: renumber 1..n to match what
 * `with ordinality` wrote server-side, **and re-sort the array**. Every consumer
 * renders in array order, so patching `position` alone persists the reorder and
 * shows nothing. Sorts with `byPosition`, the comparator the reads order by, so
 * the local order matches the next load's exactly.
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
 * Undoing an optimistic edit, one row at a time: take the *current* list and
 * change the one thing this write touched, rather than reinstating an array
 * captured before the round trip. This is a screen of small independent writes,
 * so a snapshot restore would throw away every other edit made in flight.
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
    // Only the ones actually gone, so a row re-created in the meantime keeps its
    // newer version rather than being duplicated.
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
 * Pure and separate from the write, so the new order can be shown before the RPC
 * is asked to persist it.
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
 * The refusal that arrives with nothing in it: an UPDATE or DELETE RLS filters
 * to nothing is a clean 204, so there is no error object and the console would
 * otherwise log a bare `null` where the SQLSTATE should be.
 */
const NO_ROWS = "no rows matched - RLS refused it, or the row is already gone"

/**
 * Everything the menu editor needs, and every Supabase call it makes. Modelled
 * on `useTenantRoster`, down to the abort handling and the restore-on-failure
 * edits.
 *
 * These are direct `supabase` calls and **not** `run()`: that contract
 * short-circuits to `false` when `selectCanEdit` is false, and in the CRM no
 * wedding is loaded, so `role` is `undefined` and every write would be refused
 * with a console warning and no toast. `src/lib/sync/venue.ts` stands outside
 * `run()` for the same reason. `insertRow` / `patchRow` / `deleteRow` replace it.
 *
 * The read is `fetchMenuCatalogue`, shared with the couple's Menu tab.
 */
export function useTenantMenus(tenantId: string | undefined) {
  const { t } = useTranslation()
  const [packages, setPackages] = useState<Array<CrmMenuPackage>>([])
  const [courses, setCourses] = useState<Array<CrmMenuCourse>>([])
  const [options, setOptions] = useState<Array<CrmMenuOption>>([])
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY)
  const [loaded, setLoaded] = useState(false)
  /**
   * The *key* of the current failure, not its sentence: state outlives a
   * language switch, so translating at the point of failure would freeze the
   * banner in whichever language was current when the write was refused.
   */
  const [errorKey, setErrorKey] = useState<string | null>(null)
  /**
   * How many writes are in flight, not whether one is: they overlap, and a
   * boolean would let the first to finish declare the screen idle while the
   * second is still out. Exposed as the boolean `saving`.
   */
  const [writesInFlight, setWritesInFlight] = useState(0)

  /**
   * Read the catalogue into local state. The read is `fetchMenuCatalogue`,
   * shared with the couple's Menu tab; what stays here is where the rows land
   * and how a failure is announced - the error banner, `loaded`, the currency.
   */
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      if (!tenantId) return

      const result = await fetchMenuCatalogue(
        tenantId,
        signal ?? new AbortController().signal
      )
      // An aborted PostgREST request arrives as an error *result*, and
      // navigating away mid-fetch is not a failure to render, so this case is
      // its own and leaves `loaded` alone.
      if (result.status === "aborted") return

      if (result.status === "failed") {
        console.error("[crm] menu load failed", result.errors)
        setErrorKey("crm.menus.load_failed")
        setLoaded(true)
        return
      }

      setErrorKey(null)
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

    // Everything from the previous tenant goes first: `loaded` stays true
    // between tenants otherwise, so the screen renders one venue's packages
    // under another venue's name until the fetch lands.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoaded(false)
    setPackages([])
    setCourses([])
    setOptions([])
    setErrorKey(null)

    const controller = new AbortController()
    // refresh() only setState()s after awaiting the fetch - a legitimate
    // external-data sync, not a synchronous cascading render.
    void refresh(controller.signal)
    return () => controller.abort()
  }, [tenantId, refresh])

  /**
   * Report a refused write. `cause` is the PostgrestError the helpers below hand
   * back rather than swallow, so the console gets the message, the constraint
   * name and the SQLSTATE.
   */
  const fail = useCallback((scope: string, cause: unknown, key: string) => {
    console.error(`[crm] ${scope}`, cause)
    setErrorKey(key)
  }, [])

  /**
   * Wrap one write: count it in, clear the last failure, count it out.
   * `setErrorKey(null)` is here rather than on success, matching
   * `useTenantRoster` - a stale banner belongs to the action that produced it,
   * and clearing only on success would leave one transient failure on screen for
   * the rest of the session.
   */
  const tracked = useCallback(
    async <T>(write: () => Promise<T>): Promise<T> => {
      setWritesInFlight((n) => n + 1)
      setErrorKey(null)
      try {
        return await write()
      } finally {
        setWritesInFlight((n) => n - 1)
      }
    },
    []
  )

  /**
   * The three write primitives, parameterized by table. Each is a whole gesture:
   * apply the optimistic change, write it, and on a refusal put back the one row
   * it touched and say so. Returns whether the write took.
   *
   * The `as never` casts are the price of the parameterization - supabase-js
   * resolves the payload type from the literal table name, and a union of three
   * collapses it to `never`. The columns are still checked by the CHECK
   * constraints and by callers, which build every payload from a typed row.
   *
   * Every mutating call asks for `.select("id")` back: an UPDATE or DELETE RLS
   * filters to nothing is a clean 204, and treating that as success would leave
   * the screen showing an edit the database refused.
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
      // `data` is only read once `patchError` is known null - the only state
      // PostgREST guarantees it in.
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
   * The one write that has to say *why* it failed, and whose optimistic change
   * is not a single row - so it takes the removal and its undo as closures: a
   * package drops its courses and their dishes with it.
   *
   * The wedding tree's three FKs into this catalogue are `on delete restrict`
   * (20260822000002 section 1), so "a couple has ordered this" is a routine
   * outcome rather than a fault, and `delete_failed` ("please try again") is the
   * wrong thing to say: trying again cannot work, and archiving is what the
   * staff member wants. `23503` arrives for a package too - the delete cascades
   * to the options and the restrict fires there.
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
      // the real row - what planner.store does for every entity. `created_at` is
      // a local guess at what the database will stamp, used only as a sort
      // tiebreaker and corrected by the next load.
      //
      // `position` is read off the render's list, so two adds in one tick can
      // collide. Not chased: the column is non-unique by design and every read
      // orders `position, created_at, id`, so a tie costs an arbitrary but
      // stable order and nothing else (20260822000001).
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

      // Counts only: the package's name is a string the venue typed, and
      // `AnalyticsEvents` is closed so nothing like it can reach PostHog. The
      // venue itself is attributed with a PostHog group.
      const courseRows = coursesOf(courses, id)
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
      const packageCourses = coursesOf(courses, id)
      const courseIds = new Set(packageCourses.map((c) => c.id))
      // Captured to be put back one row at a time if the delete is refused.
      const removed = {
        packages: packages.filter((p) => p.id === id),
        courses: packageCourses,
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
          // `menu_course_id`, not `id`: an option is dropped for the course it
          // belongs to, not for sharing an id with one.
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

      const siblings = coursesOf(courses, packageId)
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
        options: optionsOf(options, id),
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

      const siblings = optionsOf(options, courseId)
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
   * Persist a whole sibling order in one RPC. That is the point of
   * `reorder_menu_courses` / `reorder_menu_options`: a dropped connection
   * between two UPDATEs leaves two rows claiming the same position.
   *
   * The RPCs are invoker-rights, so a non-staff caller renumbers nothing and
   * gets no error for it - unreachable from this screen, since the /crm shell
   * establishes staff first, but it would leave the moved row where the
   * optimistic update put it until the next load.
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
      // supabase-js returns a thenable, and `tracked` needs a `finally`.
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
   * Move one row among its siblings. The new order is applied **before** the
   * RPC: waiting for the round trip left ▲ doing nothing visible, which teaches
   * a second click computed from a list that had not moved, and the two gestures
   * then fight over the same pair of positions.
   *
   * On a refusal the original order goes back through `applyOrder` over the ids
   * as they were, so nothing else on the screen is disturbed.
   */
  const moveCourse = useCallback(
    async (packageId: string, id: string, delta: -1 | 1) => {
      const siblings = coursesOf(courses, packageId)
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
      const siblings = optionsOf(options, courseId)
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
    /** The current failure as a sentence, resolved in the current language. */
    error: errorKey ? t(errorKey) : null,
    /** True while any write is out. Gates the destructive buttons. */
    saving: writesInFlight > 0,
    /**
     * Re-read the catalogue. Returned so the error banner can offer a retry -
     * without it a failed load is terminal for the screen short of a full page
     * reload.
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
