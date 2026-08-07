import { useEffect } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { sanitizeNextPath } from "@/lib/auth/guards"
import { useAuthStore } from "@/stores/auth.store"
import { useProfileStore } from "@/stores/profile.store"

type CallbackSearch = { next?: string }

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
  validateSearch: (s: Record<string, unknown>): CallbackSearch => ({
    next: typeof s.next === "string" ? s.next : undefined,
  }),
})

function AuthCallback() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { next } = Route.useSearch()
  const session = useAuthStore((s) => s.session)
  const isReady = useAuthStore((s) => s.isReady)
  const termsStatus = useProfileStore((s) => s.termsStatus)

  useEffect(() => {
    if (!isReady) return
    if (!session) {
      // Only set ?next= if not root
      navigate({
        to: "/login",
        search: next && next !== "/" ? { next } : {},
        replace: true,
      })
      return
    }

    // Hold the "signing you in" screen until AuthGate has resolved whether this
    // user owes an acceptance. Leaving early still ends up in the right place -
    // the root guard would catch them - but only after a frame of the app they
    // are not supposed to see yet.
    if (termsStatus === "unknown") return

    navigate({ to: sanitizeNextPath(next) ?? "/home", replace: true })
  }, [isReady, session, termsStatus, next, navigate])

  return (
    <div className="flex min-h-svh items-center justify-center p-6 text-sm text-muted-foreground">
      {t("auth.signing_you_in")}
    </div>
  )
}
