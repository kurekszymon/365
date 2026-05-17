import type { ResizeHandle } from '#/lib/invitation/types'

interface SelectionFrameProps {
  onResizeStart: (handle: ResizeHandle, e: React.PointerEvent) => void
}

const HANDLES: { id: ResizeHandle; style: React.CSSProperties }[] = [
  { id: 'nw', style: { top: -4, left: -4, cursor: 'nw-resize' } },
  {
    id: 'n',
    style: {
      top: -4,
      left: '50%',
      transform: 'translateX(-50%)',
      cursor: 'n-resize',
    },
  },
  { id: 'ne', style: { top: -4, right: -4, cursor: 'ne-resize' } },
  {
    id: 'w',
    style: {
      top: '50%',
      left: -4,
      transform: 'translateY(-50%)',
      cursor: 'w-resize',
    },
  },
  {
    id: 'e',
    style: {
      top: '50%',
      right: -4,
      transform: 'translateY(-50%)',
      cursor: 'e-resize',
    },
  },
  { id: 'sw', style: { bottom: -4, left: -4, cursor: 'sw-resize' } },
  {
    id: 's',
    style: {
      bottom: -4,
      left: '50%',
      transform: 'translateX(-50%)',
      cursor: 's-resize',
    },
  },
  { id: 'se', style: { bottom: -4, right: -4, cursor: 'se-resize' } },
]

export function SelectionFrame({ onResizeStart }: SelectionFrameProps) {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ outline: '2px solid #3b82f6', outlineOffset: '1px' }}
    >
      {HANDLES.map(({ id, style }) => (
        <div
          key={id}
          className="pointer-events-auto absolute"
          style={{
            ...style,
            width: 8,
            height: 8,
            background: 'white',
            border: '1.5px solid #3b82f6',
            borderRadius: 2,
            zIndex: 10,
          }}
          onPointerDown={(e) => {
            e.stopPropagation()
            onResizeStart(id, e)
          }}
        />
      ))}
    </div>
  )
}
