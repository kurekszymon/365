import { clamp } from "./utils"
import type { ComponentProps } from "react"
import type { Table } from "@/stores/planner.store"
import { cn } from "@/lib/utils"
import { getEffectiveSize } from "@/stores/planner.store"

type Translate = { x: number; y: number }

type TableVisualProps = {
  table: Table
  guestsAssigned: number
  ppm: number
  // When provided together, the raw drag delta is clamped so the table stays
  // within the hall. Passed by the canvas during a drag; omitted in print.
  transform?: Translate | null
  hallBounds?: { width: number; height: number }
} & ComponentProps<"div">

export const TableVisual = ({
  table,
  guestsAssigned,
  ppm,
  transform,
  hallBounds,
  className,
  style,
  children,
  ref,
  ...rest
}: TableVisualProps) => {
  const { shape, position, rotation, id, name, capacity, geometry } = table
  const size = getEffectiveSize(table.size, rotation)
  const hasName = name.trim().length > 0
  const guestCountLabel = `${guestsAssigned} / ${capacity}`
  const ariaLabel = hasName ? `${name} — ${guestCountLabel}` : guestCountLabel
  const isPolygon = shape === "custom" && geometry

  const clamped =
    transform && hallBounds
      ? {
          x: clamp(
            transform.x,
            -position.x * ppm,
            (hallBounds.width - size.width - position.x) * ppm
          ),
          y: clamp(
            transform.y,
            -position.y * ppm,
            (hallBounds.height - size.height - position.y) * ppm
          ),
        }
      : null

  return (
    <div
      ref={ref}
      data-canvas-element-kind="table"
      data-canvas-element-id={id}
      aria-label={ariaLabel}
      className={cn(
        "absolute flex items-center justify-center text-emerald-800",
        !isPolygon &&
          "border border-emerald-300 bg-emerald-100 " +
            (shape === "round" ? "rounded-full" : "rounded-lg"),
        className
      )}
      style={{
        left: position.x * ppm,
        top: position.y * ppm,
        width: size.width * ppm,
        height: (shape === "round" ? size.width : size.height) * ppm,
        transform: clamped
          ? `translate3d(${clamped.x}px, ${clamped.y}px, 0)`
          : undefined,
        printColorAdjust: "exact",
        WebkitPrintColorAdjust: "exact",
        ...style,
      }}
      {...rest}
    >
      {isPolygon && (
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${table.size.width} ${table.size.height}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          {geometry.closed ? (
            <polygon
              points={geometry.vertices.map((v) => `${v.x},${v.y}`).join(" ")}
              className="fill-emerald-100 stroke-emerald-300"
              vectorEffect="non-scaling-stroke"
            />
          ) : (
            <polyline
              points={geometry.vertices.map((v) => `${v.x},${v.y}`).join(" ")}
              className="fill-none stroke-emerald-300"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
      )}
      <div className="relative z-10 flex max-w-full flex-col items-center justify-center px-1 leading-tight">
        {hasName && (
          <span className="max-w-full truncate text-xs font-medium">
            {name}
          </span>
        )}
        <span className="max-w-full truncate text-[10px] text-emerald-700">
          {guestCountLabel}
        </span>
      </div>
      {children}
    </div>
  )
}
