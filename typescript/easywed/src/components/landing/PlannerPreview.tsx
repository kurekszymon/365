import { useTranslation } from "react-i18next"
import type { Lang } from "./LocaleLanding"

// Decorative, CSS-only mock of the planner canvas for the landing hero. The
// class recipes are copied from the real canvas so it looks like the app:
// hall grid from HallBackground/gridBackground, tables from TableVisual,
// seat markers from TableSeats, the selection ring from DraggableTable, and
// the dance-floor fixture from FixtureVisual.
const GRID_COLOR = "rgb(148 163 184 / 0.5)"

const ROUND_TABLES: Array<{
  left: string
  top: string
  size: number
  seats: number
  occupied: number
  selected?: boolean
}> = [
  { left: "18%", top: "48%", size: 76, seats: 8, occupied: 3, selected: true },
  { left: "82%", top: "48%", size: 76, seats: 8, occupied: 8 },
  { left: "30%", top: "81%", size: 62, seats: 6, occupied: 2 },
  { left: "70%", top: "81%", size: 62, seats: 6, occupied: 0 },
]

export function PlannerPreview({ lang }: { lang: Lang }) {
  const { t } = useTranslation()

  return (
    <div
      aria-hidden
      className="relative aspect-4/3 w-full overflow-hidden rounded-2xl border bg-background shadow-xl"
      style={{
        backgroundImage: `linear-gradient(${GRID_COLOR} 1px, transparent 1px), linear-gradient(90deg, ${GRID_COLOR} 1px, transparent 1px)`,
        backgroundSize: "44px 44px",
        backgroundPosition: "-0.5px -0.5px",
      }}
    >
      {/* dance floor (fixture) */}
      <div className="absolute top-[46%] left-1/2 flex h-[28%] w-[34%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg border border-slate-400 bg-slate-200 shadow-sm" />

      {/* head table */}
      <div className="absolute top-[6%] left-1/2 flex w-[42%] -translate-x-1/2 flex-col items-center justify-center rounded-lg border border-planner-table-border bg-planner-table py-2 leading-tight text-planner-table-foreground shadow-sm">
        <span className="max-w-full truncate font-heading text-xs font-semibold">
          {t("landing.preview.head_table", { lng: lang })}
        </span>
        <span className="max-w-full truncate text-[10px] text-planner-table-foreground/75 tabular-nums">
          8 / 8
        </span>
      </div>

      {ROUND_TABLES.map(({ left, top, size, seats, occupied, selected }, i) => (
        <div
          key={i}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left, top, width: size, height: size }}
        >
          <div
            className={
              "absolute inset-0 flex items-center justify-center rounded-full border border-planner-table-border bg-planner-table text-planner-table-foreground shadow-sm" +
              (selected
                ? " ring-2 ring-planner-selected ring-offset-2 ring-offset-background"
                : "")
            }
          >
            <span className="text-[10px] text-planner-table-foreground/75 tabular-nums">
              {occupied} / {seats}
            </span>
          </div>
          {/* Seat colors match the seat-marker restyle: occupied chairs use
              the planner-selected accent (terracotta in sage), free chairs
              the muted table-border tone. */}
          {Array.from({ length: seats }, (_, seat) => (
            <span
              key={seat}
              className={
                "absolute top-1/2 left-1/2 size-2.5 rounded-full " +
                (seat < occupied
                  ? "bg-planner-selected shadow-sm"
                  : "bg-planner-table-border")
              }
              style={{
                transform: `translate(-50%, -50%) rotate(${(360 / seats) * seat}deg) translateY(-${size / 2 + 8}px)`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
