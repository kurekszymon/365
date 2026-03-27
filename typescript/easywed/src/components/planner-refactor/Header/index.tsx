import { useTranslation } from "react-i18next"
import { usePlannerStore } from "@/stores/planner"
import { useGlobalStore } from "@/stores/global"
import { useDialogStore } from "@/stores/dialog"

export const Header = () => {
  const { t } = useTranslation()

  const openDialog = useDialogStore((state) => state.open)

  const name = useGlobalStore((state) => state.name)

  const tables = usePlannerStore((state) => state.tables)
  const guests = usePlannerStore((state) => state.guests)

  const assignedGuestsCount = guests.filter((g) => g.tableId).length

  return (
    <div className="flex items-center justify-between gap-2 border-b bg-background px-3 py-2 print:hidden">
      {/* Left: wedding name + stats */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          className="max-w-[140px] truncate text-sm font-semibold underline-offset-2 hover:underline sm:max-w-none"
          onClick={() => {
            openDialog("Wedding.Rename")
          }}
          title={t("wedding.rename")}
        >
          {name}
        </button>
        <span className="hidden text-xs text-muted-foreground tabular-nums sm:block">
          {t("tables.count", { count: tables.length })} ·{" "}
          {t("guests.seated_ratio", {
            count: guests.length,
            seated_count: assignedGuestsCount,
          })}
        </span>
      </div>

      {/* Right: actions */}
      <div></div>
    </div>
  )
}
