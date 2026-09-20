import { useEffect } from "react"
import { useRouter } from "@tanstack/react-router"
import { useAuthStore } from "@/stores/auth.store"
import { useTenantStore } from "@/stores/tenant.store"
import { fetchPublicTenant, fetchTenantRole } from "@/lib/sync/tenant"
import { tenantSlugFromHost } from "@/lib/tenant/host"

/**
 * Resolves which venue this origin belongs to, and the caller's standing in it.
 *
 * Mounted inside AuthGate, not beside it: the branding lookup needs no session,
 * but resolving the caller's role does, and nesting means the role effect can
 * read a settled `session` instead of racing it.
 *
 * Same contract as AuthGate, and it is the contract that matters: this **never
 * redirects**. It resolves state and calls `router.invalidate()` so the guards
 * in beforeLoad re-run with the answer. Redirect decisions live in
 * `requireTenantMember`; render decisions live in the /crm layout.
 *
 * The apex costs nothing. `tenantSlugFromHost` is pure string parsing, so on
 * easywed.app the first effect settles to "none" synchronously on mount and no
 * request is ever issued - which is what makes v2 invisible to every existing
 * user.
 */
export function TenantGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const userId = useAuthStore((s) => s.session?.user.id)
  const isReady = useAuthStore((s) => s.isReady)
  const tenantId = useTenantStore((s) => s.tenant?.id)

  // 1. Host → slug → branding. Runs once; the host cannot change without a
  //    full page load, which remounts this anyway.
  useEffect(() => {
    const { setStatus, setSlug, setTenant } = useTenantStore.getState()

    // No `typeof window` guard needed above this: effects do not run during
    // prerender. Inside the effect, `window` is always there.
    const slug = tenantSlugFromHost(
      window.location.hostname,
      window.location.search
    )

    if (!slug) {
      setStatus("none")
      return
    }

    setSlug(slug)

    const controller = new AbortController()

    void fetchPublicTenant(slug, controller.signal).then((tenant) => {
      if (controller.signal.aborted) return

      setTenant(tenant)
      setStatus(tenant ? "resolved" : "not_found")
      void router.invalidate()
    })

    return () => controller.abort()
  }, [router])

  // 2. Session → role in this tenant.
  //
  //    Cleared on every transition rather than only on sign-out, for the same
  //    reason AuthGate clears the display name: a session can go straight from
  //    one user to another with no SIGNED_OUT between them, and holding the
  //    previous role would show one user the CRM on another's authorisation.
  //
  //    Waits on `isReady` so a signed-in user reloading the CRM is never
  //    briefly resolved as "not a member" - which would be a 403 flash on
  //    every load, since `null` is what the layout refuses on.
  useEffect(() => {
    const { setTenantRole } = useTenantStore.getState()

    if (!tenantId || !isReady) {
      setTenantRole(undefined)
      return
    }

    if (!userId) {
      // Signed out on a tenant host is a resolved answer, not a pending one:
      // the anonymous entry page is a legitimate destination.
      setTenantRole(null)
      void router.invalidate()
      return
    }

    setTenantRole(undefined)

    const controller = new AbortController()

    void fetchTenantRole(tenantId, userId, controller.signal).then((role) => {
      if (controller.signal.aborted) return

      setTenantRole(role)
      void router.invalidate()
    })

    return () => controller.abort()
  }, [tenantId, userId, isReady, router])

  return <>{children}</>
}
