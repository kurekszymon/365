import { useTranslation } from "react-i18next"
import { usePlannerStore } from "@/stores/planner"

export const GuestsSeated = () => {
  const { t } = useTranslation()

  const tables = usePlannerStore((state) => state.tables)
  const guests = usePlannerStore((state) => state.guests)

  const assignedGuestsCount = guests.filter((g) => g.tableId).length

  return (
    <span className="hidden text-xs text-muted-foreground tabular-nums sm:block">
      {t("tables.count", { count: tables.length })} ·{" "}
      {t("guests.seated_ratio", {
        count: guests.length,
        seated_count: assignedGuestsCount,
      })}
    </span>
  )
}
