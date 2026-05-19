import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type {
  Design,
  Field,
  FieldGeometry,
  PartId,
  ResizeHandle,
  Side,
} from '#/lib/invitation/types'
import { useDesignStore, selectCurrentFields } from '#/stores/design.store'
import { PART_DIMENSIONS } from '#/lib/invitation/defaults'
import {
  applyAxisLock,
  clampToBounds,
  resizeRect,
  snapToGrid,
} from '#/lib/invitation/geometry'
import { getColorScheme } from '#/lib/invitation/colorSchemes'
import { GridOverlay } from '#/components/editor/GridOverlay'
import { FieldRenderer } from '#/components/editor/FieldRenderer'
import { SelectionFrame } from '#/components/editor/SelectionFrame'
import { InlineTextEditor } from '#/components/editor/InlineTextEditor'
import { FloatingToolbar } from '#/components/editor/FloatingToolbar'
import { CanvasContextMenu } from '#/components/editor/ContextMenu'
import { GhostCard } from '#/components/editor/GhostCard'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'

function getPartBg(design: Design, partId: PartId, defaultBg: string): string {
  if (partId === 'invitation') return defaultBg
  const overrideId = design.partColorSchemes?.[partId]
  return overrideId ? getColorScheme(overrideId).bg : defaultBg
}

// Refs hold drag/resize setup state (initial geom, start pointer).
// useState holds live visual position during the interaction.
interface DragState {
  fieldId: string
  initialGeom: FieldGeometry
  startPx: { x: number; y: number }
}

interface ResizeState {
  fieldId: string
  handle: ResizeHandle
  initialGeom: FieldGeometry
  startPx: { x: number; y: number }
  isCorner: boolean
}

export const Canvas = () => {
  const cardRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    fieldId: string | null
    cardOffsetLeft: number
    cardOffsetTop: number
  } | null>(null)

  const dragRef = useRef<DragState | null>(null)
  const resizeRef = useRef<ResizeState | null>(null)

  const [sidebarOpen, setSidebarOpen] = useState(true)

  const [liveDrag, setLiveDrag] = useState<{
    fieldId: string
    dx: number
    dy: number
  } | null>(null)
  const [liveResize, setLiveResize] = useState<{
    fieldId: string
    geom: FieldGeometry
  } | null>(null)

  const activePart = useDesignStore((s) => s.activePart)
  const activeSide = useDesignStore((s) => s.activeSide)
  const selectedId = useDesignStore((s) => s.selectedId)
  const editingId = useDesignStore((s) => s.editingId)
  const gridEnabled = useDesignStore((s) => s.gridEnabled)
  const gridSize = useDesignStore((s) => s.gridSize)
  const design = useDesignStore((s) => s.design)
  const fields = useDesignStore(selectCurrentFields)

  const setSelected = useDesignStore((s) => s.setSelected)
  const setEditing = useDesignStore((s) => s.setEditing)
  const setActivePart = useDesignStore((s) => s.setActivePart)
  const setActiveSide = useDesignStore((s) => s.setActiveSide)
  const moveField = useDesignStore((s) => s.moveField)
  const resizeField = useDesignStore((s) => s.resizeField)
  const updateField = useDesignStore((s) => s.updateField)
  const togglePartEnabled = useDesignStore((s) => s.togglePartEnabled)
  const setPartColorScheme = useDesignStore((s) => s.setPartColorScheme)

  const dims = PART_DIMENSIONS[activePart]
  const colors = getColorScheme(design.colorScheme)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(() => {
      const { width, height } = container.getBoundingClientRect()
      const padding = 48
      const s = Math.min(
        (width - padding) / dims.w,
        (height - padding) / dims.h,
        1.5,
      )
      setScale(Math.max(0.2, s))
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [dims])

  const cardPx = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const rect = cardRef.current!.getBoundingClientRect()
      return {
        x: (clientX - rect.left) / scale,
        y: (clientY - rect.top) / scale,
      }
    },
    [scale],
  )

  const onFieldPointerDown = useCallback(
    (e: React.PointerEvent, field: Field) => {
      if (e.button !== 0) return
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)
      setSelected(field.id)
      dragRef.current = {
        fieldId: field.id,
        initialGeom: { ...field.geom },
        startPx: cardPx(e.clientX, e.clientY),
      }
    },
    [cardPx, setSelected],
  )

  const onResizeStart = useCallback(
    (handle: ResizeHandle, e: React.PointerEvent) => {
      if (!selectedId) return
      const field = fields.find((f) => f.id === selectedId)
      if (!field) return
      e.currentTarget.setPointerCapture(e.pointerId)
      resizeRef.current = {
        fieldId: selectedId,
        handle,
        initialGeom: { ...field.geom },
        startPx: cardPx(e.clientX, e.clientY),
        isCorner: ['nw', 'ne', 'sw', 'se'].includes(handle),
      }
    },
    [selectedId, fields, cardPx],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const current = cardPx(e.clientX, e.clientY)

      if (dragRef.current) {
        const { fieldId, initialGeom, startPx } = dragRef.current
        const { dx, dy } = applyAxisLock(startPx, current, e.shiftKey)
        setLiveDrag({
          fieldId,
          dx:
            snapToGrid(initialGeom.x + dx, gridSize, gridEnabled) -
            initialGeom.x,
          dy:
            snapToGrid(initialGeom.y + dy, gridSize, gridEnabled) -
            initialGeom.y,
        })
      }

      if (resizeRef.current) {
        const { fieldId, handle, initialGeom, startPx, isCorner } =
          resizeRef.current
        const dx = current.x - startPx.x
        const dy = current.y - startPx.y
        const newGeom = resizeRect(initialGeom, handle, dx, dy, {
          lockAspect:
            isCorner && fields.find((f) => f.id === fieldId)?.type === 'text',
        })
        setLiveResize({ fieldId, geom: clampToBounds(newGeom, dims) })
      }
    },
    [gridEnabled, gridSize, dims, fields, cardPx],
  )

  const onPointerUp = useCallback(() => {
    if (liveDrag && (liveDrag.dx !== 0 || liveDrag.dy !== 0)) {
      moveField(activePart, liveDrag.fieldId, liveDrag.dx, liveDrag.dy)
    }
    if (liveResize) {
      resizeField(
        activePart,
        liveResize.fieldId,
        liveResize.geom,
        resizeRef.current?.isCorner ?? false,
      )
    }
    dragRef.current = null
    resizeRef.current = null
    setLiveDrag(null)
    setLiveResize(null)
  }, [activePart, moveField, resizeField, liveDrag, liveResize])

  const onDoubleClick = useCallback(
    (_e: React.MouseEvent, field: Field) => {
      if (field.type !== 'text') return
      setEditing(field.id)
    },
    [setEditing],
  )

  const onCanvasClick = useCallback(
    (_e: React.MouseEvent) => {
      if (contextMenu) {
        setContextMenu(null)
        return
      }
      setSelected(null)
      setEditing(null)
    },
    [contextMenu, setSelected, setEditing],
  )

  const onContextMenu = useCallback(
    (e: React.MouseEvent, fieldId: string | null) => {
      e.preventDefault()
      e.stopPropagation()
      const pos = cardPx(e.clientX, e.clientY)
      const card = cardRef.current
      setContextMenu({
        x: pos.x,
        y: pos.y,
        fieldId,
        cardOffsetLeft: card ? card.offsetLeft : 0,
        cardOffsetTop: card ? card.offsetTop : 0,
      })
    },
    [cardPx, cardRef],
  )

  const selectedField = fields.find((f) => f.id === selectedId)
  const editingField = fields.find((f) => f.id === editingId)

  return (
    <div className="relative flex flex-1 overflow-hidden bg-muted">
      {/* Main card area */}
      <div
        ref={containerRef}
        className="relative flex flex-1 items-center justify-center"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* Card */}
        <div
          ref={cardRef}
          data-testid="canvas-card"
          data-scheme={
            design.partColorSchemes?.[activePart as 'extra' | 'envelope'] ??
            design.colorScheme
          }
          style={{
            width: dims.w,
            height: dims.h,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            position: 'relative',
            flexShrink: 0,
            background: getPartBg(design, activePart, colors.bg),
            boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
          }}
          onClick={onCanvasClick}
          onContextMenu={(e) => onContextMenu(e, null)}
        >
          <GridOverlay
            enabled={gridEnabled}
            size={gridSize}
            width={dims.w}
            height={dims.h}
          />

          {activePart === 'envelope' && (
            <svg
              data-testid="canvas-envelope-fold"
              className="no-print"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 1,
              }}
              viewBox={`0 0 ${dims.w} ${dims.h}`}
              preserveAspectRatio="none"
            >
              <polyline
                points={`0,0 ${dims.w / 2},${dims.h * 0.38} ${dims.w},0`}
                fill="none"
                stroke={colors.border}
                strokeWidth="1.5"
                strokeDasharray="6,6"
                opacity="0.45"
              />
            </svg>
          )}

          {/* Front/back switcher — overlaid at card bottom, hidden on print */}
          <div
            className="no-print"
            style={{
              position: 'absolute',
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex overflow-hidden rounded-lg border border-border bg-card shadow-sm">
              {(['front', 'back'] as Side[]).map((side) => (
                <Button
                  key={side}
                  size="sm"
                  variant={activeSide === side ? 'default' : 'ghost'}
                  className="h-7 rounded-none px-3 text-xs capitalize"
                  onClick={() => setActiveSide(side)}
                >
                  {side}
                </Button>
              ))}
            </div>
          </div>

          {fields.map((field) => {
            const isSelected = field.id === selectedId
            const isEditing = field.id === editingId

            const geom: FieldGeometry =
              liveDrag?.fieldId === field.id
                ? {
                    ...field.geom,
                    x: field.geom.x + liveDrag.dx,
                    y: field.geom.y + liveDrag.dy,
                  }
                : liveResize?.fieldId === field.id
                  ? liveResize.geom
                  : field.geom

            return (
              <div
                key={field.id}
                style={{
                  position: 'absolute',
                  left: geom.x,
                  top: geom.y,
                  width: geom.w,
                  height: geom.h,
                  cursor: isEditing ? 'text' : 'move',
                }}
                onPointerDown={(e) => onFieldPointerDown(e, field)}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => onDoubleClick(e, field)}
                onContextMenu={(e) => onContextMenu(e, field.id)}
              >
                <FieldRenderer
                  field={field}
                  colorScheme={design.colorScheme}
                  defaultFontId={design.defaultFontId}
                  isEditing={isEditing}
                />
                {isEditing &&
                  field.type === 'text' &&
                  editingField?.type === 'text' && (
                    <InlineTextEditor
                      field={editingField}
                      colorScheme={design.colorScheme}
                      defaultFontId={design.defaultFontId}
                      onCommit={(content) => {
                        updateField(activePart, field.id, {
                          content,
                        })
                        setEditing(null)
                      }}
                      onCancel={() => setEditing(null)}
                    />
                  )}
                {isSelected && !isEditing && (
                  <SelectionFrame onResizeStart={onResizeStart} />
                )}
              </div>
            )
          })}
        </div>

        {selectedField && !editingId && !liveDrag && !liveResize && (
          <FloatingToolbar
            field={selectedField}
            cardRef={cardRef}
            scale={scale}
          />
        )}

        {contextMenu && (
          <CanvasContextMenu
            cardX={contextMenu.x}
            cardY={contextMenu.y}
            fieldId={contextMenu.fieldId}
            scale={scale}
            cardOffsetLeft={contextMenu.cardOffsetLeft}
            cardOffsetTop={contextMenu.cardOffsetTop}
            onClose={() => setContextMenu(null)}
          />
        )}
      </div>

      {/* Ghost panel */}
      <div
        data-testid="ghost-panel"
        className={cn(
          'relative flex flex-shrink-0 border-l border-border bg-background transition-all duration-150',
          sidebarOpen ? 'w-44' : 'w-8',
        )}
      >
        <button
          data-testid="ghost-panel-toggle"
          onClick={() => setSidebarOpen((v) => !v)}
          className="absolute -left-3 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:text-foreground"
          title={sidebarOpen ? 'Collapse parts panel' : 'Expand parts panel'}
        >
          {sidebarOpen ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        {sidebarOpen && (
          <div className="flex w-full flex-col items-center justify-center gap-8 px-3 py-6">
            <GhostCard
              partId="invitation"
              label="Invitation"
              design={design}
              activePart={activePart}
              onActivate={() => setActivePart('invitation')}
            />
            <GhostCard
              partId="extra"
              label="Extra"
              design={design}
              activePart={activePart}
              onActivate={() => setActivePart('extra')}
              onToggle={() => togglePartEnabled('extra')}
              onSetColorScheme={(id) => setPartColorScheme('extra', id)}
            />
            <GhostCard
              partId="envelope"
              label="Envelope"
              design={design}
              activePart={activePart}
              onActivate={() => setActivePart('envelope')}
              onToggle={() => togglePartEnabled('envelope')}
              onSetColorScheme={(id) => setPartColorScheme('envelope', id)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
