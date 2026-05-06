import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { requireAuth, requireOnboarded } from "@/lib/auth/guards"
import { supabase } from "@/lib/supabase"
import { useGlobalStore } from "@/stores/global.store"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/upgrade")({
  beforeLoad: () => {
    requireAuth("/upgrade")
    requireOnboarded()
  },
  component: Upgrade,
})

function Upgrade() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const userType = useGlobalStore((s) => s.userType)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isCouple = userType === "couple"
  const titleKey = isCouple ? "upgrade.couple.title" : "upgrade.pro.title"
  const subtitleKey = isCouple
    ? "upgrade.couple.subtitle"
    : "upgrade.pro.subtitle"
  const ctaKey = isCouple ? "upgrade.couple.cta" : "upgrade.pro.cta"

  const handleContinue = async () => {
    if (submitting) return
    setSubmitting(true)
    setError(null)

    const { error: rpcError } = await supabase.rpc("start_beta_subscription")
    if (rpcError) {
      console.error("[upgrade] start_beta_subscription failed", rpcError)
      setError(t("upgrade.error_generic"))
      setSubmitting(false)
      return
    }

    useGlobalStore.getState().setHasSubscription(true)
    void navigate({ to: "/", replace: true })
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-xl border bg-background p-6 text-center shadow-sm">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">{t(titleKey)}</h1>
          <p className="text-sm text-muted-foreground">{t(subtitleKey)}</p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button onClick={handleContinue} disabled={submitting}>
          {t(ctaKey)}
        </Button>
      </div>
    </div>
  )
}
