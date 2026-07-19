import { useEffect, useRef, useState } from "react"
import { MIN_VERTICES, insertMidpoint, normalizeGeometry } from "./geometryEdit"
import { snapPositionToGrid } from "./utils"
import type { Hall, Position } from "@/stores/planner.store"
import { usePlannerStore } from "@/stores/planner.store"
import { usePanelStore } from "@/stores/panel.store"
import { useViewStore } from "@/stores/view.store"

interface ShapeEditOverlayProps {
  ppm: number
  // Px offset of a hall's top-left inside the world wrapper (from
  // useWorldGeometry, forwarded by HallSurface).
  hallScreenOffset: (hall: Hall) => { left: number; top: number }
}

const HANDLE_R = 6
const MIDPOINT_R = 4.5

/**
 * Vertex editor for a custom-polygon entity - a fixture's outline or a hall's
 * floor plan - active while the panel view is `shape.edit`. Renders on top of
 * the halls inside the world wrapper, in the target's hall-local frame (the
 * hall itself edits at the hall origin):
 * - drag a round handle to move a vertex (grid-snapped via the canvas snap
 *   setting); the outline previews from local draft state and commits to the
 *   store (normalized + persisted) on release,
 * - click a hollow midpoint marker to insert a vertex on that edge,
 * - double-click a handle to remove it (a triangle is the floor),
 * - Escape returns to the entity's edit form.
 */
export const ShapeEditOverlay = ({
  ppm,
  hallScreenOffset,
}: ShapeEditOverlayProps) => {
  const view = usePanelStore((s) =>
    s.view?.kind === "shape.edit" ? s.view : null
  )
  const openFixtureEdit = usePanelStore((s) => s.openFixtureEdit)
  const openHallEdit = usePanelStore((s) => s.openHallEdit)
  const isHall = view?.entityKind === "hall"
  const fixture = usePlannerStore((s) =>
    view && view.entityKind === "fixture"
      ? s.fixtures.find((f) => f.id === view.id)
      : undefined
  )
  const hall = usePlannerStore((s) =>
    view
      ? s.halls.find((h) =>
          view.entityKind === "hall"
            ? h.id === view.id
            : h.id === fixture?.hallId
        )
      : undefined
  )
  const setFixtureShape = usePlannerStore((s) => s.setFixtureShape)
  const setHallShape = usePlannerStore((s) => s.setHallShape)
  const snapStep = useViewStore((s) => s.snapStep)

  // Non-null only while a handle drag is in flight - the outline renders from
  // it so the store (and the entity underneath) only updates on release.
  const [draft, setDraft] = useState<Array<Position> | null>(null)
  const dragRef = useRef<{
    index: number
    startClient: Position
    startVertex: Position
  } | null>(null)

  useEffect(() => {
    if (!view) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      if (view.entityKind === "hall") openHallEdit(view.id)
      else openFixtureEdit(view.id)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [view, openFixtureEdit, openHallEdit])

  // The entity can vanish mid-edit (deleted via the AI chat); the Done
  // toolbar in Canvas still offers the way out.
  const geometry = isHall ? hall?.geometry : fixture?.geometry
  if (!view || !hall || !geometry || (!isHall && !fixture)) return null

  const size = isHall ? hall.size : fixture!.size
  // Hall-local px offset of the edited entity's origin; the hall itself edits
  // at the hall origin, so vertices are already in the hall's grid frame.
  const origin = isHall ? { x: 0, y: 0 } : fixture!.position
  const vertices = draft ?? geometry.vertices
  const offset = hallScreenOffset(hall)
  const left = offset.left + origin.x * ppm
  const top = offset.top + origin.y * ppm

  const commit = (verts: Array<Position>) => {
    const normalized = normalizeGeometry(verts, geometry.closed)
    if (isHall) {
      // The normalize offset moves the hall's world origin; setHallShape
      // counter-shifts the hall's entities so they stay put on the canvas.
      setHallShape(hall.id, {
        preset: hall.preset,
        geometry: normalized.geometry,
        size: normalized.size,
        position: {
          x: hall.position.x + normalized.offset.x,
          y: hall.position.y + normalized.offset.y,
        },
      })
    } else {
      setFixtureShape(fixture!.id, {
        shape: "polygon",
        geometry: normalized.geometry,
        size: normalized.size,
        rotation: 0,
        position: {
          x: fixture!.position.x + normalized.offset.x,
          y: fixture!.position.y + normalized.offset.y,
        },
      })
    }
    setDraft(null)
  }

  // Snap against the hall-local grid, not the vertex's object-local frame -
  // the grid the user sees is anchored to the hall. (For the hall itself the
  // two frames coincide.)
  const snapVertex = (v: Position): Position => {
    if (snapStep === "off") return v
    const abs = snapPositionToGrid(
      { x: origin.x + v.x, y: origin.y + v.y },
      snapStep
    )
    return {
      x: abs.x - origin.x,
      y: abs.y - origin.y,
    }
  }

  const onHandlePointerDown =
    (index: number) => (e: React.PointerEvent<SVGCircleElement>) => {
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)
      dragRef.current = {
        index,
        startClient: { x: e.clientX, y: e.clientY },
        startVertex: vertices[index],
      }
      setDraft(vertices)
    }

  const onHandlePointerMove = (e: React.PointerEvent<SVGCircleElement>) => {
    const drag = dragRef.current
    if (!drag) return
    const moved = snapVertex({
      x: drag.startVertex.x + (e.clientX - drag.startClient.x) / ppm,
      y: drag.startVertex.y + (e.clientY - drag.startClient.y) / ppm,
    })
    setDraft((prev) =>
      prev ? prev.map((v, i) => (i === drag.index ? moved : v)) : prev
    )
  }

  const onHandlePointerUp = () => {
    if (!dragRef.current) return
    dragRef.current = null
    if (draft) commit(draft)
  }

  const removeVertex = (index: number) => {
    if (vertices.length <= MIN_VERTICES) return
    commit(vertices.filter((_, i) => i !== index))
  }

  // Midpoint markers, one per edge (the closing edge only when the outline
  // is closed).
  const edgeCount = geometry.closed ? vertices.length : vertices.length - 1
  const midpoints = Array.from({ length: edgeCount }, (_, i) => {
    const a = vertices[i]
    const b = vertices[(i + 1) % vertices.length]
    return { edgeIndex: i, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  })

  const points = vertices.map((v) => `${v.x * ppm},${v.y * ppm}`).join(" ")

  return (
    <svg
      data-no-pan
      className="absolute z-40 touch-none overflow-visible"
      style={{ left, top }}
      width={Math.max(size.width * ppm, 1)}
      height={Math.max(size.height * ppm, 1)}
    >
      {/* Live outline preview; pointer-events none so the entity below stays
          reachable through the fill. */}
      {geometry.closed ? (
        <polygon
          points={points}
          className="pointer-events-none fill-planner-selected/10 stroke-planner-selected"
          strokeWidth={1.5}
        />
      ) : (
        <polyline
          points={points}
          className="pointer-events-none fill-none stroke-planner-selected"
          strokeWidth={1.5}
        />
      )}

      {midpoints.map((m) => (
        <circle
          key={`mid-${m.edgeIndex}`}
          cx={m.x * ppm}
          cy={m.y * ppm}
          r={MIDPOINT_R}
          className="cursor-copy fill-card stroke-planner-selected"
          strokeWidth={1.5}
          strokeDasharray="2 2"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            commit(insertMidpoint(vertices, m.edgeIndex))
          }}
        />
      ))}

      {vertices.map((v, index) => (
        <circle
          // Index keys are fine: commits re-anchor every vertex anyway, so
          // there's no per-vertex state to preserve across renders.
          key={`v-${index}`}
          cx={v.x * ppm}
          cy={v.y * ppm}
          r={HANDLE_R}
          className="cursor-grab fill-planner-selected stroke-card active:cursor-grabbing"
          strokeWidth={2}
          onPointerDown={onHandlePointerDown(index)}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
          onDoubleClick={(e) => {
            e.stopPropagation()
            removeVertex(index)
          }}
        />
      ))}
    </svg>
  )
}
