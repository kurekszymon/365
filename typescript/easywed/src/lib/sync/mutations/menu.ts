import { supabase } from "@/lib/supabase"
import { getWeddingId, run } from "@/lib/sync/mutations/shared"

/**
 * The couple's three menu writes.
 *
 * These *are* wedding-tree writes - `weddings` and `wedding_menu_selections` -
 * so unlike the CRM's `useTenantMenus`, which talks to Supabase directly, they
 * go through `run()` like every other mutation in this folder. The role gate
 * and the guest-mode short-circuit both apply and both are wanted here: a
 * viewer must not be able to reorder somebody's dinner, and a local wedding has
 * no venue to have a menu at all.
 *
 * Nothing writes the catalogue. `menu_packages` / `menu_courses` /
 * `menu_options` are the venue's, and the couple holds SELECT and nothing else
 * (20260822000002 section 4).
 */

/**
 * Point the wedding at a package, or clear it.
 *
 * Destructive server-side, and deliberately so: the
 * `weddings_menu_package_changed` trigger deletes every selection for the
 * wedding, because every option row belongs to exactly one package and a
 * "keep what still fits" sweep would keep nothing. The store mirrors that
 * locally and the UI confirms before calling.
 *
 * `enforce_wedding_menu_package` refuses a package belonging to a venue this
 * wedding is not linked to, with 23514 - which is what makes an ordinary UPDATE
 * policy on the column safe.
 */
export const setWeddingMenuPackage = (
  packageId: string | null
): Promise<boolean> => {
  const weddingId = getWeddingId()
  if (!weddingId) return Promise.resolve(false)
  return run(
    "setWeddingMenuPackage",
    supabase
      .from("weddings")
      .update({ menu_package_id: packageId })
      .eq("id", weddingId)
  )
}

/**
 * Add one dish to the served set.
 *
 * `upsert` with `ignoreDuplicates`, not a plain `insert`, and the difference is
 * a toast the user should never see. `(wedding_id, menu_option_id)` is the
 * primary key, so a second pick of the same dish is a `23505` - which `run()`
 * turns into a "could not save" toast for a write the database is already
 * consistent with. That is reachable two ways: two people editing the menu at
 * once, and a single client doing pick → unpick → pick, since all three writes
 * are fire-and-forget with no ordering guarantee between them.
 *
 * Ignoring the duplicate makes the operation genuinely idempotent, which is
 * what the optimistic store already assumes it is.
 */
export const insertMenuSelection = (optionId: string): Promise<boolean> => {
  const weddingId = getWeddingId()
  if (!weddingId) return Promise.resolve(false)
  return run(
    "insertMenuSelection",
    supabase
      .from("wedding_menu_selections")
      .upsert(
        { wedding_id: weddingId, menu_option_id: optionId },
        { ignoreDuplicates: true }
      )
  )
}

/** Remove one dish from the served set. Idempotent for the same reason. */
export const deleteMenuSelection = (optionId: string): Promise<boolean> => {
  const weddingId = getWeddingId()
  if (!weddingId) return Promise.resolve(false)
  return run(
    "deleteMenuSelection",
    supabase
      .from("wedding_menu_selections")
      .delete()
      .eq("wedding_id", weddingId)
      .eq("menu_option_id", optionId)
  )
}
