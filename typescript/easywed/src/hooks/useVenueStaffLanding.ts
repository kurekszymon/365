import { useEffect, useState } from "react"
import { fetchMyStaffTenant } from "@/lib/sync/tenant"
import {
  clearVenueLanding,
  isVenueLandingPending,
} from "@/lib/auth/venueLanding"
import { tenantUrl } from "@/lib/tenant/host"
import { useAuthStore } from "@/stores/auth.store"

/**
 * Forwards a venue's staff from the apex landing to their own CRM.
 *
 * The other half of `authLandingPath`: a tenant host answers "where does this
 * person belong?" from the hostname, and the apex has to ask. It asks here,
 * once, and only when the marker armed at an auth surface says this arrival
 * came straight off signing in (or off typing /crm on the apex). Every other
 * visit to the wedding list issues no query and redirects nobody - which is
 * what keeps the list reachable for a venue owner who is also planning a
 * wedding of their own.
 *
 * `window.location.replace`, not the router: the CRM is on another origin, and
 * TanStack's `redirect()` builds paths against the current one. `replace` keeps
 * the apex out of history, so Back goes where the user actually came from
 * rather than into a bounce.
 *
 * Returns "checking" while the lookup is in flight *and* for the whole life of
 * a successful hop - the caller renders nothing in that state, so the wedding
 * list never flashes on its way to somewhere else.
 */
export const useVenueStaffLanding = (): "idle" | "checking" => {
  const isReady = useAuthStore((s) => s.isReady)
  const userId = useAuthStore((s) => s.session?.user.id)

  // Read at mount rather than set from the effect, so the very first render of
  // an arrival already knows to hold the list back. A pure read - the effect
  // below is what spends it.
  const [pending, setPending] = useState(() => isVenueLandingPending())

  useEffect(() => {
    if (!pending || !isReady) return

    // Armed, then signed out again before landing. Nothing to look up and
    // nobody to forward - drop the marker so it cannot fire at whoever signs
    // in next in this tab.
    if (!userId) {
      clearVenueLanding()
      return
    }

    const controller = new AbortController()

    // Spent when the lookup *starts*, not when it answers.
    //
    // Spending it in the callback looks safer and is not: the callback returns
    // early on an abort, and an unmount is an abort with no later run to spend
    // it. Navigate off /home while this is in flight and the marker sits in
    // sessionStorage for the life of the tab, firing at the next arrival on the
    // wedding list - the exact bounce venueLanding.ts exists to prevent.
    //
    // StrictMode's double mount is unaffected: `pending` is component state and
    // survives the simulated remount, so the second effect run still looks up.
    //
    // The cost is that signing in and then clicking into a wedding before the
    // answer lands forwards nobody. That is the right way round - the user
    // navigated somewhere on purpose - and typing /crm on the apex re-arms.
    clearVenueLanding()

    void fetchMyStaffTenant(userId, controller.signal).then((tenant) => {
      if (controller.signal.aborted) return

      if (!tenant) {
        setPending(false)
        return
      }

      window.location.replace(tenantUrl(tenant.slug, "/crm"))
    })

    return () => controller.abort()
  }, [pending, isReady, userId])

  // Held only for a signed-in arrival: a signed-out visitor gets the landing
  // page immediately, marker or not.
  return pending && isReady && userId ? "checking" : "idle"
}
