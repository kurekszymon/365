import { clamp } from "./utils"
import type { ComponentProps } from "react"
import type { Fixture } from "@/stores/planner.store"
import { getEffectiveSize } from "@/stores/planner.store"
import { cn } from "@/lib/utils"

type Translate = { x: number; y: number }

type FixtureVisualProps = {
  fixture: Fixture
  ppm: number
  transform?: Translate | null
  hallBounds?: { width: number; height: number }
} & ComponentProps<"div">

const SHAPE_CLASS: Record<Fixture["shape"], string> = {
  rectangle: "rounded-sm",
  circle: "rounded-full",
  rounded: "rounded-3xl",
  polygon: "",
}

export const FixtureVisual = ({
  fixture,
  ppm,
  transform,
  hallBounds,
  className,
  style,
  children,
  ref,
  ...rest
}: FixtureVisualProps) => {
  const { shape, position, rotation, id, name, geometry } = fixture
  const size = getEffectiveSize(fixture.size, rotation)
  const hasName = name.trim().length > 0
  // Defensive guard: `geometry` is JSONB at rest, so a malformed payload
  // (e.g. {}) would still be truthy and crash when we map over vertices.
  const isPolygon =
    shape === "polygon" &&
    geometry != null &&
    Array.isArray(geometry.vertices) &&
    geometry.vertices.length > 0

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
      data-canvas-element-kind="fixture"
      data-canvas-element-id={id}
      aria-label={hasName ? name : "Fixture"}
      className={cn(
        "absolute flex items-center justify-center text-slate-700",
        !isPolygon && "border border-slate-400 bg-slate-200",
        !isPolygon && SHAPE_CLASS[shape],
        className
      )}
      style={{
        left: position.x * ppm,
        top: position.y * ppm,
        width: size.width * ppm,
        height: (shape === "circle" ? size.width : size.height) * ppm,
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
          viewBox={`0 0 ${fixture.size.width} ${fixture.size.height}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          {geometry.closed ? (
            <polygon
              points={geometry.vertices.map((v) => `${v.x},${v.y}`).join(" ")}
              className="fill-slate-200 stroke-slate-400"
              vectorEffect="non-scaling-stroke"
            />
          ) : (
            <polyline
              points={geometry.vertices.map((v) => `${v.x},${v.y}`).join(" ")}
              className="fill-none stroke-slate-400"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
      )}
      {hasName && (
        <div className="relative z-10 flex max-w-full flex-col items-center justify-center px-1 leading-tight">
          <span className="max-w-full truncate text-xs font-medium">
            {name}
          </span>
        </div>
      )}
      {children}
    </div>
  )
}
