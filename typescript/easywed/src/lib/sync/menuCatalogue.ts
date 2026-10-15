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
 * The venue's catalogue, read in one round trip. One function for both readers -
 * the couple's Menu tab (`loadMenuCatalogue` below) and the venue's own editor
 * (`useTenantMenus`) - which differ in what they do with the rows, not in how
 * they get them.
 *
 * Archived rows are fetched, not filtered out: a dish the couple already chose
 * has to keep its name wherever it is displayed. Pickers filter with `isLive` at
 * the point of offering a choice.
 *
 * The three reads are spelled out rather than driven through one
 * table-name-parameterized helper: supabase-js resolves the row type from the
 * literal table name, and a union of three collapses every column into a "does
 * not exist on" error.
 */
export const fetchMenuCatalogue = async (
  tenantId: string,
  signal: AbortSignal
): Promise<MenuCatalogueResult> => {
  const [tenantRes, packagesRes, coursesRes, optionsRes] = await Promise.all([
    // The currency the prices are denominated in. Not on `tenant_public()` -
    // that RPC is the anonymous branding lookup and prices are not anonymous
    // data - so it is read off `tenants`, through "wedding members can view
    // their linked venue" (20260817000002 §5) for a couple, and an ordinary
    // member SELECT for staff.
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
      // Not worth failing the whole tab for: the fallback matches the column's
      // default, and a price in the wrong symbol beats no menu at all.
      currency: tenantRes.data?.currency ?? DEFAULT_CURRENCY,
    },
  }
}

/**
 * The venue's catalogue, read by a couple and put in `menu.store`.
 *
 * Outside `loadWedding`'s batch for a structural reason: it needs
 * `weddings.tenant_id`, known only once the wedding row is back, so it is a
 * strictly later round trip the way `fetchDisplayNames` is. That is why the Menu
 * tab spins on a cold load while the rest of the planner is painted.
 *
 * Reads through the couple-read policies added in 20260822000002, scoped by the
 * wedding's link to the tenant and deliberately *not* by `venue_access`: a menu
 * is the venue's own published data, and a couple deciding whether to grant
 * access needs to see the offer first.
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
