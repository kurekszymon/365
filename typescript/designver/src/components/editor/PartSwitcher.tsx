import type { PartId, Side } from '#/lib/invitation/types'
import { useDesignStore } from '#/stores/design.store'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { Button } from '#/components/ui/button'

const PARTS: { id: PartId; label: string }[] = [
  { id: 'invitation', label: 'Invitation' },
  { id: 'extra', label: 'Extra' },
  { id: 'envelope', label: 'Envelope' },
]

export function PartSwitcher() {
  const activePart = useDesignStore((s) => s.activePart)
  const activeSide = useDesignStore((s) => s.activeSide)
  const setActivePart = useDesignStore((s) => s.setActivePart)
  const setActiveSide = useDesignStore((s) => s.setActiveSide)

  return (
    <div className="flex items-center gap-2">
      <ToggleGroup
        type="single"
        value={activePart}
        onValueChange={(v) => {
          if (v) setActivePart(v as PartId)
        }}
        className="rounded-lg border border-border bg-muted p-0.5"
      >
        {PARTS.map(({ id, label }) => (
          <ToggleGroupItem
            key={id}
            value={id}
            className="h-8 rounded-md px-3 text-sm data-[state=on]:bg-background data-[state=on]:shadow-sm"
          >
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="flex overflow-hidden rounded-lg border border-border">
        {(['front', 'back'] as Side[]).map((side) => (
          <Button
            key={side}
            size="sm"
            variant={activeSide === side ? 'default' : 'ghost'}
            className="h-8 rounded-none px-3 text-sm capitalize"
            onClick={() => setActiveSide(side)}
          >
            {side}
          </Button>
        ))}
      </div>
    </div>
  )
}
