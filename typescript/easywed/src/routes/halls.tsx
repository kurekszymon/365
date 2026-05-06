import { useState } from "react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import type { HallCatalogEntry } from "@/components/halls/HallCatalog"
import { requireAuth, requireOnboarded } from "@/lib/auth/guards"
import { HallCatalog } from "@/components/halls/HallCatalog"
import { StartWeddingDialog } from "@/components/halls/StartWeddingDialog"

export const Route = createFileRoute("/halls")({
  beforeLoad: () => {
    requireAuth("/halls")
    requireOnboarded()
  },
  component: HallsPage,
})

function HallsPage() {
  const { t } = useTranslation()
  const [picked, setPicked] = useState<HallCatalogEntry | null>(null)

  return (
    <div className="flex min-h-svh flex-col items-center p-6">
      <div className="flex w-full max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{t("halls.catalog.title")}</h1>
          <Link
            to="/"
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            {t("errors.go_home")}
          </Link>
        </div>

        <HallCatalog onPick={setPicked} />

        <StartWeddingDialog
          hall={picked}
          onOpenChange={(open) => {
            if (!open) setPicked(null)
          }}
        />
      </div>
    </div>
  )
}
