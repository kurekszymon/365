import { useTranslation } from "react-i18next"
import type { Measurement, MeasurementPoint } from "@/stores/measures.store"
import type { Position } from "@/stores/planner.store"

interface MeasureOverlayProps {
  measurements: Array<Measurement>
  ppm: number
  hallWidthPx: number
  hallHeightPx: number
  pendingPoint?: MeasurementPoint | null
  cursorPos?: Position | null
  onDelete?: (id: string) => void
}

function dist(a: MeasurementPoint, b: MeasurementPoint) {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2)
}

export const MeasureOverlay = ({
  measurements,
  ppm,
  hallWidthPx,
  hallHeightPx,
  pendingPoint,
  cursorPos,
  onDelete,
}: MeasureOverlayProps) => {
  const { t } = useTranslation()

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-40 block"
      width={hallWidthPx}
      height={hallHeightPx}
      aria-hidden
    >
      {/* Saved measurements */}
      {measurements.map((m) => {
        const ax = m.a.x * ppm
        const ay = m.a.y * ppm
        const bx = m.b.x * ppm
        const by = m.b.y * ppm
        const mx = (ax + bx) / 2
        const my = (ay + by) / 2
        const d = dist(m.a, m.b)
        const label = `${d.toFixed(2)} m`
        const labelWidth = Math.max(52, label.length * 6.5)
        const deleteX = mx + labelWidth / 2 + 10

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
            {/* Endpoint dots */}
            <circle cx={ax} cy={ay} r={4} fill="#0d9488" opacity={0.9} />
            <circle cx={bx} cy={by} r={4} fill="#0d9488" opacity={0.9} />

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
