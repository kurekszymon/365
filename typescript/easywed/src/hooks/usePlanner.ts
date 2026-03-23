import { useEffect, useState } from "react"
import {
  EMPTY_STATE,
  type Dietary,
  type HallConfig,
  type HallDoor,
  type PlannerGuest,
  type PlannerState,
  type PlannerTable,
  type TableShape,
  DEFAULT_TABLE_ROUND_PX,
  DEFAULT_TABLE_RECT_W_PX,
  DEFAULT_TABLE_RECT_H_PX,
  isPointInPolygon,
  getPolygonBounds,
} from "@/lib/planner/types"
import { loadFromLocalStorage, saveToLocalStorage } from "@/lib/planner/storage"

export function usePlanner() {
  const [state, setState] = useState<PlannerState>(
    () => loadFromLocalStorage() ?? EMPTY_STATE
  )

  useEffect(() => {
    saveToLocalStorage(state)
  }, [state])

  // -------------------------------------------------------------------------
  // Hall
  // -------------------------------------------------------------------------

  function updateHall(hall: HallConfig | null) {
    setState((s) => {
      // When ppm changes, rescale existing tables proportionally
      const oldPpm = s.hall?.pixelsPerMeter
      const newPpm = hall?.pixelsPerMeter
      if (oldPpm && newPpm && oldPpm !== newPpm) {
        const ratio = newPpm / oldPpm
        return {
          ...s,
          hall,
          tables: s.tables.map((t) => ({
            ...t,
            x: t.x * ratio,
            y: t.y * ratio,
            widthPx: Math.round(t.widthPx * ratio),
            heightPx: Math.round(t.heightPx * ratio),
          })),
          chairSizePx: Math.round(s.chairSizePx * ratio),
        }
      }
      return { ...s, hall }
    })
  }

  function addDoor(door: HallDoor) {
    setState((s) => {
      if (!s.hall) return s
      return {
        ...s,
        hall: { ...s.hall, doors: [...s.hall.doors, door] },
      }
    })
  }

  function removeDoor(doorId: string) {
    setState((s) => {
      if (!s.hall) return s
      return {
        ...s,
        hall: {
          ...s.hall,
          doors: s.hall.doors.filter((d) => d.id !== doorId),
        },
      }
    })
  }

  function updateChairSize(chairSizePx: number) {
    setState((s) => ({ ...s, chairSizePx }))
  }

  // -------------------------------------------------------------------------
  // Tables
  // -------------------------------------------------------------------------

  function addTable(table: {
    name: string
    shape: TableShape
    capacity: number
    x?: number
    y?: number
    widthPx?: number
    heightPx?: number
  }) {
    const defaultW =
      table.shape === "round" ? DEFAULT_TABLE_ROUND_PX : DEFAULT_TABLE_RECT_W_PX
    const defaultH =
      table.shape === "round" ? DEFAULT_TABLE_ROUND_PX : DEFAULT_TABLE_RECT_H_PX

    setState((s) => ({
      ...s,
      tables: [
        ...s.tables,
        {
          id: crypto.randomUUID(),
          x: table.x ?? 80 + s.tables.length * 220,
          y: table.y ?? 80,
          widthPx: table.widthPx ?? defaultW,
          heightPx: table.heightPx ?? defaultH,
          ...table,
        },
      ],
    }))
  }

  function updateTable(id: string, updates: Partial<PlannerTable>) {
    setState((s) => {
      const newTables = s.tables.map((t) => {
        if (t.id !== id) return t
        const updated = { ...t, ...updates }

        // Constrain table + chairs inside hall polygon
        if (s.hall && (updates.x !== undefined || updates.y !== undefined)) {
          const co = s.chairSizePx + 4 // chair overflow beyond table edge
          const poly = s.hall.points
          const w = updated.widthPx
          const h = updated.heightPx

          const fitsInHall = (x: number, y: number) =>
            isPointInPolygon(x - co, y - co, poly) &&
            isPointInPolygon(x + w + co, y - co, poly) &&
            isPointInPolygon(x + w + co, y + h + co, poly) &&
            isPointInPolygon(x - co, y + h + co, poly)

          // 1) Clamp to polygon bounding box — smooth sliding along outer walls
          const bounds = getPolygonBounds(poly)
          if (bounds) {
            updated.x = Math.max(
              bounds.minX + co,
              Math.min(bounds.maxX - w - co, updated.x)
            )
            updated.y = Math.max(
              bounds.minY + co,
              Math.min(bounds.maxY - h - co, updated.y)
            )
          }

          // 2) Check expanded rect against polygon; resolve per-axis for smooth
          //    wall sliding, especially in corners.
          if (!fitsInHall(updated.x, updated.y)) {
            const search = (
              good: number,
              bad: number,
              test: (v: number) => boolean
            ) => {
              for (let i = 0; i < 10; i++) {
                const mid = (good + bad) / 2
                if (test(mid)) good = mid
                else bad = mid
              }
              return good
            }

            // Try X only (keep old Y) — allows sliding along horizontal walls
            const canX = fitsInHall(updated.x, t.y)
            // Try Y only (keep old X) — allows sliding along vertical walls
            const canY = fitsInHall(t.x, updated.y)

            if (canX && canY) {
              // Both axes work individually; pick the one closer to the target,
              // then binary search the other axis from there
              updated.y = search(t.y, updated.y, (y) =>
                fitsInHall(updated.x, y)
              )
            } else if (canX) {
              // Only X movement is valid — binary search Y from old position
              updated.y = search(t.y, updated.y, (y) =>
                fitsInHall(updated.x, y)
              )
            } else if (canY) {
              // Only Y movement is valid — binary search X from old position
              updated.x = search(t.x, updated.x, (x) =>
                fitsInHall(x, updated.y)
              )
            } else {
              // Neither axis works alone — search each independently
              updated.x = search(t.x, updated.x, (x) => fitsInHall(x, t.y))
              updated.y = search(t.y, updated.y, (y) =>
                fitsInHall(updated.x, y)
              )
            }
          }
        }

        return updated
      })
      return { ...s, tables: newTables }
    })
  }

  function deleteTable(id: string) {
    setState((s) => ({
      ...s,
      tables: s.tables.filter((t) => t.id !== id),
      guests: s.guests.map((g) =>
        g.tableId === id ? { ...g, tableId: null } : g
      ),
    }))
  }

  // -------------------------------------------------------------------------
  // Guests
  // -------------------------------------------------------------------------

  function addGuest(guest: { name: string; dietary: Dietary[]; note?: string }) {
    setState((s) => ({
      ...s,
      guests: [
        ...s.guests,
        { id: crypto.randomUUID(), tableId: null, ...guest },
      ],
    }))
  }

  function updateGuest(id: string, updates: Partial<PlannerGuest>) {
    setState((s) => ({
      ...s,
      guests: s.guests.map((g) => (g.id === id ? { ...g, ...updates } : g)),
    }))
  }

  function deleteGuest(id: string) {
    setState((s) => ({
      ...s,
      guests: s.guests.filter((g) => g.id !== id),
    }))
  }

  function assignGuest(guestId: string, tableId: string | null) {
    updateGuest(guestId, { tableId })
  }

  // -------------------------------------------------------------------------
  // Wedding
  // -------------------------------------------------------------------------

  function updateWeddingName(name: string) {
    setState((s) => ({ ...s, weddingName: name }))
  }

  function importState(newState: PlannerState) {
    setState(newState)
  }

  function resetState() {
    setState(EMPTY_STATE)
  }

  return {
    state,
    addTable,
    updateTable,
    deleteTable,
    addGuest,
    updateGuest,
    deleteGuest,
    assignGuest,
    updateWeddingName,
    importState,
    resetState,
    updateHall,
    addDoor,
    removeDoor,
    updateChairSize,
  }
}
