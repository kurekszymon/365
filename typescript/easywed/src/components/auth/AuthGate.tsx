import { useEffect } from "react"
import { useRouter, useRouterState } from "@tanstack/react-router"
import type { UserType } from "@/stores/global.store"
import { useAuthStore } from "@/stores/auth.store"
import { useGlobalStore } from "@/stores/global.store"
import { supabase } from "@/lib/supabase"

// Routes that render immediately without waiting for session hydration.
// Auth state still hydrates in the background for opportunistic use.
const PUBLIC_PATHS = ["/login", "/auth/callback", "/invitations"]

// Hydrates the Supabase session into the auth store and re-runs router
// matches on any auth change. Route-level beforeLoad handlers own the
// actual redirect decisions (see src/routes/index.tsx, wedding.$id.tsx,
// reminders/index.tsx, login.tsx, invite.$token.tsx).
export function AuthGate({ children }: { children: React.ReactNode }) {
  const isReady = useAuthStore((s) => s.isReady)
  const setSession = useAuthStore((s) => s.setSession)
  const setReady = useAuthStore((s) => s.setReady)
  const setUserType = useGlobalStore((s) => s.setUserType)
  const router = useRouter()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  useEffect(() => {
    const loadProfile = async (userId: string) => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", userId)
        .maybeSingle()

      if (error) {
        // Leave userType undefined so requireOnboarded does not falsely
        // redirect to /onboarding when the fetch is just transient.
        console.error("[auth] loadProfile failed", error)
        return
      }

      const raw = data?.user_type ?? null
      setUserType(raw === "couple" || raw === "venue" ? (raw as UserType) : null)
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session)
        if (data.session) void loadProfile(data.session.user.id)
      })
      .catch((err: unknown) => console.error("[auth] getSession failed", err))
      .finally(() => {
        setReady(true)
        void router.invalidate()
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      if (event === "SIGNED_IN" && nextSession) {
        void loadProfile(nextSession.user.id)
      }
      if (event === "SIGNED_OUT") {
        setUserType(undefined)
      }
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        void router.invalidate()
      }
    })

    return () => subscription.unsubscribe()
  }, [setSession, setReady, setUserType, router])

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )
  if (!isReady && !isPublic) return null

  return <>{children}</>
}
