import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import type { Measurement, MeasurementPoint } from "@/stores/measures.store"
import type { Position } from "@/stores/planner.store"

interface ActiveDrag {
  id: string
  dx: number
  dy: number
}

interface MeasureOverlayProps {
  measurements: Array<Measurement>
  ppm: number
  hallWidthPx: number
  hallHeightPx: number
  pendingPoint: MeasurementPoint | null
  cursorPos: Position | null
  onDelete?: (id: string) => void
  activeDrag: ActiveDrag | null
  resolvePoint: (xM: number, yM: number) => MeasurementPoint
  onEndpointUpdate: (
    measurementId: string,
    pointKey: "a" | "b",
    point: MeasurementPoint
  ) => void
}

export const MeasureOverlay = ({
  measurements,
  ppm,
  hallWidthPx,
  hallHeightPx,
  pendingPoint,
  cursorPos,
  onDelete,
  activeDrag,
  resolvePoint,
  onEndpointUpdate,
}: MeasureOverlayProps) => {
  const { t } = useTranslation()
  const svgRef = useRef<SVGSVGElement>(null)

  const [dragging, setDragging] = useState<{
    measurementId: string
    pointKey: "a" | "b"
  } | null>(null)
  const [dragLivePos, setDragLivePos] = useState<MeasurementPoint | null>(null)

  const getSVGCoords = (
    e: React.PointerEvent
  ): { xM: number; yM: number } | null => {
    if (!svgRef.current) return null
    const rect = svgRef.current.getBoundingClientRect()
    return {
      xM: (e.clientX - rect.left) / ppm,
      yM: (e.clientY - rect.top) / ppm,
    }
  }

  // Returns meter-space position accounting for endpoint drag and object following
  const getDisplayPos = (
    point: MeasurementPoint,
    measurementId: string,
    pointKey: "a" | "b"
  ): { x: number; y: number } => {
    if (
      dragging?.measurementId === measurementId &&
      dragging.pointKey === pointKey &&
      dragLivePos
    ) {
      return { x: dragLivePos.x, y: dragLivePos.y }
    }
    if (activeDrag && point.objectId === activeDrag.id) {
      return { x: point.x + activeDrag.dx, y: point.y + activeDrag.dy }
    }
    return { x: point.x, y: point.y }
  }

  const handleEndpointPointerDown = (
    e: React.PointerEvent<SVGCircleElement>,
    measurementId: string,
    pointKey: "a" | "b"
  ) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const coords = getSVGCoords(e)
    if (!coords) return
    setDragging({ measurementId, pointKey })
    setDragLivePos(resolvePoint(coords.xM, coords.yM))
  }

  const handleEndpointPointerMove = (
    e: React.PointerEvent<SVGCircleElement>
  ) => {
    if (!dragging) return
    const coords = getSVGCoords(e)
    if (!coords) return
    setDragLivePos(resolvePoint(coords.xM, coords.yM))
  }

  const handleEndpointPointerUp = () => {
    if (!dragging || !dragLivePos) return
    onEndpointUpdate(dragging.measurementId, dragging.pointKey, dragLivePos)
    setDragging(null)
    setDragLivePos(null)
  }

  const handleEndpointPointerCancel = () => {
    setDragging(null)
    setDragLivePos(null)
  }

  return (
    <svg
      ref={svgRef}
      className="pointer-events-none absolute inset-0 z-40 block"
      width={hallWidthPx}
      height={hallHeightPx}
      aria-hidden
    >
      {/* Saved measurements */}
      {measurements.map((m) => {
        const aM = getDisplayPos(m.a, m.id, "a")
        const bM = getDisplayPos(m.b, m.id, "b")
        const ax = aM.x * ppm
        const ay = aM.y * ppm
        const bx = bM.x * ppm
        const by = bM.y * ppm
        const mx = (ax + bx) / 2
        const my = (ay + by) / 2
        const d = Math.sqrt((bM.x - aM.x) ** 2 + (bM.y - aM.y) ** 2)
        const label = `${d.toFixed(2)} m`
        const labelWidth = Math.max(52, label.length * 6.5)
        const deleteX = mx + labelWidth / 2 + 10

        const isDraggingA =
          dragging?.measurementId === m.id && dragging.pointKey === "a"
        const isDraggingB =
          dragging?.measurementId === m.id && dragging.pointKey === "b"

        return (
          <g key={m.id}>
            <line
              x1={ax}
              y1={ay}
              x2={bx}
              y2={by}
              stroke="#0d9488"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              opacity={0.85}
            />

            {/* Endpoint dots — draggable in measure mode */}
            <circle
              cx={ax}
              cy={ay}
              r={isDraggingA ? 6 : 4}
              fill="#0d9488"
              opacity={0.9}
              data-no-pan
              style={{
                pointerEvents: "auto",
                cursor: isDraggingA ? "grabbing" : "grab",
              }}
              onPointerDown={(e) => handleEndpointPointerDown(e, m.id, "a")}
              onPointerMove={handleEndpointPointerMove}
              onPointerUp={handleEndpointPointerUp}
              onPointerCancel={handleEndpointPointerCancel}
            />
            <circle
              cx={bx}
              cy={by}
              r={isDraggingB ? 6 : 4}
              fill="#0d9488"
              opacity={0.9}
              data-no-pan
              style={{
                pointerEvents: "auto",
                cursor: isDraggingB ? "grabbing" : "grab",
              }}
              onPointerDown={(e) => handleEndpointPointerDown(e, m.id, "b")}
              onPointerMove={handleEndpointPointerMove}
              onPointerUp={handleEndpointPointerUp}
              onPointerCancel={handleEndpointPointerCancel}
            />

            {/* Label background + text */}
            <rect
              x={mx - labelWidth / 2}
              y={my - 10}
              width={labelWidth}
              height={20}
              rx={4}
              fill="white"
              stroke="#0d9488"
              strokeWidth={1}
              opacity={0.95}
            />
            <text
              x={mx}
              y={my + 4}
              textAnchor="middle"
              fontSize={10}
              fill="#0d9488"
              fontFamily="sans-serif"
              fontWeight="600"
            >
              {label}
            </text>

            {/* Delete button — pointer-events re-enabled just for this group */}
            {onDelete && (
              <g
                style={{ pointerEvents: "auto", cursor: "pointer" }}
                onClick={() => onDelete(m.id)}
                role="button"
                aria-label={t("measure.delete")}
                data-no-pan
              >
                <circle
                  cx={deleteX}
                  cy={my - 8}
                  r={7}
                  fill="#f87171"
                  opacity={0.9}
                />
                <text
                  x={deleteX}
                  y={my - 4}
                  textAnchor="middle"
                  fontSize={9}
                  fill="white"
                  fontFamily="sans-serif"
                  fontWeight="700"
                >
                  ×
                </text>
              </g>
            )}
          </g>
        )
      })}

      {/* Ghost line while placing second point */}
      {pendingPoint && (
        <>
          <circle
            cx={pendingPoint.x * ppm}
            cy={pendingPoint.y * ppm}
            r={4}
            fill="#0d9488"
            opacity={0.7}
          />
          {cursorPos && (
            <line
              x1={pendingPoint.x * ppm}
              y1={pendingPoint.y * ppm}
              x2={cursorPos.x * ppm}
              y2={cursorPos.y * ppm}
              stroke="#0d9488"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              opacity={0.5}
            />
          )}
        </>
      )}
    </svg>
  )
}
