import { useState, useEffect } from "react"
import { Pencil, Trash2, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import type { HallConfig, PlannerTable } from "@/lib/planner/types"
import {
  DEFAULT_TABLE_ROUND_PX,
  DEFAULT_TABLE_RECT_W_PX,
  DEFAULT_TABLE_RECT_H_PX,
  getPolygonBounds,
} from "@/lib/planner/types"
import { cn } from "@/lib/utils"

interface Props {
  selectedTableId: string | null
  tables: PlannerTable[]
  hallSelected: boolean
  hall: HallConfig | null
  onUpdateTable: (
    id: string,
    updates: Partial<Omit<PlannerTable, "id">>
  ) => void
  onDeleteTable: (id: string) => void
  onDuplicateTable: (table: PlannerTable) => void
  onEditHall: () => void
}

export function PropertiesPanel({
  selectedTableId,
  tables,
  hallSelected,
  hall,
  onUpdateTable,
  onDeleteTable,
  onDuplicateTable,
  onEditHall,
}: Props) {
  const selectedTable = tables.find((t) => t.id === selectedTableId) ?? null
  const ppm = hall?.pixelsPerMeter ?? 80

  if (selectedTable) {
    return (
      <TableProperties
        key={selectedTable.id}
        table={selectedTable}
        ppm={ppm}
        onUpdate={(updates) => onUpdateTable(selectedTable.id, updates)}
        onDelete={() => onDeleteTable(selectedTable.id)}
        onDuplicate={() => onDuplicateTable(selectedTable)}
      />
    )
  }

  if (hallSelected && hall) {
    return <HallProperties hall={hall} onEdit={onEditHall} />
  }

  return <></>
}

// ---------------------------------------------------------------------------
// Table properties
// ---------------------------------------------------------------------------

function TableProperties({
  table,
  ppm,
  onUpdate,
  onDelete,
  onDuplicate,
}: {
  table: PlannerTable
  ppm: number
  onUpdate: (updates: Partial<Omit<PlannerTable, "id">>) => void
  onDelete: () => void
  onDuplicate: () => void
}) {
  const [name, setName] = useState(table.name)
  const [capacity, setCapacity] = useState(String(table.capacity))

  // Sync if the same table's props change externally (e.g. via AddTableDialog)
  useEffect(() => {
    setName(table.name)
  }, [setName, table.name])
  useEffect(() => {
    setCapacity(String(table.capacity))
  }, [setCapacity, table.capacity])

  function saveName() {
    const trimmed = name.trim()
    if (trimmed && trimmed !== table.name) onUpdate({ name: trimmed })
    else setName(table.name)
  }

  function saveCapacity() {
    const n = parseInt(capacity)
    if (!isNaN(n) && n >= 1 && n !== table.capacity) onUpdate({ capacity: n })
    else setCapacity(String(table.capacity))
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-l bg-muted/30">
      <div className="flex items-center border-b px-3 py-2.5">
        <span className="text-sm font-semibold">Table</span>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
        {/* Name */}
        <div className="space-y-1.5">
          <Label className="text-xs">Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => e.key === "Enter" && saveName()}
            className="h-7 text-sm"
          />
        </div>

        {/* Shape */}
        <div className="space-y-1.5">
          <Label className="text-xs">Shape</Label>
          <div className="flex gap-1">
            <button
              className={cn(
                "flex-1 rounded-md border px-2 py-1.5 text-xs transition-colors",
                table.shape === "round"
                  ? "border-primary bg-primary/10 font-semibold text-primary"
                  : "hover:bg-muted"
              )}
              onClick={() =>
                table.shape !== "round" &&
                onUpdate({
                  shape: "round",
                  widthPx: DEFAULT_TABLE_ROUND_PX,
                  heightPx: DEFAULT_TABLE_ROUND_PX,
                })
              }
            >
              ● Round
            </button>
            <button
              className={cn(
                "flex-1 rounded-md border px-2 py-1.5 text-xs transition-colors",
                table.shape === "rectangular"
                  ? "border-primary bg-primary/10 font-semibold text-primary"
                  : "hover:bg-muted"
              )}
              onClick={() =>
                table.shape !== "rectangular" &&
                onUpdate({
                  shape: "rectangular",
                  widthPx: DEFAULT_TABLE_RECT_W_PX,
                  heightPx: DEFAULT_TABLE_RECT_H_PX,
                })
              }
            >
              ▬ Rect
            </button>
          </div>
        </div>

        {/* Capacity */}
        <div className="space-y-1.5">
          <Label className="text-xs">Capacity</Label>
          <Input
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            onBlur={saveCapacity}
            onKeyDown={(e) => e.key === "Enter" && saveCapacity()}
            className="h-7 text-sm"
          />
        </div>

        {/* Size */}
        <div className="space-y-1.5">
          <Label className="text-xs">Size (m)</Label>
          {table.shape === "round" ? (
            <SizeInput
              label="Diameter"
              valueM={table.widthPx / ppm}
              onSave={(m) => {
                const px = Math.round(m * ppm)
                onUpdate({ widthPx: px, heightPx: px })
              }}
            />
          ) : (
            <div className="flex gap-2">
              <SizeInput
                label="W"
                valueM={table.widthPx / ppm}
                onSave={(m) => onUpdate({ widthPx: Math.round(m * ppm) })}
              />
              <SizeInput
                label="H"
                valueM={table.heightPx / ppm}
                onSave={(m) => onUpdate({ heightPx: Math.round(m * ppm) })}
              />
            </div>
          )}
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex flex-col gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="justify-start gap-2"
            onClick={onDuplicate}
            title="Duplicate (⌘D)"
          >
            <Copy className="h-3.5 w-3.5" />
            Duplicate
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="justify-start gap-2 text-destructive hover:bg-destructive/5 hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>
    </aside>
  )
}

function SizeInput({
  label,
  valueM,
  onSave,
}: {
  label: string
  valueM: number
  onSave: (m: number) => void
}) {
  const [val, setVal] = useState(valueM.toFixed(2))

  useEffect(() => {
    setVal(valueM.toFixed(2))
  }, [valueM])

  function save() {
    const n = parseFloat(val)
    if (!isNaN(n) && n >= 0.1) onSave(n)
    else setVal(valueM.toFixed(2))
  }

  return (
    <div className="flex flex-1 items-center gap-1.5">
      <span className="shrink-0 text-[10px] text-muted-foreground">
        {label}
      </span>
      <Input
        type="number"
        step={0.1}
        min={0.1}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && save()}
        className="h-7 min-w-0 text-xs"
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Hall properties
// ---------------------------------------------------------------------------

function HallProperties({
  hall,
  onEdit,
}: {
  hall: HallConfig
  onEdit: () => void
}) {
  const bounds = getPolygonBounds(hall.points)
  const widthM = bounds ? (bounds.width / hall.pixelsPerMeter).toFixed(1) : "-"
  const heightM = bounds
    ? (bounds.height / hall.pixelsPerMeter).toFixed(1)
    : "-"
  const presetLabel: Record<string, string> = {
    rectangle: "Rectangle",
    "l-shape": "L-shape",
    "u-shape": "U-shape",
    custom: "Custom",
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-l bg-muted/30">
      <div className="flex items-center border-b px-3 py-2.5">
        <span className="text-sm font-semibold">Hall</span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        <Row label="Preset" value={presetLabel[hall.preset] ?? hall.preset} />
        <Row label="Dimensions" value={`${widthM} × ${heightM} m`} />
        <Row label="Doors" value={String(hall.doors.length)} />
        <Row label="Scale" value={`${hall.pixelsPerMeter} px/m`} />

        <Separator />

        <Button
          size="sm"
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={onEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit Hall
        </Button>
      </div>
    </aside>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
        {label}
      </p>
      <p className="text-sm">{value}</p>
    </div>
  )
}
