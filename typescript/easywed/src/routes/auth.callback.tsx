import { useEffect } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "@/stores/auth.store"

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
})

function AuthCallback() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const session = useAuthStore((s) => s.session)
  const isReady = useAuthStore((s) => s.isReady)

  useEffect(() => {
    if (!isReady) return
    navigate({ to: session ? "/" : "/login", replace: true })
  }, [isReady, session, navigate])

  return (
    <div className="flex min-h-svh items-center justify-center p-6 text-sm text-muted-foreground">
      {t("auth.signing_you_in")}
    </div>
  )
}
