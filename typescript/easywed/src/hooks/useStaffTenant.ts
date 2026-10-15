import { useEffect, useState } from "react"
import { fetchMyStaffTenant } from "@/lib/sync/tenant"
import { useAuthStore } from "@/stores/auth.store"

type StaffTenant = { id: string; slug: string }

// One lookup per signed-in user for the life of the tab. The answer changes only
// when someone joins or leaves a venue's staff, and a stale "no" costs a reload.
let cached: { userId: string; tenant: StaffTenant | null } | null = null

/**
 * The venue the signed-in user is staff of, or null - from the apex, where the
 * hostname cannot say. `undefined` while the answer is in flight.
 *
 * The planner is apex-only, so `tenant.store` (which resolves off the tenant
 * host) is empty here; this is the same `fetchMyStaffTenant` lookup
 * `useVenueStaffLanding` makes, without its redirect.
 */
export const useStaffTenant = (): StaffTenant | null | undefined => {
  const userId = useAuthStore((s) => s.session?.user.id)
  const [fetched, setFetched] = useState<
    { userId: string; tenant: StaffTenant | null } | undefined
  >(() => (cached && cached.userId === userId ? cached : undefined))

  useEffect(() => {
    if (!userId || fetched?.userId === userId) return
    const controller = new AbortController()

    void fetchMyStaffTenant(userId, controller.signal).then((tenant) => {
      if (controller.signal.aborted) return
      cached = { userId, tenant }
      setFetched(cached)
    })

    return () => controller.abort()
  }, [userId, fetched])

  if (!userId) return null
  return fetched?.userId === userId ? fetched.tenant : undefined
}
