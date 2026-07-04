import { useTranslation } from "react-i18next"
import type { Lang } from "./LocaleLanding"

// Decorative, CSS-only mock of the planner canvas for the landing hero. Uses
// the planner-* palette tokens so it recolors with the active theme like the
// real canvas. Sizes are px (not %) so the seat-dot orbit math stays exact.
const ROUND_TABLES: Array<{
  left: string
  top: string
  size: number
  seats: number
  selected?: boolean
}> = [
  { left: "18%", top: "48%", size: 72, seats: 8, selected: true },
  { left: "82%", top: "48%", size: 72, seats: 8 },
  { left: "30%", top: "80%", size: 60, seats: 6 },
  { left: "70%", top: "80%", size: 60, seats: 6 },
]

export function PlannerPreview({ lang }: { lang: Lang }) {
  const { t } = useTranslation()

  return (
    <div
      aria-hidden
      className="relative aspect-4/3 w-full overflow-hidden rounded-2xl border bg-planner-hall shadow-xl"
    >
      {/* dance floor */}
      <div className="absolute top-[46%] left-1/2 h-[30%] w-[36%] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-dashed border-planner-table-border bg-planner-soft" />

      {/* head table */}
      <div className="absolute top-[7%] left-1/2 w-[44%] -translate-x-1/2 rounded-md border-2 border-planner-table-border bg-planner-table py-2 text-center text-[10px] font-medium text-planner-table-foreground shadow-sm sm:text-xs">
        {t("landing.preview.head_table", { lng: lang })}
      </div>

      {ROUND_TABLES.map(({ left, top, size, seats, selected }, i) => (
        <div
          key={i}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left, top, width: size, height: size }}
        >
          <div
            className={
              "absolute inset-0 rounded-full border-2 border-planner-table-border bg-planner-table shadow-sm" +
              (selected ? " ring-2 ring-planner-selected ring-offset-2" : "")
            }
          />
          {Array.from({ length: seats }, (_, seat) => (
            <span
              key={seat}
              className="absolute top-1/2 left-1/2 size-2 rounded-full bg-planner-table-border"
              style={{
                transform: `translate(-50%, -50%) rotate(${(360 / seats) * seat}deg) translateY(-${size / 2 + 7}px)`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
