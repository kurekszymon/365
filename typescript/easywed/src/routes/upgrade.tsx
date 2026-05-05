import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { requireAuth } from "@/lib/auth/guards"
import { useGlobalStore } from "@/stores/global.store"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/upgrade")({
  beforeLoad: () => {
    requireAuth("/upgrade")
  },
  component: Upgrade,
})

function Upgrade() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const userType = useGlobalStore((s) => s.userType)

  const handleContinue = () => {
    if (userType === "venue") {
      void navigate({ to: "/venue/templates", replace: true })
    } else {
      void navigate({ to: "/", replace: true })
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-xl border bg-background p-6 text-center shadow-sm">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">{t("upgrade.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("upgrade.subtitle")}
          </p>
        </div>

        <div className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
          {t("upgrade.coming_soon")}
        </div>

        <Button onClick={handleContinue}>{t("upgrade.continue")}</Button>
      </div>
    </div>
  )
}
