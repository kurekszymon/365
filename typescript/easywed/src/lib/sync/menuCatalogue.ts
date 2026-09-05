import type { MenuCourse, MenuOption, MenuPackage } from "@/lib/menu"
import {
  MENU_COURSE_COLUMNS,
  MENU_OPTION_COLUMNS,
  MENU_PACKAGE_COLUMNS,
} from "@/lib/menu"
import { DEFAULT_CURRENCY } from "@/lib/money"
import { supabase } from "@/lib/supabase"
import { useMenuStore } from "@/stores/menu.store"

/**
 * Rows as a catalogue read returns them: the structural type plus the sort
 * tiebreaker `byPosition` wants. The CRM re-exports these as its `CrmMenu*`.
 */
export type CatalogueMenuPackage = MenuPackage & { created_at: string }
export type CatalogueMenuCourse = MenuCourse & { created_at: string }
export type CatalogueMenuOption = MenuOption & { created_at: string }

export type MenuCatalogue = {
  packages: Array<CatalogueMenuPackage>
  courses: Array<CatalogueMenuCourse>
  options: Array<CatalogueMenuOption>
  currency: string
}

/**
 * Three outcomes, not two: "aborted" is its own case because an aborted
 * PostgREST request comes back as an error *result*, and a caller that folds it
 * into "failed" parks an "AbortError" on screen every time somebody navigates
 * away mid-fetch.
 *
 * The errors are handed back rather than logged here, so each caller keeps its
 * own console scope - `[menu]` for the couple's tab, `[crm]` for the editor.
 */
export type MenuCatalogueResult =
  | { status: "ok"; catalogue: MenuCatalogue }
  | { status: "aborted" }
  | { status: "failed"; errors: Record<string, unknown> }

/**
 * The venue's catalogue, read in one round trip.
 *
 * One function for both readers - the couple's Menu tab (`loadMenuCatalogue`
 * below) and the venue's own editor (`useTenantMenus`) - because they were the
 * same four-way `Promise.all` twice, down to the triple `.order()` and the
 * currency fallback. The two differ in what they do with the rows, not in how
 * they get them, and that is the seam.
 *
 * Archived rows are fetched, not filtered out. A dish the couple already chose
 * has to keep its name everywhere it is displayed; the pickers filter with
 * `isLive` at the point of offering a choice.
 *
 * The sort order is the same in all three reads, and it is the one every menu
 * read uses. `position` is not unique - see `byPosition` in @/lib/menu - so the
 * two tiebreakers are what make an arbitrary order a *stable* one across loads
 * and devices.
 *
 * The three reads are spelled out rather than driven through one
 * table-name-parameterized helper: supabase-js resolves the row type from the
 * literal table name, and a union of three collapses every column into a "does
 * not exist on" error type. Repetition here buys three correctly typed results.
 */
export const fetchMenuCatalogue = async (
  tenantId: string,
  signal: AbortSignal
): Promise<MenuCatalogueResult> => {
  const [tenantRes, packagesRes, coursesRes, optionsRes] = await Promise.all([
    // The currency the prices are denominated in. Not available from
    // `tenant_public()` - that RPC is the anonymous branding lookup and prices
    // are not anonymous data - so it is read off `tenants`. The couple reads it
    // through "wedding members can view their linked venue" (20260817000002
    // section 5), the same policy that already lets the grant dialog name the
    // venue; staff hold an ordinary member SELECT on the row.
    supabase
      .from("tenants")
      .select("currency")
      .eq("id", tenantId)
      .abortSignal(signal)
      .maybeSingle(),
    supabase
      .from("menu_packages")
      .select(MENU_PACKAGE_COLUMNS)
      .eq("tenant_id", tenantId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .abortSignal(signal),
    supabase
      .from("menu_courses")
      .select(MENU_COURSE_COLUMNS)
      .eq("tenant_id", tenantId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .abortSignal(signal),
    supabase
      .from("menu_options")
      .select(MENU_OPTION_COLUMNS)
      .eq("tenant_id", tenantId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .abortSignal(signal),
  ])

  // Before the error checks, for the reason on `MenuCatalogueResult`.
  if (signal.aborted) return { status: "aborted" }

  if (packagesRes.error || coursesRes.error || optionsRes.error) {
    return {
      status: "failed",
      errors: {
        packages: packagesRes.error,
        courses: coursesRes.error,
        options: optionsRes.error,
      },
    }
  }

  return {
    status: "ok",
    catalogue: {
      packages: packagesRes.data,
      courses: coursesRes.data,
      options: optionsRes.data,
      // A failed currency read is not worth failing the whole tab for: the
      // fallback matches the column's default, and a price in the wrong symbol
      // is a smaller problem than no menu at all.
      currency: tenantRes.data?.currency ?? DEFAULT_CURRENCY,
    },
  }
}

/**
 * The venue's catalogue, read by a couple and put in `menu.store`.
 *
 * A read module rather than part of `loadWedding`'s batch, and the reason is
 * structural rather than stylistic: this needs `weddings.tenant_id`, which is
 * only known once the wedding row has come back. It cannot ride the
 * `Promise.all` - it is a strictly later round trip, the way `fetchDisplayNames`
 * already is.
 *
 * That is why the Menu tab shows a spinner on a cold load while the rest of the
 * planner is already painted. It is the honest consequence of the data
 * dependency, not a loading state somebody forgot to remove.
 *
 * Reads through the couple-read policies added in 20260822000002, which are
 * scoped by the wedding's link to the tenant and deliberately *not* by
 * `venue_access`: a menu is the venue's own data, published to be read, and a
 * couple deciding whether to grant access needs to see the offer first.
 */
export const loadMenuCatalogue = async (
  tenantId: string,
  signal: AbortSignal
): Promise<void> => {
  useMenuStore.getState().setStatus("loading")

  const result = await fetchMenuCatalogue(tenantId, signal)
  if (result.status === "aborted") return

  if (result.status === "failed") {
    console.error("[menu] catalogue load failed", result.errors)
    useMenuStore.getState().setStatus("failed")
    return
  }

  useMenuStore.getState().setCatalogue(result.catalogue)
}
