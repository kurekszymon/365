import { useEffect } from "react"
import { useRouter, useRouterState } from "@tanstack/react-router"
import { toast } from "sonner"
import { useAuthStore } from "@/stores/auth.store"
import { useProfileStore } from "@/stores/profile.store"
import { fetchDisplayName } from "@/lib/sync/profile"
import {
  fetchTermsStatus,
  recordPendingTermsAcceptance,
} from "@/lib/sync/termsAcceptance"
import { supabase } from "@/lib/supabase"
import i18n from "@/i18n"

// Routes that render immediately without waiting for session hydration.
// Auth state still hydrates in the background for opportunistic use.
const PUBLIC_PATHS = [
  "/",
  "/home",
  "/login",
  "/signup",
  "/auth/callback",
  "/pl",
  "/en",
  "/wedding/local",
]

// Hydrates the Supabase session into the auth store and re-runs router
// matches on any auth change. Route-level beforeLoad handlers own the
// actual redirect decisions (see src/routes/index.tsx, wedding.$id.tsx,
// reminders/index.tsx, login.tsx, invite.$token.tsx).
export function AuthGate({ children }: { children: React.ReactNode }) {
  const isReady = useAuthStore((s) => s.isReady)
  const setSession = useAuthStore((s) => s.setSession)
  const setReady = useAuthStore((s) => s.setReady)
  const userId = useAuthStore((s) => s.session?.user.id)
  const router = useRouter()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch((err: unknown) => {
        console.error("[auth] getSession failed", err)
        toast.error(i18n.t("auth.session_failed"), { id: "auth-error" })
      })
      .finally(() => {
        setReady(true)
        void router.invalidate()
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        void router.invalidate()
      }
    })

    return () => subscription.unsubscribe()
  }, [setSession, setReady, router])

  // The user's own display name, kept next to the session it belongs to.
  //
  // Cleared on every transition, not just sign-out: a session can go straight
  // from one user to another with no SIGNED_OUT in between - another tab
  // signing in broadcasts SIGNED_IN here, and the getSession() and
  // onAuthStateChange calls above can resolve in either order. Holding the
  // previous name until the new fetch lands would show it under the wrong
  // account. Costs nothing in the common path: the store already starts empty,
  // so this is a no-op on first mount, and the effect doesn't re-run while
  // userId is unchanged.
  useEffect(() => {
    const { setDisplayName, setLoaded, reset } = useProfileStore.getState()

    reset()

    if (!userId) return

    const controller = new AbortController()

    fetchDisplayName(userId, controller.signal).then((name) => {
      if (controller.signal.aborted) return
      setDisplayName(name)
      setLoaded(true)
    })

    return () => controller.abort()
  }, [userId])

  // Whether this user still owes an acceptance of the Regulamin, parked in the
  // profile store so route guards can read it synchronously in beforeLoad (see
  // requireAcceptedTerms), then invalidated so they re-run with the answer.
  //
  // The write has to come first: a Google sign-up ticked the box but had no
  // session to record it with until now, and reading before that write lands
  // would send someone who already accepted to the gate anyway.
  useEffect(() => {
    if (!userId) return

    const controller = new AbortController()

    const resolve = async () => {
      await recordPendingTermsAcceptance(userId)

      const status = await fetchTermsStatus(userId)
      if (controller.signal.aborted) return

      useProfileStore.getState().setTermsStatus(status)
      void router.invalidate()
    }

    void resolve()

    return () => controller.abort()
  }, [userId, router])

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )
  if (!isReady && !isPublic) return null

  return <>{children}</>
}
