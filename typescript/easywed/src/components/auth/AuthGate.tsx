import { useEffect } from "react"
import { useRouter, useRouterState } from "@tanstack/react-router"
import type { UserType } from "@/stores/global.store"
import { useAuthStore } from "@/stores/auth.store"
import { useGlobalStore } from "@/stores/global.store"
import { supabase } from "@/lib/supabase"

// Routes that render immediately without waiting for session hydration.
// Auth state still hydrates in the background for opportunistic use.
const PUBLIC_PATHS = ["/login", "/auth/callback", "/invitations"]

async function loadProfile(userId: string) {
  const [profileRes, subRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("user_type, display_name")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle(),
  ])

  // On a transient error keep userType undefined (not null) so the caller
  // doesn't misinterpret the failure as "needs onboarding" and wipe an
  // existing role by redirecting an already-onboarded user to /onboarding.
  if (profileRes.error) {
    console.error("[auth] loadProfile failed", profileRes.error)
    return
  }

  const { setUserType, setHasSubscription } = useGlobalStore.getState()
  // null means row exists but user_type not set (pre-onboarding)
  setUserType(
    (profileRes.data?.user_type as UserType | null | undefined) ?? null
  )
  setHasSubscription(!!subRes.data)
}

// Hydrates the Supabase session into the auth store and re-runs router
// matches on any auth change. Route-level beforeLoad handlers own the
// actual redirect decisions (see src/routes/index.tsx, wedding.$id.tsx,
// reminders/index.tsx, login.tsx, invite.$token.tsx).
export function AuthGate({ children }: { children: React.ReactNode }) {
  const isReady = useAuthStore((s) => s.isReady)
  const setSession = useAuthStore((s) => s.setSession)
  const setReady = useAuthStore((s) => s.setReady)
  const router = useRouter()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        setSession(data.session)
        if (data.session?.user.id) {
          await loadProfile(data.session.user.id)
        }
      })
      .catch((err: unknown) => console.error("[auth] getSession failed", err))
      .finally(() => {
        setReady(true)
        void router.invalidate()
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      setSession(nextSession)
      if (nextSession?.user.id) {
        await loadProfile(nextSession.user.id)
      } else {
        // undefined = unknown, not null = "needs onboarding". Using null here
        // would cause requireOnboarded() to redirect to /onboarding if the
        // next SIGNED_IN event hits a transient loadProfile error.
        const store = useGlobalStore.getState()
        store.setUserType(undefined)
        store.setHasSubscription(undefined)
      }
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        void router.invalidate()
      }
    })

    return () => subscription.unsubscribe()
  }, [setSession, setReady, router])

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )
  if (!isReady && !isPublic) return null

  return <>{children}</>
}
