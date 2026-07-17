import { memo } from "react"
import { useDraggable } from "@dnd-kit/core"
import { useTranslation } from "react-i18next"
import { HallBackground } from "./HallBackground"
import { DraggableTable } from "./DraggableTable"
import { DraggableFixture } from "./DraggableFixture"
import { DimensionLabel } from "./DimensionLabel"
import type { Fixture, Guest, Hall, Table } from "@/stores/planner.store"
import type { GridSpacing, GridStyle } from "@/stores/view.store"
import { cn } from "@/lib/utils"
import { usePanelStore } from "@/stores/panel.store"
import { useViewStore } from "@/stores/view.store"
import { useIsMobile } from "@/hooks/useMediaQuery"

interface HallViewProps {
  hall: Hall
  // Px offset of the hall inside the world wrapper (static during pan - the
  // wrapper itself translates; this only changes when a hall moves/resizes).
  left: number
  top: number
  ppm: number
  zoom: number
  gridStyle: GridStyle
  gridSpacing: GridSpacing
  // This hall's entities, positions already clamped into the hall.
  tables: Array<Table>
  fixtures: Array<Fixture>
  guestsByTableId: Map<string, Array<Guest>>
  showSeats: boolean
  // Ring highlight while an entity drag hovers over this hall.
  isDropTarget?: boolean
}

const HallViewBase = ({
  hall,
  left,
  top,
  ppm,
  zoom,
  gridStyle,
  gridSpacing,
  tables,
  fixtures,
  guestsByTableId,
  showSeats,
  isDropTarget,
}: HallViewProps) => {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const openHallEdit = usePanelStore((state) => state.openHallEdit)
  const isMeasuring = useViewStore((state) => state.isMeasuring)

  // The hall is dragged by its label chip only - the floor itself stays a pan
  // surface. The chip's drag transform previews the whole hall group.
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `hall-${hall.id}`,
    data: { type: "hall-drag", hallId: hall.id },
    disabled: isMeasuring,
  })

  const widthPx = hall.size.width * ppm
  const heightPx = hall.size.height * ppm

  const label = [
    hall.name.trim() || t("hall.unnamed"),
    hall.floor != null ? t("hall.floor_short", { floor: hall.floor }) : null,
    `${hall.size.width}×${hall.size.height} m`,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <div
      className="absolute"
      style={{
        left,
        top,
        width: widthPx,
        height: heightPx,
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        zIndex: transform ? 30 : undefined,
      }}
    >
      <HallBackground
        hallWidth={widthPx}
        hallHeight={heightPx}
        ppm={ppm}
        gridStyle={gridStyle}
        gridSpacing={gridSpacing}
        zoom={zoom}
        className={cn(
          "absolute top-0 left-0 z-10 shadow-sm ring-1 ring-planner-hall/70",
          isDropTarget && "ring-2 ring-planner-selected"
        )}
      >
        {tables.map((table) => (
          <DraggableTable
            key={table.id}
            table={table}
            guestsAssigned={guestsByTableId.get(table.id)?.length ?? 0}
            ppm={ppm}
            seatGuests={guestsByTableId.get(table.id) ?? []}
            showSeats={showSeats}
          />
        ))}
        {fixtures.map((fixture) => (
          <DraggableFixture key={fixture.id} fixture={fixture} ppm={ppm} />
        ))}
      </HallBackground>

      {!isMobile && (
        <>
          <DimensionLabel
            orientation="horizontal"
            value={hall.size.width}
            top={-28}
            span={widthPx}
          />
          <DimensionLabel
            orientation="vertical"
            value={hall.size.height}
            left={-52}
            span={heightPx}
          />
        </>
      )}

      {/* Label chip: identifies the hall, opens its settings on click, and is
          the hall's drag handle. data-no-pan keeps the canvas pan away. */}
      <button
        ref={setNodeRef}
        type="button"
        data-no-pan
        className={cn(
          "absolute top-1 left-1 z-20 max-w-[calc(100%-0.5rem)] cursor-grab touch-none truncate rounded-md border bg-card/90 px-2 py-0.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm",
          "hover:bg-card active:cursor-grabbing"
        )}
        onClick={() => openHallEdit(hall.id)}
        {...listeners}
        {...attributes}
      >
        {label}
      </button>
    </div>
  )
}

// Memoized like DraggableTable: the parent re-renders every pan/zoom frame
// with referentially-stable props here.
export const HallView = memo(HallViewBase)
