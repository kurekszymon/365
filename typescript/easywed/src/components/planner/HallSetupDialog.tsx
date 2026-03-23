import { useCallback, useEffect, useRef, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  DEFAULT_PIXELS_PER_METER,
  DEFAULT_CHAIR_SIZE_PX,
  type HallConfig,
  type HallDoor,
  type HallPoint,
  type HallPreset,
  generateRectangleHall,
  generateLShapeHall,
  generateUShapeHall,
  getPolygonBounds,
} from "@/lib/planner/types"

interface Props {
  open: boolean
  onClose: () => void
  onSave: (hall: HallConfig, chairSizePx: number) => void
  onRemoveHall: () => void
  initial: HallConfig | null
  chairSizePx: number
}

type PresetOption = { value: HallPreset; label: string }
const PRESETS: PresetOption[] = [
  { value: "rectangle", label: "Rectangle" },
  { value: "l-shape", label: "L-shape" },
  { value: "u-shape", label: "U-shape" },
  { value: "custom", label: "Custom" },
]

// ---- helpers ----------------------------------------------------------------

function pxToM(px: number, ppm: number) {
  return +(px / ppm).toFixed(1)
}

function mToPx(m: number, ppm: number) {
  return m * ppm
}

function inferPresetDims(
  points: HallPoint[],
  ppm: number,
  preset: HallPreset
): Record<string, number> {
  const b = getPolygonBounds(points)
  if (!b) return { width: 20, height: 15, armWidth: 10, armHeight: 7 }
  const wM = pxToM(b.width, ppm)
  const hM = pxToM(b.height, ppm)
  if (preset === "rectangle") return { width: wM, height: hM }
  if (preset === "l-shape")
    return { width: wM, height: hM, armWidth: +(wM / 2).toFixed(1), armHeight: +(hM / 2).toFixed(1) }
  if (preset === "u-shape")
    return { width: wM, height: hM, armWidth: +(wM * 0.25).toFixed(1), armHeight: +(hM * 0.5).toFixed(1) }
  return { width: wM, height: hM }
}

// ---- component --------------------------------------------------------------

export function HallSetupDialog({
  open,
  onClose,
  onSave,
  onRemoveHall,
  initial,
  chairSizePx: initialChairSize,
}: Props) {
  const [preset, setPreset] = useState<HallPreset>(initial?.preset ?? "rectangle")
  const [ppm, setPpm] = useState(initial?.pixelsPerMeter ?? DEFAULT_PIXELS_PER_METER)
  const [chairSize, setChairSize] = useState(initialChairSize)

  // Preset dimension inputs (meters)
  const defaults = initial
    ? inferPresetDims(initial.points, initial.pixelsPerMeter, initial.preset)
    : { width: 20, height: 15, armWidth: 10, armHeight: 7, gap: 6 }

  const [width, setWidth] = useState(defaults.width)
  const [height, setHeight] = useState(defaults.height)
  const [armWidth, setArmWidth] = useState(defaults.armWidth ?? 10)
  const [armHeight, setArmHeight] = useState(defaults.armHeight ?? 7)

  // Custom polygon points (in meters from 0,0)
  const [customPointsM, setCustomPointsM] = useState<HallPoint[]>(
    initial?.preset === "custom"
      ? initial.points.map((p) => ({
          x: pxToM(p.x - 40, ppm),
          y: pxToM(p.y - 40, ppm),
        }))
      : []
  )

  // Doors
  const [doors, setDoors] = useState<HallDoor[]>(initial?.doors ?? [])

  // Reset on open
  useEffect(() => {
    if (!open) return
    if (initial) {
      setPreset(initial.preset)
      setPpm(initial.pixelsPerMeter)
      const d = inferPresetDims(initial.points, initial.pixelsPerMeter, initial.preset)
      setWidth(d.width)
      setHeight(d.height)
      setArmWidth(d.armWidth ?? 10)
      setArmHeight(d.armHeight ?? 7)
      setDoors(initial.doors)
      setChairSize(initialChairSize)
      if (initial.preset === "custom") {
        setCustomPointsM(
          initial.points.map((p) => ({
            x: pxToM(p.x - 40, initial.pixelsPerMeter),
            y: pxToM(p.y - 40, initial.pixelsPerMeter),
          }))
        )
      } else {
        setCustomPointsM([])
      }
    } else {
      setPreset("rectangle")
      setPpm(DEFAULT_PIXELS_PER_METER)
      setWidth(20)
      setHeight(15)
      setArmWidth(10)
      setArmHeight(7)
      setDoors([])
      setCustomPointsM([])
      setChairSize(DEFAULT_CHAIR_SIZE_PX)
    }
  }, [open, initial, initialChairSize])

  // Generate polygon from current state
  function getPolygon(): HallPoint[] {
    if (preset === "rectangle") return generateRectangleHall(width, height, ppm)
    if (preset === "l-shape")
      return generateLShapeHall(width, height, armWidth, armHeight, ppm)
    if (preset === "u-shape")
      return generateUShapeHall(width, height, armWidth, armHeight, ppm)
    // custom
    return customPointsM.map((p) => ({ x: 40 + p.x * ppm, y: 40 + p.y * ppm }))
  }

  function handleSave() {
    const points = getPolygon()
    if (points.length < 3) return
    onSave(
      {
        points,
        doors,
        pixelsPerMeter: ppm,
        preset,
      },
      chairSize
    )
    onClose()
  }

  function handleRemove() {
    onRemoveHall()
    onClose()
  }

  // -- preview ----------------------------------------------------------------
  const previewPoints = getPolygon()
  const bounds = previewPoints.length >= 3 ? getPolygonBounds(previewPoints) : null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure wedding hall</DialogTitle>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          {/* Preset selector */}
          <div className="grid gap-1.5">
            <Label>Hall shape</Label>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    preset === p.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted"
                  )}
                  onClick={() => setPreset(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dimension inputs — preset-dependent */}
          {preset !== "custom" && (
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="hall-w">Width (m)</Label>
                  <Input
                    id="hall-w"
                    type="number"
                    min={1}
                    step={0.5}
                    value={width}
                    onChange={(e) => setWidth(parseFloat(e.target.value) || 1)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="hall-h">Height (m)</Label>
                  <Input
                    id="hall-h"
                    type="number"
                    min={1}
                    step={0.5}
                    value={height}
                    onChange={(e) => setHeight(parseFloat(e.target.value) || 1)}
                  />
                </div>
              </div>

              {(preset === "l-shape" || preset === "u-shape") && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="arm-w">
                      {preset === "l-shape" ? "Arm width (m)" : "Arm width (m)"}
                    </Label>
                    <Input
                      id="arm-w"
                      type="number"
                      min={0.5}
                      step={0.5}
                      value={armWidth}
                      onChange={(e) =>
                        setArmWidth(parseFloat(e.target.value) || 0.5)
                      }
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="arm-h">Arm height (m)</Label>
                    <Input
                      id="arm-h"
                      type="number"
                      min={0.5}
                      step={0.5}
                      value={armHeight}
                      onChange={(e) =>
                        setArmHeight(parseFloat(e.target.value) || 0.5)
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Custom polygon drawing area */}
          {preset === "custom" && (
            <CustomPolygonEditor
              pointsM={customPointsM}
              onChange={setCustomPointsM}
              width={width}
              height={height}
            />
          )}

          {/* Shape preview */}
          {previewPoints.length >= 3 && bounds && (
            <div className="grid gap-1.5">
              <Label>Preview</Label>
              <HallPreview points={previewPoints} bounds={bounds} doors={doors} />
            </div>
          )}

          {/* Doors */}
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label>Doors</Label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 gap-1 text-xs"
                onClick={() => {
                  if (previewPoints.length < 3) return
                  setDoors((d) => [
                    ...d,
                    {
                      id: crypto.randomUUID(),
                      wallIndex: 0,
                      position: 0.5,
                      widthM: 1.2,
                    },
                  ])
                }}
              >
                <Plus className="h-3 w-3" />
                Add door
              </Button>
            </div>
            {doors.length === 0 && (
              <p className="text-xs text-muted-foreground italic">
                No doors — click "Add door" to place one on a wall
              </p>
            )}
            {doors.map((door, i) => (
              <div key={door.id} className="flex items-end gap-2">
                <div className="grid flex-1 gap-1">
                  <Label className="text-[10px] text-muted-foreground">
                    Wall #{door.wallIndex + 1}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={previewPoints.length - 1}
                    value={door.wallIndex}
                    className="h-8 text-xs"
                    onChange={(e) => {
                      const wi = parseInt(e.target.value) || 0
                      setDoors((ds) =>
                        ds.map((d, di) =>
                          di === i
                            ? { ...d, wallIndex: Math.max(0, Math.min(previewPoints.length - 1, wi)) }
                            : d
                        )
                      )
                    }}
                  />
                </div>
                <div className="grid flex-1 gap-1">
                  <Label className="text-[10px] text-muted-foreground">
                    Position (0–1)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={door.position}
                    className="h-8 text-xs"
                    onChange={(e) => {
                      const pos = parseFloat(e.target.value) || 0
                      setDoors((ds) =>
                        ds.map((d, di) =>
                          di === i
                            ? { ...d, position: Math.max(0, Math.min(1, pos)) }
                            : d
                        )
                      )
                    }}
                  />
                </div>
                <div className="grid flex-1 gap-1">
                  <Label className="text-[10px] text-muted-foreground">
                    Width (m)
                  </Label>
                  <Input
                    type="number"
                    min={0.5}
                    step={0.1}
                    value={door.widthM}
                    className="h-8 text-xs"
                    onChange={(e) => {
                      const w = parseFloat(e.target.value) || 0.5
                      setDoors((ds) =>
                        ds.map((d, di) => (di === i ? { ...d, widthM: w } : d))
                      )
                    }}
                  />
                </div>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="shrink-0 text-destructive"
                  onClick={() => setDoors((ds) => ds.filter((_, di) => di !== i))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          {/* Scale + chair size */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ppm">Scale (px/m)</Label>
              <Input
                id="ppm"
                type="number"
                min={20}
                max={200}
                step={10}
                value={ppm}
                onChange={(e) => setPpm(parseInt(e.target.value) || DEFAULT_PIXELS_PER_METER)}
              />
              <p className="text-[10px] text-muted-foreground">
                1 m = {ppm} px on canvas
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="chair-size">Chair diameter (m)</Label>
              <Input
                id="chair-size"
                type="number"
                min={0.1}
                max={2}
                step={0.05}
                value={pxToM(chairSize, ppm)}
                onChange={(e) =>
                  setChairSize(mToPx(parseFloat(e.target.value) || 0.4, ppm))
                }
              />
              <p className="text-[10px] text-muted-foreground">
                {Math.round(chairSize)} px
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <div>
            {initial && (
              <Button variant="destructive" size="sm" onClick={handleRemove}>
                Remove hall
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={previewPoints.length < 3}>
              {initial ? "Save" : "Create hall"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// =============================================================================
// Preview sub-component
// =============================================================================

function HallPreview({
  points,
  bounds,
  doors,
}: {
  points: HallPoint[]
  bounds: NonNullable<ReturnType<typeof getPolygonBounds>>
  doors: HallDoor[]
}) {
  const padding = 16
  const maxW = 380
  const maxH = 180
  const scaleX = (maxW - padding * 2) / bounds.width
  const scaleY = (maxH - padding * 2) / bounds.height
  const s = Math.min(scaleX, scaleY, 1)

  const svgW = bounds.width * s + padding * 2
  const svgH = bounds.height * s + padding * 2

  const scaled = points.map((p) => ({
    x: (p.x - bounds.minX) * s + padding,
    y: (p.y - bounds.minY) * s + padding,
  }))

  const polyStr = scaled.map((p) => `${p.x},${p.y}`).join(" ")

  // Door segments
  const doorLines = doors.map((door) => {
    const i = door.wallIndex % points.length
    const j = (i + 1) % points.length
    const ax = scaled[i].x,
      ay = scaled[i].y
    const bx = scaled[j].x,
      by = scaled[j].y
    const wallLen = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2)
    // Door center at position along wall, width proportional
    const doorHalfPx = ((door.widthM * s * 80) / 2) // rough
    const cx = ax + (bx - ax) * door.position
    const cy = ay + (by - ay) * door.position
    const dx = (bx - ax) / wallLen
    const dy = (by - ay) / wallLen
    return {
      x1: cx - dx * Math.min(doorHalfPx, wallLen / 2),
      y1: cy - dy * Math.min(doorHalfPx, wallLen / 2),
      x2: cx + dx * Math.min(doorHalfPx, wallLen / 2),
      y2: cy + dy * Math.min(doorHalfPx, wallLen / 2),
    }
  })

  return (
    <div className="flex justify-center rounded-lg border bg-muted/30 p-2">
      <svg width={svgW} height={svgH}>
        <polygon
          points={polyStr}
          fill="hsl(var(--background))"
          stroke="hsl(var(--foreground))"
          strokeWidth={2}
        />
        {/* Door indicators */}
        {doorLines.map((d, i) => (
          <line
            key={i}
            x1={d.x1}
            y1={d.y1}
            x2={d.x2}
            y2={d.y2}
            stroke="hsl(var(--primary))"
            strokeWidth={4}
            strokeLinecap="round"
          />
        ))}
      </svg>
    </div>
  )
}

// =============================================================================
// Custom polygon editor
// =============================================================================

function CustomPolygonEditor({
  pointsM,
  onChange,
  width,
  height,
}: {
  pointsM: HallPoint[]
  onChange: (points: HallPoint[]) => void
  width: number
  height: number
}) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const gridM = Math.max(width, height, 30)
  const canvasPx = 380
  const scale = canvasPx / gridM

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = +(((e.clientX - rect.left) / scale)).toFixed(1)
      const y = +(((e.clientY - rect.top) / scale)).toFixed(1)
      onChange([...pointsM, { x, y }])
    },
    [pointsM, onChange, scale]
  )

  const handleRemovePoint = (i: number) => {
    onChange(pointsM.filter((_, idx) => idx !== i))
  }

  const svgPoints = pointsM.map((p) => `${p.x * scale},${p.y * scale}`).join(" ")

  return (
    <div className="grid gap-1.5">
      <Label>
        Click to add vertices ({pointsM.length} points)
        {pointsM.length > 0 && (
          <button
            type="button"
            className="ml-2 text-[10px] text-destructive underline"
            onClick={() => onChange([])}
          >
            Clear all
          </button>
        )}
      </Label>
      <div
        ref={canvasRef}
        className="relative cursor-crosshair rounded-lg border bg-muted/30"
        style={{ width: canvasPx, height: canvasPx }}
        onClick={handleClick}
      >
        {/* Grid lines */}
        <svg
          width={canvasPx}
          height={canvasPx}
          className="absolute inset-0"
        >
          {/* meter grid */}
          {Array.from({ length: Math.ceil(gridM) }, (_, i) => (
            <line
              key={`v${i}`}
              x1={i * scale}
              y1={0}
              x2={i * scale}
              y2={canvasPx}
              stroke="hsl(var(--border))"
              strokeWidth={i % 5 === 0 ? 1 : 0.5}
              opacity={0.5}
            />
          ))}
          {Array.from({ length: Math.ceil(gridM) }, (_, i) => (
            <line
              key={`h${i}`}
              x1={0}
              y1={i * scale}
              x2={canvasPx}
              y2={i * scale}
              stroke="hsl(var(--border))"
              strokeWidth={i % 5 === 0 ? 1 : 0.5}
              opacity={0.5}
            />
          ))}

          {/* Polygon fill */}
          {pointsM.length >= 3 && (
            <polygon
              points={svgPoints}
              fill="hsl(var(--primary) / 0.1)"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
            />
          )}

          {/* Edges if < 3 points */}
          {pointsM.length >= 2 && pointsM.length < 3 && (
            <polyline
              points={svgPoints}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
            />
          )}

          {/* Vertices */}
          {pointsM.map((p, i) => (
            <circle
              key={i}
              cx={p.x * scale}
              cy={p.y * scale}
              r={5}
              fill="hsl(var(--primary))"
              stroke="hsl(var(--background))"
              strokeWidth={2}
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                handleRemovePoint(i)
              }}
            />
          ))}
        </svg>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Click to add vertices. Click a vertex to remove it. Grid = 1m.
      </p>
    </div>
  )
}
