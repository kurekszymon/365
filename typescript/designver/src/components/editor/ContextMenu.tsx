import { useEffect, useRef } from 'react'
import {
  Type,
  Minus,
  ImageIcon,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { useDesignStore } from '#/stores/design.store'

interface CanvasContextMenuProps {
  cardX: number
  cardY: number
  fieldId: string | null
  scale: number
  cardOffsetLeft: number
  cardOffsetTop: number
  onClose: () => void
}

export function CanvasContextMenu({
  cardX,
  cardY,
  fieldId,
  scale,
  cardOffsetLeft,
  cardOffsetTop,
  onClose,
}: CanvasContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  const activePart = useDesignStore((s) => s.activePart)
  const activeSide = useDesignStore((s) => s.activeSide)
  const addField = useDesignStore((s) => s.addField)
  const removeField = useDesignStore((s) => s.removeField)
  const duplicateField = useDesignStore((s) => s.duplicateField)
  const bringToFront = useDesignStore((s) => s.bringToFront)
  const sendToBack = useDesignStore((s) => s.sendToBack)
  const fields = useDesignStore((s) => s.design.parts[activePart][activeSide])

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

  // Position in DOM coordinates (relative to card's parent)
  const menuLeft = cardOffsetLeft + cardX * scale
  const menuTop = cardOffsetTop + cardY * scale

  const field = fieldId ? fields.find((f) => f.id === fieldId) : null

  function addText() {
    addField(activePart, activeSide, {
      type: 'text',
      id: '',
      content: 'Text',
      format: { fontSize: 18, textAlign: 'center' },
      geom: {
        x: Math.max(0, cardX - 100),
        y: Math.max(0, cardY - 20),
        w: 200,
        h: 40,
      },
    })
    onClose()
  }

  function addSeparator() {
    addField(activePart, activeSide, {
      type: 'separator',
      id: '',
      style: 'line',
      thickness: 1,
      geom: {
        x: Math.max(0, cardX - 100),
        y: Math.max(0, cardY - 12),
        w: 200,
        h: 24,
      },
    })
    onClose()
  }

  function addIcon() {
    addField(activePart, activeSide, {
      type: 'icon',
      id: '',
      iconKey: 'heart',
      geom: {
        x: Math.max(0, cardX - 30),
        y: Math.max(0, cardY - 30),
        w: 60,
        h: 60,
      },
    })
    onClose()
  }

  function handleBringToFront() {
    if (fieldId) bringToFront(activePart, activeSide, fieldId)
    onClose()
  }

  function handleSendToBack() {
    if (fieldId) sendToBack(activePart, activeSide, fieldId)
    onClose()
  }

  return (
    <div
      ref={ref}
      className="absolute z-[100] min-w-40 overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-xl"
      style={{ left: menuLeft, top: menuTop }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {field ? (
        <>
          <MenuItem
            icon={<Copy size={13} />}
            label="Duplicate"
            onClick={() => {
              duplicateField(activePart, activeSide, field.id)
              onClose()
            }}
          />
          {activeSide === 'back' && (
            <MenuItem
              icon={<ArrowUp size={13} />}
              label="Move to front"
              onClick={handleBringToFront}
            />
          )}
          {activeSide === 'front' && (
            <MenuItem
              icon={<ArrowDown size={13} />}
              label="Move to back"
              onClick={handleSendToBack}
            />
          )}
          <div className="my-1 border-t border-border" />
          <MenuItem
            icon={<Type size={13} />}
            label="Add text"
            onClick={addText}
          />
          <MenuItem
            icon={<Minus size={13} />}
            label="Add separator"
            onClick={addSeparator}
          />
          <MenuItem
            icon={<ImageIcon size={13} />}
            label="Add icon"
            onClick={addIcon}
          />
          <div className="my-1 border-t border-border" />
          <MenuItem
            icon={<Trash2 size={13} />}
            label="Delete"
            danger
            onClick={() => {
              removeField(activePart, field.id)
              onClose()
            }}
          />
        </>
      ) : (
        <>
          <MenuItem
            icon={<Type size={13} />}
            label="Add text"
            onClick={addText}
          />
          <MenuItem
            icon={<Minus size={13} />}
            label="Add separator"
            onClick={addSeparator}
          />
          <MenuItem
            icon={<ImageIcon size={13} />}
            label="Add icon"
            onClick={addIcon}
          />
        </>
      )}
    </div>
  )
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent ${danger ? 'text-destructive' : 'text-foreground'}`}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  )
}
