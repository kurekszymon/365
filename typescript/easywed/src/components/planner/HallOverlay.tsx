import type { HallConfig } from "@/lib/planner/types"
import { getPolygonBounds } from "@/lib/planner/types"

interface Props {
  hall: HallConfig
}

/**
 * SVG overlay that renders the wedding hall polygon on the canvas.
 * Shows the hall as a bordered region with a subtle floor fill,
 * wall strokes, door gaps, a meter grid, and dimension labels.
 */
export function HallOverlay({ hall }: Props) {
  const { points, doors, pixelsPerMeter } = hall
  if (points.length < 3) return null

  const bounds = getPolygonBounds(points)
  if (!bounds) return null

  const pad = 40
  const svgX = bounds.minX - pad
  const svgY = bounds.minY - pad
  const svgW = bounds.width + pad * 2
  const svgH = bounds.height + pad * 2

  const polyStr = points.map((p) => `${p.x},${p.y}`).join(" ")

  // Build wall segments, marking which portions are doors
  const wallSegments: React.ReactNode[] = []
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]

    const wallDoors = doors.filter((d) => d.wallIndex === i)
    if (wallDoors.length === 0) {
      wallSegments.push(
        <line
          key={`wall-${i}`}
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke="#334155"
          strokeWidth={4}
          strokeLinecap="round"
        />
      )
    } else {
      const wallLen = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2)
      const dx = (b.x - a.x) / wallLen
      const dy = (b.y - a.y) / wallLen

      const doorRanges = wallDoors
        .map((d) => {
          const halfW = (d.widthM * pixelsPerMeter) / 2 / wallLen
          const s = Math.max(0, d.position - halfW)
          const e = Math.min(1, d.position + halfW)
          return [s, e] as [number, number]
        })
        .sort((a, b) => a[0] - b[0])

      let cursor = 0
      doorRanges.forEach(([ds, de], idx) => {
        if (cursor < ds) {
          wallSegments.push(
            <line
              key={`wall-${i}-seg-${idx}`}
              x1={a.x + dx * cursor * wallLen}
              y1={a.y + dy * cursor * wallLen}
              x2={a.x + dx * ds * wallLen}
              y2={a.y + dy * ds * wallLen}
              stroke="#334155"
              strokeWidth={4}
              strokeLinecap="round"
            />
          )
        }
        // Door opening — dashed brown line
        wallSegments.push(
          <line
            key={`door-${i}-${idx}`}
            x1={a.x + dx * ds * wallLen}
            y1={a.y + dy * ds * wallLen}
            x2={a.x + dx * de * wallLen}
            y2={a.y + dy * de * wallLen}
            stroke="#b45309"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray="6 4"
          />
        )
        cursor = de
      })

      if (cursor < 1) {
        wallSegments.push(
          <line
            key={`wall-${i}-tail`}
            x1={a.x + dx * cursor * wallLen}
            y1={a.y + dy * cursor * wallLen}
            x2={b.x}
            y2={b.y}
            stroke="#334155"
            strokeWidth={4}
            strokeLinecap="round"
          />
        )
      }
    }
  }

  // Meter grid lines clipped to the hall polygon
  const gridStep = pixelsPerMeter
  const gridLines: React.ReactNode[] = []
  for (
    let x = Math.ceil(bounds.minX / gridStep) * gridStep;
    x <= bounds.maxX;
    x += gridStep
  ) {
    gridLines.push(
      <line
        key={`gx-${x}`}
        x1={x}
        y1={bounds.minY}
        x2={x}
        y2={bounds.maxY}
        stroke="#94a3b8"
        strokeWidth={0.5}
        opacity={0.3}
      />
    )
  }
  for (
    let y = Math.ceil(bounds.minY / gridStep) * gridStep;
    y <= bounds.maxY;
    y += gridStep
  ) {
    gridLines.push(
      <line
        key={`gy-${y}`}
        x1={bounds.minX}
        y1={y}
        x2={bounds.maxX}
        y2={y}
        stroke="#94a3b8"
        strokeWidth={0.5}
        opacity={0.3}
      />
    )
  }

  const widthM = (bounds.width / pixelsPerMeter).toFixed(1)
  const heightM = (bounds.height / pixelsPerMeter).toFixed(1)

  return (
    <svg
      className="pointer-events-none absolute"
      style={{
        left: svgX,
        top: svgY,
        width: svgW,
        height: svgH,
      }}
      viewBox={`${svgX} ${svgY} ${svgW} ${svgH}`}
    >
      <defs>
        <clipPath id="hall-clip">
          <polygon points={polyStr} />
        </clipPath>
      </defs>

      {/* Hall floor — light fill so it's distinct from the infinite canvas */}
      <polygon points={polyStr} fill="#f8fafc" stroke="none" />

      {/* Grid inside hall */}
      <g clipPath="url(#hall-clip)">{gridLines}</g>

      {/* Walls + doors */}
      {wallSegments}

      {/* Dimension labels */}
      <text
        x={bounds.minX + bounds.width / 2}
        y={bounds.maxY + 18}
        textAnchor="middle"
        fontSize={11}
        fill="#64748b"
        fontFamily="system-ui, sans-serif"
      >
        {widthM} m
      </text>
      <text
        x={bounds.maxX + 18}
        y={bounds.minY + bounds.height / 2}
        textAnchor="start"
        fontSize={11}
        fill="#64748b"
        fontFamily="system-ui, sans-serif"
        transform={`rotate(90, ${bounds.maxX + 18}, ${bounds.minY + bounds.height / 2})`}
      >
        {heightM} m
      </text>
    </svg>
  )
}
