import { useState } from 'react'
import { CircleHelp, Plus, Trash2 } from 'lucide-react'
import { useDesignStore } from '#/stores/design.store'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Toggle } from '#/components/ui/toggle'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '#/components/ui/tooltip'
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

          <div className="flex items-center gap-2 text-sm text-foreground">
            <Toggle
              size="sm"
              pressed={includeInHash}
              onPressedChange={setIncludeGuestsInHash}
              className="relative h-5 w-9 rounded-full border border-border bg-muted p-0 transition-colors hover:bg-muted data-[state=on]:border-primary data-[state=on]:bg-primary after:absolute after:left-0.5 after:top-1/2 after:h-3.5 after:w-3.5 after:-translate-y-1/2 after:rounded-full after:bg-background after:transition-transform after:content-[''] data-[state=on]:after:translate-x-4"
              aria-label="Include guests in share link"
            />
            <span>Include in share link</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="More info about including guests in share link"
                  >
                    <CircleHelp size={14} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  Share links will contain all guest names and may be longer.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
