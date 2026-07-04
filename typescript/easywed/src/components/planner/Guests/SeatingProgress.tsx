import { useTranslation } from "react-i18next"

type SeatingProgressProps = {
  seated: number
  total: number
}

export const SeatingProgress = ({ seated, total }: SeatingProgressProps) => {
  const { t } = useTranslation()
  const pct = total > 0 ? Math.round((seated / total) * 100) : 0

  return (
    <div className="rounded-2xl border bg-card p-3.5">
      <div className="mb-2.5 flex items-baseline justify-between">
        <span className="text-[13px] font-semibold">
          {t("guests.progress")}
        </span>
        <span className="text-[13px] text-muted-foreground">
          {t("guests.seated_ratio", { count: total, seated_count: seated })}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
