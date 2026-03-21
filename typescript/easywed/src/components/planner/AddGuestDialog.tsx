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
import type { Dietary, PlannerGuest } from "@/lib/planner/types"
import { DIETARY_LABELS } from "@/lib/planner/types"

interface Props {
  open: boolean
  onClose: () => void
  onSave: (guest: { name: string; dietary: Dietary; note?: string }) => void
  initial?: Partial<PlannerGuest>
}

export function AddGuestDialog({ open, onClose, onSave, initial }: Props) {
  const [name, setName] = useState(initial?.name ?? "")
  const [dietary, setDietary] = useState<Dietary>(initial?.dietary ?? "none")
  const [note, setNote] = useState(initial?.note ?? "")

  function handleSave() {
    if (!name.trim()) return
    onSave({ name: name.trim(), dietary, note: note.trim() || undefined })
    setName("")
    setDietary("none")
    setNote("")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit guest" : "Add guest"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="guest-name">Name</Label>
            <Input
              id="guest-name"
              placeholder="Guest name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Dietary restrictions</Label>
            <Select
              value={dietary}
              onValueChange={(v) => setDietary(v as Dietary)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(DIETARY_LABELS) as Dietary[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {DIETARY_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="guest-note">Note (optional)</Label>
            <Input
              id="guest-note"
              placeholder="e.g. Coming with partner"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {initial ? "Save" : "Add guest"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
