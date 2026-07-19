import type { Geometry, Size } from "@/stores/planner.store"
import { polygonPoints } from "@/lib/geometry"
import { cn } from "@/lib/utils"

type HallOutlineProps = {
  geometry: Geometry
  // Hall AABB in meters (viewBox) and px (rendered size).
  size: Size
  widthPx: number
  heightPx: number
  // Stroke styling for the polygon (e.g. drop-target highlight).
  className?: string
  strokeWidth?: number
}

// A polygon hall's border, drawn as an SVG overlay: HallBackground's
// clip-path would crop a CSS ring/border (and box shadows), so the outline
// is a sibling instead. `non-scaling-stroke` keeps it hairline at any zoom.
// Shared by the canvas (HallView) and the print view.
export const HallOutline = ({
  geometry,
  size,
  widthPx,
  heightPx,
  className,
  strokeWidth = 1,
}: HallOutlineProps) => (
  <svg
    className="pointer-events-none absolute top-0 left-0 z-10 overflow-visible"
    width={widthPx}
    height={heightPx}
    viewBox={`0 0 ${size.width} ${size.height}`}
    preserveAspectRatio="none"
  >
    <polygon
      points={polygonPoints(geometry.vertices)}
      vectorEffect="non-scaling-stroke"
      strokeWidth={strokeWidth}
      className={cn("fill-none", className)}
    />
  </svg>
)
