import { useEffect } from "react"
import { useLocation, useNavigate } from "@tanstack/react-router"
import { useAuthStore } from "@/stores/auth.store"
import { supabase } from "@/lib/supabase"

const PUBLIC_PATHS = ["/login", "/auth/callback"]

export function AuthGate({ children }: { children: React.ReactNode }) {
  const session = useAuthStore((s) => s.session)
  const isReady = useAuthStore((s) => s.isReady)
  const setSession = useAuthStore((s) => s.setSession)
  const setReady = useAuthStore((s) => s.setReady)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch((err: unknown) => console.error("[auth] getSession failed", err))
      .finally(() => setReady(true))

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => subscription.unsubscribe()
  }, [setSession, setReady])

  useEffect(() => {
    if (!isReady) return

    const isPublic = PUBLIC_PATHS.includes(pathname)

    if (!session && !isPublic) {
      navigate({ to: "/login" })
    } else if (session && pathname === "/login") {
      navigate({ to: "/" })
    }
  }, [isReady, session, pathname, navigate])

  if (!isReady) return null

  return <>{children}</>
}
