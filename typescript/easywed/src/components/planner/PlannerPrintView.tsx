import { useMemo } from "react"
import { useShallow } from "zustand/react/shallow"
import { useTranslation } from "react-i18next"
import { HallBackground } from "./Canvas/HallBackground"
import { HallOutline } from "./Canvas/HallOutline"
import { TableVisual } from "./Canvas/TableVisual"
import { FixtureVisual } from "./Canvas/FixtureVisual"
import { MeasureOverlay } from "./Canvas/MeasureOverlay"
import { worldBoundsOf } from "./Canvas/utils"
import { SEAT_MAX_OFFSET_M } from "./Canvas/seatLayout"
import type { CSSProperties } from "react"
import type { TFunction } from "i18next"
import type { Guest } from "@/stores/planner.store"
import type { GuestField } from "@/lib/export/guestsCsv"
import { clampRectIntoHall } from "@/lib/geometry"
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
// Landscape only, deliberately - see the `@page` rule and the note in
// styles.css. A portrait print job is left to the engine's shrink-to-fit.

// The "table" column is never passed here (grouping carries it), so only the
// other three fields are handled.
const renderGuestFields = (
  g: Guest,
  fields: Array<GuestField>,
  t: TFunction
) => {
  const parts: Array<string> = []
  for (const f of fields) {
    if (f === "name") parts.push(g.name)
    else if (f === "dietary" && g.dietary.length > 0)
      parts.push(g.dietary.map((d) => t(`guests.dietary.${d}`)).join(", "))
    else if (f === "note" && g.note) parts.push(g.note)
  }
  return parts
}

export const PlannerPrintView = () => {
  const { t, i18n } = useTranslation()

  const fields = usePrintStore((s) => s.fields)
  const sort = usePrintStore((s) => s.sort)
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

  const { tables, guests, fixtures, halls } = usePlannerStore(
    useShallow((s) => ({
      tables: s.tables,
      guests: s.guests,
      fixtures: s.fixtures,
      halls: s.halls,
    }))
  )

  const hallsById = useMemo(() => new Map(halls.map((h) => [h.id, h])), [halls])
  // Union of the hall rects in world meters - the print frame in full mode.
  const worldBounds = useMemo(() => worldBoundsOf(halls), [halls])

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

  // Entities clamped into their own hall, in WORLD meters (hall pos + local).
  const clampedTables = useMemo(
    () =>
      tables.map((table) => {
        const hall = hallsById.get(table.hallId)
        if (!hall) return table
        const local = clampRectIntoHall(
          table.position,
          getEffectiveSize(table.size, table.rotation),
          hall
        )
        return {
          ...table,
          position: {
            x: hall.position.x + local.x,
            y: hall.position.y + local.y,
          },
        }
      }),
    [tables, hallsById]
  )

  const clampedFixtures = useMemo(
    () =>
      fixtures.map((f) => {
        const hall = hallsById.get(f.hallId)
        if (!hall) return f
        const local = clampRectIntoHall(
          f.position,
          getEffectiveSize(f.size, f.rotation),
          hall
        )
        return {
          ...f,
          position: {
            x: hall.position.x + local.x,
            y: hall.position.y + local.y,
          },
        }
      }),
    [fixtures, hallsById]
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
      return worldBounds
    }
    const pad = includeSeats ? SEAT_MAX_OFFSET_M + 0.4 : 0.4
    return {
      x: minX - pad,
      y: minY - pad,
      width: maxX - minX + pad * 2,
      height: maxY - minY + pad * 2,
    }
  }, [clampedTables, clampedFixtures, includeSeats, worldBounds])

  // Scale (px per meter) and origin offset. In fit mode we frame the content
  // bbox; otherwise the union of all hall rects.
  const { ppm, originX, originY, viewWidth, viewHeight } = useMemo(() => {
    const frame = fitToContent ? contentBounds : worldBounds
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
  }, [fitToContent, contentBounds, worldBounds])

  const { groups, unassigned } = useMemo(
    () => groupGuestsByTable(tables, guests, sort),
    [tables, guests, sort]
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
        {/* Frame reserving the canvas' box, carrying its size as CSS vars so
            the print stylesheet can size against it (see styles.css). */}
        <div
          data-print-hall-frame
          className="mx-auto"
          style={
            {
              "--print-hall-w": `${viewWidth * ppm}px`,
              "--print-hall-h": `${viewHeight * ppm}px`,
            } as CSSProperties
          }
        >
          {/* World frame: every hall floor + all entities in one coordinate
              space, so multi-room/floor layouts print on a single page. */}
          <div
            data-print-hall
            className={cn(
              "relative",
              fitToContent ? "overflow-visible" : "overflow-hidden"
            )}
            style={{ width: viewWidth * ppm, height: viewHeight * ppm }}
          >
            {halls.map((h) => (
              // Wrapper so the polygon outline and the hall label live outside
              // the clipped floor (clip-path would crop a CSS border and could
              // crop the label on shapes cut at the top-left).
              <div
                key={h.id}
                className="absolute"
                style={{
                  left: (h.position.x - originX) * ppm,
                  top: (h.position.y - originY) * ppm,
                  width: h.size.width * ppm,
                  height: h.size.height * ppm,
                }}
              >
                <HallBackground
                  hallWidth={h.size.width * ppm}
                  hallHeight={h.size.height * ppm}
                  ppm={ppm}
                  gridStyle={includeGrid ? gridStyle : "off"}
                  gridSpacing={gridSpacing}
                  geometry={h.geometry}
                  className={cn(
                    "absolute top-0 left-0",
                    // The hall outline only frames full halls; cropping (fit) drops it.
                    showHallOutline &&
                      !fitToContent &&
                      !h.geometry &&
                      "border border-planner-hall",
                    // Without the outline, render bare - no paper background, no border.
                    !showHallOutline && "bg-transparent"
                  )}
                />
                {h.geometry && showHallOutline && !fitToContent && (
                  <HallOutline
                    geometry={h.geometry}
                    size={h.size}
                    widthPx={h.size.width * ppm}
                    heightPx={h.size.height * ppm}
                    className="stroke-planner-hall"
                  />
                )}
                {halls.length > 1 && (
                  <span className="absolute top-1 left-1 text-[10px] font-medium text-gray-600">
                    {h.name.trim() ||
                      t("hall.unnamed_index", {
                        index: halls.findIndex((x) => x.id === h.id) + 1,
                      })}
                    {h.floor != null &&
                      ` · ${t("hall.floor_short", { floor: h.floor })}`}
                  </span>
                )}
              </div>
            ))}
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
                  includeSeats
                    ? (seatGuestsByTable.get(tbl.id) ?? [])
                    : undefined
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
                widthPx={viewWidth * ppm}
                heightPx={viewHeight * ppm}
                origin={{ x: originX, y: originY }}
                // mandatory props
                pendingPoint={null}
                cursorPos={null}
                activeDrag={null}
                resolvePoint={(x, y) => ({ x, y })}
                onEndpointUpdate={() => {}}
              />
            )}
          </div>
        </div>
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
                <ol className="grid grid-cols-1 gap-y-1 text-xs">
                  {tableGuests.map((g, idx) => {
                    const parts = renderGuestFields(g, fields, t)
                    return (
                      <li key={g.id} className="flex gap-1">
                        <span className="w-5 shrink-0 text-right text-gray-500">
                          {idx + 1}.
                        </span>
                        <span>{parts.join(" - ")}</span>
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
              <ol className="grid grid-cols-1 gap-y-1 text-xs">
                {unassigned.map((g, idx) => {
                  const parts = renderGuestFields(g, fields, t)
                  return (
                    <li key={g.id} className="flex gap-1">
                      <span className="w-5 shrink-0 text-right text-gray-500">
                        {idx + 1}.
                      </span>
                      <span>{parts.join(" - ")}</span>
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
