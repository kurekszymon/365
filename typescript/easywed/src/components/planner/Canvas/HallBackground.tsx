import { calcGridSpacing, gridBackground } from "./utils"
import type { ComponentProps } from "react"
import type { Geometry } from "@/stores/planner.store"
import type { GridSpacing, GridStyle } from "@/stores/view.store"
import { cn } from "@/lib/utils"

type HallBackgroundProps = {
  hallWidth: number
  hallHeight: number
  ppm: number
  gridStyle: GridStyle
  gridSpacing: GridSpacing
  zoom?: number
  // Polygon outline (hall-local meters): clips the floor + grid to the
  // hall's real shape. The clip also crops box shadows/rings, so callers
  // draw the polygon border themselves (SVG) instead of ring classes.
  geometry?: Geometry
} & ComponentProps<"div">

export const HallBackground = ({
  hallWidth,
  hallHeight,
  ppm,
  gridStyle,
  gridSpacing,
  zoom = 1,
  geometry,
  className,
  style,
  children,
  ref,
  ...rest
}: HallBackgroundProps) => {
  const spacing =
    gridSpacing === "auto"
      ? calcGridSpacing(hallWidth / ppm, hallHeight / ppm)
      : gridSpacing

  const clipPath = geometry
    ? `polygon(${geometry.vertices
        .map((v) => `${v.x * ppm}px ${v.y * ppm}px`)
        .join(", ")})`
    : undefined

  return (
    <div
      ref={ref}
      data-canvas-element-kind="hall"
      className={cn("relative bg-background", className)}
      style={{
        width: hallWidth,
        height: hallHeight,
        backgroundSize: `${ppm * spacing}px ${ppm * spacing}px`,
        printColorAdjust: "exact",
        WebkitPrintColorAdjust: "exact",
        clipPath,
        ...gridBackground(gridStyle, zoom),
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  )
}
