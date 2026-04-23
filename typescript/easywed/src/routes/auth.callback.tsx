import { useEffect } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { sanitizeNextPath } from "@/lib/auth/guards"
import { useAuthStore } from "@/stores/auth.store"

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

  useEffect(() => {
    if (!isReady) return
    if (!session) {
      navigate({ to: "/login", search: next ? { next } : {}, replace: true })
      return
    }
    navigate({ to: sanitizeNextPath(next) ?? "/", replace: true })
  }, [isReady, session, next, navigate])

  return (
    <div className="flex min-h-svh items-center justify-center p-6 text-sm text-muted-foreground">
      {t("auth.signing_you_in")}
    </div>
  )
}
