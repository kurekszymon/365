import { calcGridSpacing, gridBackground } from "./utils"
import type { ComponentProps } from "react"
import type { GridSpacing, GridStyle } from "@/stores/view.store"
import { cn } from "@/lib/utils"

type HallBackgroundProps = {
  hallWidth: number
  hallHeight: number
  ppm: number
  gridStyle: GridStyle
  gridSpacing: GridSpacing
  zoom?: number
} & ComponentProps<"div">

export const HallBackground = ({
  hallWidth,
  hallHeight,
  ppm,
  gridStyle,
  gridSpacing,
  zoom = 1,
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

  return (
    <div
      ref={ref}
      data-canvas-element-kind="hall"
      className={cn("relative bg-white", className)}
      style={{
        width: hallWidth,
        height: hallHeight,
        backgroundSize: `${ppm * spacing}px ${ppm * spacing}px`,
        printColorAdjust: "exact",
        WebkitPrintColorAdjust: "exact",
        ...gridBackground(gridStyle, zoom),
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  )
}
