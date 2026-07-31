import { Link, createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { ArrowLeftIcon } from "lucide-react"
import { requireAuth } from "@/lib/auth/guards"
import { DisplayNameForm } from "@/components/settings/DisplayNameForm"

export const Route = createFileRoute("/settings")({
  beforeLoad: () => {
    requireAuth("/settings")
  },
  component: Settings,
})

function Settings() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-svh justify-center p-6">
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Link
            to="/home"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            {t("settings.back")}
          </Link>
          <h1 className="font-heading text-2xl font-semibold">
            {t("settings.title")}
          </h1>
        </div>

        <DisplayNameForm />
      </div>
    </div>
  )
}
