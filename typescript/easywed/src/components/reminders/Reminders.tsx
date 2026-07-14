import { ArrowLeftIcon } from "lucide-react"
import { Link, useParams } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { CreateReminderPopover } from "./preview/CreateReminderPopover"
import { ReminderList } from "./preview/ReminderListPreview"
import { useRemindersStore } from "@/stores/reminders.store"

export const Reminders = () => {
  const { t } = useTranslation()
  const { id } = useParams({ from: "/wedding/$id/reminders" })
  const count = useRemindersStore((state) => state.reminders.length)

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to="/wedding/$id/planner"
            params={{ id }}
            title={t("reminders.back")}
            aria-label={t("reminders.back")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <h1 className="truncate text-2xl font-bold tracking-tight">
            {t("reminders.title")}
          </h1>
        </div>
        <CreateReminderPopover />
      </div>

      {count === 0 ? (
        <p className="text-sm text-muted-foreground">{t("reminders.empty")}</p>
      ) : (
        <ReminderList />
      )}
    </div>
  )
}
