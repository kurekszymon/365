import { supabase } from "@/lib/supabase"
import { useMenuStore } from "@/stores/menu.store"

/**
 * The venue's catalogue, read by a couple.
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
 *
 * Archived rows are fetched, not filtered out here. A dish the couple already
 * chose has to keep its name everywhere it is displayed; the pickers filter
 * with `isLive` at the point of offering a choice.
 */
export const loadMenuCatalogue = async (
  tenantId: string,
  signal: AbortSignal
): Promise<void> => {
  useMenuStore.getState().setStatus("loading")

  const [tenantRes, packagesRes, coursesRes, optionsRes] = await Promise.all([
    // The currency the prices are denominated in. Not available from
    // `tenant_public()` - that RPC is the anonymous branding lookup and prices
    // are not anonymous data - so it is read off `tenants` through "wedding
    // members can view their linked venue" (20260817000002 section 5), the same
    // policy that already lets the grant dialog name the venue.
    supabase
      .from("tenants")
      .select("currency")
      .eq("id", tenantId)
      .abortSignal(signal)
      .maybeSingle(),
    supabase
      .from("menu_packages")
      .select(
        "id, name, description, price_per_person_minor, position, archived_at"
      )
      .eq("tenant_id", tenantId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .abortSignal(signal),
    supabase
      .from("menu_courses")
      .select(
        "id, menu_package_id, name, choose_count, serving_note, per_guest_choice, position, archived_at"
      )
      .eq("tenant_id", tenantId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .abortSignal(signal),
    supabase
      .from("menu_options")
      .select("id, menu_course_id, name, note, position, archived_at")
      .eq("tenant_id", tenantId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .abortSignal(signal),
  ])

  // An aborted PostgREST request comes back as an error *result*, so this is
  // checked before the errors are - navigating away mid-fetch is not a failure
  // to render.
  if (signal.aborted) return

  if (packagesRes.error || coursesRes.error || optionsRes.error) {
    console.error("[menu] catalogue load failed", {
      packages: packagesRes.error,
      courses: coursesRes.error,
      options: optionsRes.error,
    })
    useMenuStore.getState().setStatus("failed")
    return
  }

  useMenuStore.getState().setCatalogue({
    packages: packagesRes.data,
    courses: coursesRes.data,
    options: optionsRes.data,
    // A failed currency read is not worth failing the whole tab for: the
    // fallback matches the column's default, and a price in the wrong symbol is
    // a smaller problem than no menu at all.
    currency: tenantRes.data?.currency ?? "PLN",
  })
}
