import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import type { PlannerTable, TableShape } from "@/lib/planner/types"
import {
  DEFAULT_PIXELS_PER_METER,
  DEFAULT_TABLE_ROUND_PX,
  DEFAULT_TABLE_RECT_W_PX,
  DEFAULT_TABLE_RECT_H_PX,
} from "@/lib/planner/types"

interface Props {
  open: boolean
  onClose: () => void
  onSave: (table: {
    name: string
    shape: TableShape
    capacity: number
    widthPx: number
    heightPx: number
  }) => void
  initial?: Partial<PlannerTable>
  pixelsPerMeter?: number
}

export function AddTableDialog({
  open,
  onClose,
  onSave,
  initial,
  pixelsPerMeter = DEFAULT_PIXELS_PER_METER,
}: Props) {
  const [name, setName] = useState(initial?.name ?? "")
  const [shape, setShape] = useState<TableShape>(initial?.shape ?? "round")
  const [capacity, setCapacity] = useState(String(initial?.capacity ?? 8))

  // Size in meters — derived from initial pixel size or defaults
  const defaultW =
    initial?.widthPx ??
    (shape === "round" ? DEFAULT_TABLE_ROUND_PX : DEFAULT_TABLE_RECT_W_PX)
  const defaultH =
    initial?.heightPx ??
    (shape === "round" ? DEFAULT_TABLE_ROUND_PX : DEFAULT_TABLE_RECT_H_PX)

  const [widthM, setWidthM] = useState(
    +(defaultW / pixelsPerMeter).toFixed(1)
  )
  const [heightM, setHeightM] = useState(
    +(defaultH / pixelsPerMeter).toFixed(1)
  )

  function handleShapeChange(newShape: TableShape) {
    setShape(newShape)
    if (newShape === "round") {
      const d = +(DEFAULT_TABLE_ROUND_PX / pixelsPerMeter).toFixed(1)
      setWidthM(d)
      setHeightM(d)
    } else {
      setWidthM(+(DEFAULT_TABLE_RECT_W_PX / pixelsPerMeter).toFixed(1))
      setHeightM(+(DEFAULT_TABLE_RECT_H_PX / pixelsPerMeter).toFixed(1))
    }
  }

  function handleSave() {
    const cap = parseInt(capacity, 10)
    if (!name.trim() || isNaN(cap) || cap < 1) return
    const wPx = Math.round(widthM * pixelsPerMeter)
    const hPx = shape === "round" ? wPx : Math.round(heightM * pixelsPerMeter)
    onSave({
      name: name.trim(),
      shape,
      capacity: cap,
      widthPx: wPx,
      heightPx: hPx,
    })
    setName("")
    setShape("round")
    setCapacity("8")
    const d = +(DEFAULT_TABLE_ROUND_PX / pixelsPerMeter).toFixed(1)
    setWidthM(d)
    setHeightM(d)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit table" : "Add table"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="table-name">Table name</Label>
            <Input
              id="table-name"
              placeholder="e.g. Table 1, Family, Friends…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Shape</Label>
              <Select
                value={shape}
                onValueChange={(v) => handleShapeChange(v as TableShape)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="round">Round</SelectItem>
                  <SelectItem value="rectangular">Rectangular</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                min={1}
                max={30}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
              />
            </div>
          </div>

          {/* Table size */}
          <div className="grid gap-1.5">
            <Label>
              Size{" "}
              <span className="text-muted-foreground font-normal">(meters)</span>
            </Label>
            {shape === "round" ? (
              <div className="grid grid-cols-1 gap-3">
                <div className="grid gap-1">
                  <Label
                    htmlFor="table-diameter"
                    className="text-[10px] text-muted-foreground"
                  >
                    Diameter
                  </Label>
                  <Input
                    id="table-diameter"
                    type="number"
                    min={0.5}
                    max={10}
                    step={0.1}
                    value={widthM}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0.5
                      setWidthM(v)
                      setHeightM(v)
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <Label
                    htmlFor="table-w"
                    className="text-[10px] text-muted-foreground"
                  >
                    Width
                  </Label>
                  <Input
                    id="table-w"
                    type="number"
                    min={0.5}
                    max={10}
                    step={0.1}
                    value={widthM}
                    onChange={(e) =>
                      setWidthM(parseFloat(e.target.value) || 0.5)
                    }
                  />
                </div>
                <div className="grid gap-1">
                  <Label
                    htmlFor="table-h"
                    className="text-[10px] text-muted-foreground"
                  >
                    Height
                  </Label>
                  <Input
                    id="table-h"
                    type="number"
                    min={0.5}
                    max={10}
                    step={0.1}
                    value={heightM}
                    onChange={(e) =>
                      setHeightM(parseFloat(e.target.value) || 0.5)
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {initial ? "Save" : "Add table"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
