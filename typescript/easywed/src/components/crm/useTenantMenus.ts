import { useCallback, useEffect, useState } from "react"

import type { MenuCourse, MenuOption, MenuPackage } from "@/lib/menu"
import { byPosition } from "@/lib/menu"
import { supabase } from "@/lib/supabase"
import { track } from "@/lib/analytics/track"
import i18n from "@/i18n"

/** The three tables this screen owns, and the only ones it writes. */
type MenuTable = "menu_packages" | "menu_courses" | "menu_options"

/** Rows as this screen holds them: the structural type plus its sort tiebreaker. */
export type CrmMenuPackage = MenuPackage & { created_at: string }
export type CrmMenuCourse = MenuCourse & { created_at: string }
export type CrmMenuOption = MenuOption & { created_at: string }

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

const PACKAGE_COLUMNS =
  "id, name, description, price_per_person_minor, position, archived_at, created_at"
const COURSE_COLUMNS =
  "id, menu_package_id, name, choose_count, serving_note, per_guest_choice, position, archived_at, created_at"
const OPTION_COLUMNS =
  "id, menu_course_id, name, note, position, archived_at, created_at"

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
 * What replaces it is the pattern below: optimistic state change, direct write,
 * restore the previous array and set a message if the write is refused. Every
 * mutating call asks for `.select("id")` back, because an UPDATE or DELETE that
 * RLS filters to nothing is a clean 204 - no error, no rows - and treating that
 * as success would leave the screen showing an edit the database refused.
 *
 * The currency is read off `tenants` rather than the resolved `PublicTenant`,
 * because `tenant_public()` deliberately does not project it: that RPC is the
 * anonymous branding lookup, and prices are for staff and linked couples only.
 * Staff hold an ordinary member SELECT on the row.
 */
export function useTenantMenus(tenantId: string | undefined) {
  const [packages, setPackages] = useState<Array<CrmMenuPackage>>([])
  const [courses, setCourses] = useState<Array<CrmMenuCourse>>([])
  const [options, setOptions] = useState<Array<CrmMenuOption>>([])
  const [currency, setCurrency] = useState("PLN")
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      if (!tenantId) return
      const effectiveSignal = signal ?? new AbortController().signal
      // Read through a call, not the property: TypeScript narrows `aborted` to
      // false at the first check and does not reconsider across the awaits.
      // Same note as useTenantRoster.
      const isAborted = () => effectiveSignal.aborted

      // The three reads are spelled out rather than driven through one
      // table-name-parameterized helper: supabase-js resolves the row type from
      // the literal table name, and a union of three collapses every column
      // into a "does not exist on" error type. Repetition here buys three
      // correctly typed results.
      //
      // The sort order is the same in all three, and it is the one every menu
      // read uses. `position` is not unique - see byPosition in @/lib/menu - so
      // the two tiebreakers are what make an arbitrary order a *stable* one
      // across loads and devices.
      const [tenantRes, packagesRes, coursesRes, optionsRes] =
        await Promise.all([
          supabase
            .from("tenants")
            .select("currency")
            .eq("id", tenantId)
            .abortSignal(effectiveSignal)
            .single(),
          supabase
            .from("menu_packages")
            .select(PACKAGE_COLUMNS)
            .eq("tenant_id", tenantId)
            .order("position", { ascending: true })
            .order("created_at", { ascending: true })
            .order("id", { ascending: true })
            .abortSignal(effectiveSignal),
          supabase
            .from("menu_courses")
            .select(COURSE_COLUMNS)
            .eq("tenant_id", tenantId)
            .order("position", { ascending: true })
            .order("created_at", { ascending: true })
            .order("id", { ascending: true })
            .abortSignal(effectiveSignal),
          supabase
            .from("menu_options")
            .select(OPTION_COLUMNS)
            .eq("tenant_id", tenantId)
            .order("position", { ascending: true })
            .order("created_at", { ascending: true })
            .order("id", { ascending: true })
            .abortSignal(effectiveSignal),
        ])

      // Before the error checks: an aborted PostgREST request comes back as an
      // error *result*, so navigating away mid-fetch would otherwise park an
      // "AbortError" string in `error`.
      if (isAborted()) return

      if (packagesRes.error || coursesRes.error || optionsRes.error) {
        console.error("[crm] menu load failed", {
          packages: packagesRes.error,
          courses: coursesRes.error,
          options: optionsRes.error,
        })
        setError(i18n.t("crm.menus.load_failed"))
        setLoaded(true)
        return
      }

      setError(null)
      // A failed currency read is not worth blocking the screen for - the
      // default matches the column's, and a price rendered in the wrong symbol
      // is a smaller problem than no menu at all.
      setCurrency(tenantRes.data?.currency ?? "PLN")
      setPackages(packagesRes.data)
      setCourses(coursesRes.data)
      setOptions(optionsRes.data)
      setLoaded(true)
    },
    [tenantId]
  )

  useEffect(() => {
    if (!tenantId) return
    const controller = new AbortController()
    // refresh() only setState()s after awaiting the fetch - a legitimate
    // external-data sync, not a synchronous cascading render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh(controller.signal)
    return () => controller.abort()
  }, [tenantId, refresh])

  const fail = useCallback((scope: string, cause: unknown, key: string) => {
    console.error(`[crm] ${scope}`, cause)
    setError(i18n.t(key))
  }, [])

  /**
   * The three write primitives, parameterized by table.
   *
   * The `as never` casts are the price of that parameterization: supabase-js
   * resolves the payload type from the literal table name, and a union of three
   * collapses the accepted shape to `never`. The alternative is the same twelve
   * functions written three times over, where a rule fixed in one copy stays
   * broken in the other two. The columns are still checked - by the CHECK
   * constraints, and by the callers below, which build every payload from a
   * typed row.
   */
  const writeInsert = async (
    table: MenuTable,
    row: Record<string, unknown>
  ): Promise<boolean> => {
    const { error: insertError } = await supabase
      .from(table)
      .insert(row as never)
    return !insertError
  }

  const writePatch = async (
    table: MenuTable,
    id: string,
    patch: Record<string, unknown>
  ): Promise<boolean> => {
    const { data, error: patchError } = await supabase
      .from(table)
      .update(patch as never)
      .eq("id", id)
      .select("id")
    // `data` is only read once `patchError` is known null, which is the only
    // state PostgREST guarantees it in.
    return !patchError && data.length > 0
  }

  /**
   * The one write that has to say *why* it failed.
   *
   * The three FKs the wedding tree points at this catalogue are
   * `on delete restrict` (20260822000002 section 1), so "a couple has ordered
   * this" is a routine outcome of the delete button rather than a fault, and
   * `delete_failed` - "please try again" - is the wrong thing to say about it:
   * trying again cannot work, and archiving is what the staff member wants.
   * `23503` is `foreign_key_violation`; it arrives for a package too, because
   * the delete cascades down to the options and the restrict fires there.
   */
  const writeDelete = async (
    table: MenuTable,
    id: string
  ): Promise<{ ok: boolean; inUse: boolean }> => {
    const { data, error: deleteError } = await supabase
      .from(table)
      .delete()
      .eq("id", id)
      .select("id")
    if (deleteError) return { ok: false, inUse: deleteError.code === "23503" }
    return { ok: data.length > 0, inUse: false }
  }

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
      const row: CrmMenuPackage = {
        id: crypto.randomUUID(),
        name,
        description: null,
        price_per_person_minor: 0,
        position: packages.length + 1,
        archived_at: null,
        created_at: new Date().toISOString(),
      }

      const previous = packages
      setPackages((list) => [...list, row])

      const ok = await writeInsert("menu_packages", {
        id: row.id,
        tenant_id: tenantId,
        name: row.name,
        position: row.position,
      })

      if (!ok) {
        setPackages(previous)
        fail("create package failed", null, "crm.menus.save_failed")
        return null
      }

      return row.id
    },
    [tenantId, packages, fail]
  )

  const savePackage = useCallback(
    async (id: string, patch: Partial<CrmMenuPackage>) => {
      const previous = packages
      setPackages((list) =>
        list.map((row) => (row.id === id ? { ...row, ...patch } : row))
      )

      if (!(await writePatch("menu_packages", id, patch))) {
        setPackages(previous)
        fail("save package failed", null, "crm.menus.save_failed")
        return
      }

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
    [packages, courses, options, fail]
  )

  const deletePackage = useCallback(
    async (id: string) => {
      const previous = { packages, courses, options }
      const courseIds = new Set(
        courses.filter((c) => c.menu_package_id === id).map((c) => c.id)
      )

      // The FK cascade removes the children in the database; the optimistic
      // state has to do the same or the screen keeps rendering orphans.
      setPackages((list) => list.filter((row) => row.id !== id))
      setCourses((list) => list.filter((row) => row.menu_package_id !== id))
      // `menu_course_id`, not `id` - an option is dropped because of the course
      // it belongs to, not because it happens to share an id with one.
      setOptions((list) =>
        list.filter((row) => !courseIds.has(row.menu_course_id))
      )

      const result = await writeDelete("menu_packages", id)
      if (!result.ok) {
        setPackages(previous.packages)
        setCourses(previous.courses)
        setOptions(previous.options)
        fail(
          "delete package failed",
          null,
          result.inUse
            ? "crm.menus.delete_package_in_use"
            : "crm.menus.delete_failed"
        )
      }
    },
    [packages, courses, options, fail]
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

      const previous = courses
      setCourses((list) => [...list, row])

      const ok = await writeInsert("menu_courses", {
        id: row.id,
        tenant_id: tenantId,
        menu_package_id: row.menu_package_id,
        name: row.name,
        position: row.position,
      })

      if (!ok) {
        setCourses(previous)
        fail("create course failed", null, "crm.menus.save_failed")
      }
    },
    [tenantId, courses, fail]
  )

  const saveCourse = useCallback(
    async (id: string, patch: Partial<CrmMenuCourse>) => {
      const previous = courses
      setCourses((list) =>
        list.map((row) => (row.id === id ? { ...row, ...patch } : row))
      )

      if (!(await writePatch("menu_courses", id, patch))) {
        setCourses(previous)
        fail("save course failed", null, "crm.menus.save_failed")
      }
    },
    [courses, fail]
  )

  const deleteCourse = useCallback(
    async (id: string) => {
      const previous = { courses, options }
      setCourses((list) => list.filter((row) => row.id !== id))
      setOptions((list) => list.filter((row) => row.menu_course_id !== id))

      const result = await writeDelete("menu_courses", id)
      if (!result.ok) {
        setCourses(previous.courses)
        setOptions(previous.options)
        fail(
          "delete course failed",
          null,
          result.inUse
            ? "crm.menus.delete_course_in_use"
            : "crm.menus.delete_failed"
        )
      }
    },
    [courses, options, fail]
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

      const previous = options
      setOptions((list) => [...list, row])

      const ok = await writeInsert("menu_options", {
        id: row.id,
        tenant_id: tenantId,
        menu_course_id: row.menu_course_id,
        name: row.name,
        position: row.position,
      })

      if (!ok) {
        setOptions(previous)
        fail("create option failed", null, "crm.menus.save_failed")
      }
    },
    [tenantId, options, fail]
  )

  const saveOption = useCallback(
    async (id: string, patch: Partial<CrmMenuOption>) => {
      const previous = options
      setOptions((list) =>
        list.map((row) => (row.id === id ? { ...row, ...patch } : row))
      )

      if (!(await writePatch("menu_options", id, patch))) {
        setOptions(previous)
        fail("save option failed", null, "crm.menus.save_failed")
      }
    },
    [options, fail]
  )

  const deleteOption = useCallback(
    async (id: string) => {
      const previous = options
      setOptions((list) => list.filter((row) => row.id !== id))

      const result = await writeDelete("menu_options", id)
      if (!result.ok) {
        setOptions(previous)
        fail(
          "delete option failed",
          null,
          result.inUse
            ? "crm.menus.delete_dish_in_use"
            : "crm.menus.delete_failed"
        )
      }
    },
    [options, fail]
  )

  // ---------------------------------------------------------------------
  // Reordering
  // ---------------------------------------------------------------------
  /**
   * Move one row up or down among its siblings, and persist the whole new order
   * in a single RPC.
   *
   * One statement per gesture rather than two UPDATEs, which is the point of
   * `reorder_menu_courses` / `reorder_menu_options`: a dropped connection
   * between two writes leaves a list with two rows claiming the same position.
   * The RPCs are invoker-rights, so a caller who is not staff of the owning
   * tenant renumbers nothing - the call succeeds and does nothing, which is why
   * the state is restored on the *positions* not matching rather than on an
   * error.
   */
  const moveWithin = async <T extends { id: string; position: number }>(
    rpc: "reorder_menu_courses" | "reorder_menu_options",
    scopeKey: "p_menu_package_id" | "p_course_id",
    scopeId: string,
    siblings: Array<T>,
    id: string,
    delta: -1 | 1
  ): Promise<Array<string> | null> => {
    const index = siblings.findIndex((row) => row.id === id)
    const target = index + delta
    if (index === -1 || target < 0 || target >= siblings.length) return null

    const ids = siblings.map((row) => row.id)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]

    const { error: rpcError } = await supabase.rpc(rpc, {
      [scopeKey]: scopeId,
      p_ids: ids,
    } as never)

    return rpcError ? null : ids
  }

  const moveCourse = useCallback(
    async (packageId: string, id: string, delta: -1 | 1) => {
      const siblings = courses.filter((c) => c.menu_package_id === packageId)

      const ids = await moveWithin(
        "reorder_menu_courses",
        "p_menu_package_id",
        packageId,
        siblings,
        id,
        delta
      )
      if (!ids) {
        if (siblings.some((c) => c.id === id)) {
          fail("reorder courses failed", null, "crm.menus.save_failed")
        }
        return
      }

      setCourses((list) => applyOrder(list, ids))
    },
    [courses, fail]
  )

  const moveOption = useCallback(
    async (courseId: string, id: string, delta: -1 | 1) => {
      const siblings = options.filter((o) => o.menu_course_id === courseId)

      const ids = await moveWithin(
        "reorder_menu_options",
        "p_course_id",
        courseId,
        siblings,
        id,
        delta
      )
      if (!ids) {
        if (siblings.some((o) => o.id === id)) {
          fail("reorder options failed", null, "crm.menus.save_failed")
        }
        return
      }

      setOptions((list) => applyOrder(list, ids))
    },
    [options, fail]
  )

  return {
    loaded,
    error,
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
