import type { LinkedVenue } from "@/stores/global.store"
import { supabase } from "@/lib/supabase"
import { useGlobalStore } from "@/stores/global.store"

/**
 * The couple's side of the venue link.
 *
 * Deliberately *not* built on `run()` from mutations/shared.ts, which every
 * planner write goes through. Three reasons, and each one matters here:
 *
 *   - `run()` reports one boolean and shows one generic toast. Linking fails
 *     for reasons the user can act on ("no venue with that address", "this
 *     venue links by invitation only"), and collapsing those into "nie udalo
 *     sie zapisac" would leave someone retyping a slug that was never the
 *     problem.
 *   - `run()` short-circuits to `true` for the local wedding without sending
 *     anything. Guest mode has no wedding row to link, so a silent success is
 *     exactly the wrong answer; the dialog is not offered there at all, and
 *     this module would rather fail loudly if it ever were.
 *   - `run()` refuses anything `selectCanEdit` rejects. That is the right rule
 *     for planner writes and the wrong one here: these calls do not write the
 *     wedding tree, they call definer RPCs that authorize their own caller
 *     against `weddings.owner_id`.
 *
 * Neither function updates the store optimistically. `venue_access` is
 * server-owned - `enforce_wedding_tenant_columns` makes the columns entirely
 * unwritable from the client - so the honest move is to re-read what the
 * database decided.
 */

/** Discriminated so the dialog can render a reason rather than a shrug. */
export type VenueLinkResult =
  | { ok: true; venue: LinkedVenue }
  | { ok: false; reason: VenueLinkFailure }

type VenueLinkFailure = "not_found" | "suspended" | "invitation_only" | "failed"

/**
 * The SQLSTATEs `link_wedding_to_venue` raises for the three refusals a couple
 * can cause, mapped to the reason the dialog renders. Each reason is a
 * `venue.link.error.<reason>` key, so a code missing here falls to "failed" and
 * a generic retry prompt.
 *
 * A lookup on `error.code` rather than a match on `error.message`, which is
 * what this replaces: the message is prose the migration is free to reword and
 * PostgREST is free to wrap, so every refusal was one edit away from silently
 * becoming "failed" - including the invitation-only one, where retrying is
 * precisely the wrong advice.
 */
const LINK_FAILURES: Record<string, VenueLinkFailure> = {
  PT404: "not_found",
  PT410: "suspended",
  PT403: "invitation_only",
}

/**
 * Points a wedding at a venue and leaves it in `pending`.
 *
 * Grants nothing: `pending` is invisible to the venue (the derived role in
 * 20260817000003 requires `granted`), which is what lets the couple see the
 * venue's real name in the consent dialog before deciding anything.
 */
export const linkWeddingToVenue = async (
  weddingId: string,
  slug: string
): Promise<VenueLinkResult> => {
  const { data, error } = await supabase.rpc("link_wedding_to_venue", {
    p_wedding_id: weddingId,
    p_slug: slug,
  })

  if (error) {
    console.error("[venue] linkWeddingToVenue failed", error)
    return { ok: false, reason: LINK_FAILURES[error.code] ?? "failed" }
  }

  const venue = await fetchLinkedVenue(data)
  if (!venue) return { ok: false, reason: "failed" }

  useGlobalStore.getState().setVenueLink(venue, "pending")
  return { ok: true, venue }
}

/**
 * Grants or revokes the venue's access to one wedding.
 *
 * `granted` is the art. 9 ust. 2 lit. a consent, so the database refuses it
 * from anyone but the wedding's owner - staff of the linked venue may call this
 * only with `false`. See the comment on `set_venue_access` in
 * 20260817000002 for why that asymmetry is not negotiable.
 */
export const setVenueAccess = async (
  weddingId: string,
  granted: boolean
): Promise<boolean> => {
  const { error } = await supabase.rpc("set_venue_access", {
    p_wedding_id: weddingId,
    p_granted: granted,
  })

  if (error) {
    console.error("[venue] setVenueAccess failed", error)
    return false
  }

  const state = useGlobalStore.getState()
  if (state.weddingId === weddingId) {
    state.setVenueLink(state.venue, granted ? "granted" : "none")
  }
  return true
}

/**
 * The venue's public columns, by id.
 *
 * Reads `tenants` directly rather than `tenant_public()`, which takes a slug we
 * do not have here. RLS allows it: the caller has just linked their wedding to
 * this tenant, and "wedding members can view their linked venue"
 * (20260817000002) is exactly that grant.
 */
const fetchLinkedVenue = async (
  tenantId: string
): Promise<LinkedVenue | null> => {
  const { data, error } = await supabase
    .from("tenants")
    .select("id, slug, name")
    .eq("id", tenantId)
    .maybeSingle()

  if (error || !data) {
    console.error("[venue] fetchLinkedVenue failed", error)
    return null
  }

  return { tenantId: data.id, slug: data.slug, name: data.name }
}
