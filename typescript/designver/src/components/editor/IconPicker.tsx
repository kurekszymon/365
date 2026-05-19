import { useEffect, useRef } from 'react'
import { ICON_CATEGORIES, ICON_REGISTRY } from '#/lib/invitation/icons'
import { IconDisplay } from '#/components/editor/IconDisplay'

interface IconPickerProps {
  onSelect: (key: string) => void
  onClose: () => void
}

export function IconPicker({ onSelect, onClose }: IconPickerProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border border-border bg-popover p-3 shadow-xl"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {ICON_CATEGORIES.map((cat) => {
        const icons = ICON_REGISTRY.filter((i) => i.category === cat)
        return (
          <div key={cat} className="mb-3">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {cat}
            </p>
            <div className="grid grid-cols-6 gap-1">
              {icons.map((icon) => (
                <button
                  key={icon.key}
                  className="flex flex-col items-center gap-0.5 rounded p-1.5 text-xs text-muted-foreground hover:bg-accent"
                  title={icon.label}
                  onClick={() => onSelect(icon.key)}
                >
                  <IconDisplay iconKey={icon.key} size={20} />
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
