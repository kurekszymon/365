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

interface Props {
  open: boolean
  onClose: () => void
  onSave: (table: { name: string; shape: TableShape; capacity: number }) => void
  initial?: Partial<PlannerTable>
}

export function AddTableDialog({ open, onClose, onSave, initial }: Props) {
  const [name, setName] = useState(initial?.name ?? "")
  const [shape, setShape] = useState<TableShape>(initial?.shape ?? "round")
  const [capacity, setCapacity] = useState(String(initial?.capacity ?? 8))

  function handleSave() {
    const cap = parseInt(capacity, 10)
    if (!name.trim() || isNaN(cap) || cap < 1) return
    onSave({ name: name.trim(), shape, capacity: cap })
    setName("")
    setShape("round")
    setCapacity("8")
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
                onValueChange={(v) => setShape(v as TableShape)}
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
