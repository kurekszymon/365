import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useDesignStore } from '#/stores/design.store'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Toggle } from '#/components/ui/toggle'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'

export function GuestSidebar() {
  const [newName, setNewName] = useState('')
  const open = useDesignStore((s) => s.guestSidebarOpen)
  const guests = useDesignStore((s) => s.guests)
  const includeInHash = useDesignStore((s) => s.includeGuestsInHash)
  const setGuestSidebarOpen = useDesignStore((s) => s.setGuestSidebarOpen)
  const addGuest = useDesignStore((s) => s.addGuest)
  const removeGuest = useDesignStore((s) => s.removeGuest)
  const setIncludeGuestsInHash = useDesignStore((s) => s.setIncludeGuestsInHash)

  function handleAdd() {
    const name = newName.trim()
    if (!name) return
    addGuest(name)
    setNewName('')
  }

  return (
    <Sheet open={open} onOpenChange={setGuestSidebarOpen}>
      <SheetContent side="right" className="flex w-80 flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border px-4 py-3">
          <SheetTitle className="text-base">Guests & Addressants</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {guests.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No guests added yet.
            </p>
          ) : (
            <ul className="space-y-1">
              {guests.map((name, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent"
                >
                  <span className="text-sm text-foreground">{name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeGuest(i)}
                  >
                    <Trash2 size={12} />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border px-4 py-3 space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Guest name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd()
              }}
              className="h-8 text-sm"
            />
            <Button size="sm" className="h-8 w-8 p-0" onClick={handleAdd}>
              <Plus size={14} />
            </Button>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <Toggle
              size="sm"
              pressed={includeInHash}
              onPressedChange={setIncludeGuestsInHash}
              className="h-5 w-9 rounded-full data-[state=on]:bg-primary"
              aria-label="Include guests in share link"
            />
            Include in share link
          </label>
          {includeInHash && (
            <p className="text-xs text-primary">
              Share links will contain all guest names and may be longer.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
