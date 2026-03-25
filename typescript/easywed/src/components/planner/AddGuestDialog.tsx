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
import { Button } from "@/components/ui/button"
import type { Dietary, PlannerGuest } from "@/lib/planner/types"
import { DIETARY_COLORS, DIETARY_LABELS } from "@/lib/planner/types"
import { cn } from "@/lib/utils"

const DIETARY_OPTIONS = Object.keys(DIETARY_LABELS) as Dietary[]

interface Props {
  open: boolean
  onClose: () => void
  onSave: (guest: { name: string; dietary: Dietary[]; note?: string }) => void
  initial?: Partial<PlannerGuest>
}

export function AddGuestDialog({ open, onClose, onSave, initial }: Props) {
  const [name, setName] = useState(initial?.name ?? "")
  const [dietary, setDietary] = useState<Dietary[]>(initial?.dietary ?? [])
  const [note, setNote] = useState(initial?.note ?? "")

  function toggleDietary(option: Dietary) {
    setDietary((prev) =>
      prev.includes(option)
        ? prev.filter((d) => d !== option)
        : [...prev, option]
    )
  }

  function handleSave() {
    if (!name.trim()) return
    onSave({ name: name.trim(), dietary, note: note.trim() || undefined })
    setName("")
    setDietary([])
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
            <div className="flex flex-wrap gap-1.5">
              {DIETARY_OPTIONS.map((option) => {
                const active = dietary.includes(option)
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleDietary(option)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                      active
                        ? cn(DIETARY_COLORS[option], "border-transparent")
                        : "border-border bg-background text-muted-foreground hover:border-foreground/30"
                    )}
                  >
                    {DIETARY_LABELS[option]}
                  </button>
                )
              })}
            </div>
            {dietary.length === 0 && (
              <p className="text-[11px] text-muted-foreground">
                No restrictions selected
              </p>
            )}
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
