import { useMemo } from "react"
import { useShallow } from "zustand/react/shallow"
import { useTranslation } from "react-i18next"
import { HallBackground } from "./Canvas/HallBackground"
import { TableVisual } from "./Canvas/TableVisual"
import { FixtureVisual } from "./Canvas/FixtureVisual"
import { MeasureOverlay } from "./Canvas/MeasureOverlay"
import { clampToHall } from "./Canvas/utils"
import { SEAT_MAX_OFFSET_M } from "./Canvas/seatLayout"
import type { Guest } from "@/stores/planner.store"
import type { GuestField } from "@/lib/export/guestsCsv"
import { getEffectiveSize, usePlannerStore } from "@/stores/planner.store"
import { useGlobalStore } from "@/stores/global.store"
import { usePrintStore } from "@/stores/print.store"
import { useViewStore } from "@/stores/view.store"
import { useMeasuresStore } from "@/stores/measures.store"
import { groupGuestsByTable } from "@/lib/export/guests"
import { cn } from "@/lib/utils"

// TODO: only planner is printable - other pages would be blank
// A4 landscape minus 10mm margins ≈ 277mm × 190mm.
// At 96 CSS DPI that's ~1047 × 718 px.
const PRINT_AREA_PX = { width: 1047, height: 718 }
// The hall section uses p-6 (24px each side). Subtract from both axes so the
// scaled hall + padding fits within one page without triggering a mid-section break.
const SECTION_PADDING_PX = 48

// The "table" column is never passed here (grouping carries it), so only the
// other three fields are handled.
const renderGuestFields = (g: Guest, fields: Array<GuestField>) => {
  const parts: Array<string> = []
  for (const f of fields) {
    if (f === "name") parts.push(g.name)
    else if (f === "dietary" && g.dietary.length > 0)
      parts.push(g.dietary.join(", "))
    else if (f === "note" && g.note) parts.push(g.note)
  }
  return parts
}

export const PlannerPrintView = () => {
  const { t, i18n } = useTranslation()

  const fields = usePrintStore((s) => s.fields)
  const {
    includeSeats,
    seatsShowEmpty,
    includeGrid,
    showHallOutline,
    fitToContent,
  } = usePrintStore(
    useShallow((s) => ({
      includeSeats: s.includeSeats,
      seatsShowEmpty: s.seatsShowEmpty,
      includeGrid: s.includeGrid,
      showHallOutline: s.showHallOutline,
      fitToContent: s.fitToContent,
    }))
  )

  const { name, date } = useGlobalStore(
    useShallow((s) => ({ name: s.name, date: s.date }))
  )

  const weddingId = useGlobalStore((s) => s.weddingId)
  const byWedding = useMeasuresStore((s) => s.byWedding)
  const measurements = weddingId ? (byWedding[weddingId] ?? []) : []

  const { tables, guests, fixtures, hall } = usePlannerStore(
    useShallow((s) => ({
      tables: s.tables,
      guests: s.guests,
      fixtures: s.fixtures,
      hall: s.hall.dimensions,
    }))
  )

  const { gridStyle, gridSpacing } = useViewStore(
    useShallow((s) => ({
      gridStyle: s.gridStyle,
      gridSpacing: s.gridSpacing,
    }))
  )

  const assignedCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const tbl of tables) m.set(tbl.id, 0)
    for (const g of guests) {
      if (g.tableId) m.set(g.tableId, (m.get(g.tableId) ?? 0) + 1)
    }
    return m
  }, [tables, guests])

  const clampedTables = useMemo(
    () =>
      tables.map((table) => ({
        ...table,
        position: clampToHall(
          table.position,
          getEffectiveSize(table.size, table.rotation),
          hall.width,
          hall.height
        ),
      })),
    [tables, hall]
  )

  const clampedFixtures = useMemo(
    () =>
      fixtures.map((f) => ({
        ...f,
        position: clampToHall(
          f.position,
          getEffectiveSize(f.size, f.rotation),
          hall.width,
          hall.height
        ),
      })),
    [fixtures, hall]
  )

  // Tightest rect (meters) around the placed tables + fixtures, padded so seat
  // markers (which sit outside the table edge) aren't clipped. Falls back to the
  // full hall when there's nothing to frame. Used only in fit-to-content mode.
  const contentBounds = useMemo(() => {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    const add = (x: number, y: number, w: number, h: number) => {
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x + w)
      maxY = Math.max(maxY, y + h)
    }
    for (const tbl of clampedTables) {
      const s = getEffectiveSize(tbl.size, tbl.rotation)
      add(
        tbl.position.x,
        tbl.position.y,
        s.width,
        tbl.shape === "round" ? s.width : s.height
      )
    }
    for (const fix of clampedFixtures) {
      const s = getEffectiveSize(fix.size, fix.rotation)
      add(fix.position.x, fix.position.y, s.width, s.height)
    }
    if (!Number.isFinite(minX)) {
      return { x: 0, y: 0, width: hall.width, height: hall.height }
    }
    const pad = includeSeats ? SEAT_MAX_OFFSET_M + 0.4 : 0.4
    return {
      x: minX - pad,
      y: minY - pad,
      width: maxX - minX + pad * 2,
      height: maxY - minY + pad * 2,
    }
  }, [clampedTables, clampedFixtures, includeSeats, hall.width, hall.height])

  // Scale (px per meter) and origin offset. In fit mode we frame the content
  // bbox; otherwise the full hall (origin 0,0) as before.
  const { ppm, originX, originY, viewWidth, viewHeight } = useMemo(() => {
    const frame = fitToContent
      ? contentBounds
      : { x: 0, y: 0, width: hall.width, height: hall.height }
    const fit =
      frame.width <= 0 || frame.height <= 0
        ? 40
        : Math.floor(
            Math.min(
              (PRINT_AREA_PX.width - SECTION_PADDING_PX) / frame.width,
              (PRINT_AREA_PX.height - SECTION_PADDING_PX) / frame.height
            )
          )
    return {
      ppm: fit,
      originX: frame.x,
      originY: frame.y,
      viewWidth: frame.width,
      viewHeight: frame.height,
    }
  }, [fitToContent, contentBounds, hall.width, hall.height])

  const { groups, unassigned } = useMemo(
    () => groupGuestsByTable(tables, guests),
    [tables, guests]
  )

  // Guests grouped by tableId for seat rendering. TableSeats resolves seatId
  // pinning vs order-fill internally, so we just hand it every guest at the table.
  const seatGuestsByTable = useMemo(() => {
    const m = new Map<string, Array<Guest>>()
    if (!includeSeats) return m
    for (const g of guests) {
      if (!g.tableId) continue
      const arr = m.get(g.tableId)
      if (arr) arr.push(g)
      else m.set(g.tableId, [g])
    }
    return m
  }, [guests, includeSeats])

  const unassignedLabel = t("export.unassigned")

  const generatedStr = new Date().toLocaleDateString(i18n.language)
  const weddingDateStr = date ? date.toLocaleDateString(i18n.language) : null
  const totalGuests = guests.length
  const seatedGuests = guests.filter((g) => g.tableId).length

  return (
    <div
      data-print-view
      className="fixed inset-0 z-[9999] hidden overflow-auto bg-white text-black print:block"
    >
      <section className="relative flex flex-col items-center justify-center gap-6 p-6 print:min-h-[190mm]">
        <span className="text-7xl font-bold tracking-widest text-gray-800">
          easywed.
        </span>

        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-3xl font-semibold">{name || t("wedding")}</h1>
          {weddingDateStr && (
            <p className="text-base text-gray-700">
              {t("export.pdf.wedding_date", { date: weddingDateStr })}
            </p>
          )}
        </div>

        <p className="text-sm text-gray-600">
          {t("tables.count", { count: tables.length })} · {seatedGuests}/
          {totalGuests} {t("guests").toLowerCase()}
        </p>

        <p className="absolute bottom-6 text-xs text-gray-500">
          {t("export.pdf.generated_on", { date: generatedStr })}
        </p>
      </section>

      <section className="flex items-center justify-center p-6 print:min-h-[190mm] print:break-before-page print:break-inside-avoid">
        <HallBackground
          hallWidth={viewWidth * ppm}
          hallHeight={viewHeight * ppm}
          ppm={ppm}
          gridStyle={includeGrid ? gridStyle : "off"}
          gridSpacing={gridSpacing}
          className={cn(
            fitToContent ? "overflow-visible" : "overflow-hidden",
            // The hall outline only frames the full hall; cropping (fit) drops it.
            showHallOutline && !fitToContent && "border border-planner-hall",
            // Without the outline, render bare — no paper background, no border.
            !showHallOutline && "bg-transparent"
          )}
        >
          {clampedTables.map((tbl) => (
            <TableVisual
              key={tbl.id}
              table={{
                ...tbl,
                position: {
                  x: tbl.position.x - originX,
                  y: tbl.position.y - originY,
                },
              }}
              guestsAssigned={assignedCounts.get(tbl.id) ?? 0}
              ppm={ppm}
              showSeats={includeSeats}
              seatGuests={
                includeSeats ? (seatGuestsByTable.get(tbl.id) ?? []) : undefined
              }
              showEmpty={seatsShowEmpty}
            />
          ))}
          {clampedFixtures.map((fix) => (
            <FixtureVisual
              key={fix.id}
              fixture={{
                ...fix,
                position: {
                  x: fix.position.x - originX,
                  y: fix.position.y - originY,
                },
              }}
              ppm={ppm}
            />
          ))}
          {!fitToContent && (
            <MeasureOverlay
              measurements={measurements}
              ppm={ppm}
              hallWidthPx={hall.width * ppm}
              hallHeightPx={hall.height * ppm}
              // mandatory props
              pendingPoint={null}
              cursorPos={null}
              activeDrag={null}
              resolvePoint={(x, y) => ({ x, y })}
              onEndpointUpdate={() => {}}
            />
          )}
        </HallBackground>
      </section>

      <section className="p-6 print:break-before-page">
        <h2 className="mb-4 text-lg font-semibold">{t("guests")}</h2>

        <div className="flex flex-col gap-5">
          {groups.map(({ table, guests: tableGuests }) => (
            <div key={table.id} className="break-inside-avoid">
              <h3 className="mb-2 text-sm font-semibold">
                {t("export.csv.section.table", {
                  name: table.name,
                  seated: tableGuests.length,
                  capacity: table.capacity,
                })}
              </h3>
              {tableGuests.length === 0 ? (
                <p className="text-xs text-gray-500">
                  {t("export.csv.preview_no_guests")}
                </p>
              ) : (
                <ol className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                  {tableGuests.map((g, idx) => {
                    const parts = renderGuestFields(g, fields)
                    return (
                      <li key={g.id} className="flex gap-1">
                        <span className="w-5 shrink-0 text-right text-gray-500">
                          {idx + 1}.
                        </span>
                        <span>{parts.join(" — ")}</span>
                      </li>
                    )
                  })}
                </ol>
              )}
            </div>
          ))}

          {unassigned.length > 0 && (
            <div className="break-inside-avoid">
              <h3 className="mb-2 text-sm font-semibold">
                {t("export.csv.section.unassigned", {
                  label: unassignedLabel,
                  count: unassigned.length,
                })}
              </h3>
              <ol className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                {unassigned.map((g, idx) => {
                  const parts = renderGuestFields(g, fields)
                  return (
                    <li key={g.id} className="flex gap-1">
                      <span className="w-5 shrink-0 text-right text-gray-500">
                        {idx + 1}.
                      </span>
                      <span>{parts.join(" — ")}</span>
                    </li>
                  )
                })}
              </ol>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
