import { useEffect, useState } from "react"
import {
  EMPTY_STATE,
  type Dietary,
  type PlannerGuest,
  type PlannerState,
  type PlannerTable,
  type TableShape,
} from "@/lib/planner/types"
import { loadFromLocalStorage, saveToLocalStorage } from "@/lib/planner/storage"

export function usePlanner() {
  const [state, setState] = useState<PlannerState>(
    () => loadFromLocalStorage() ?? EMPTY_STATE
  )

  useEffect(() => {
    saveToLocalStorage(state)
  }, [state])

  function addTable(table: {
    name: string
    shape: TableShape
    capacity: number
    x?: number
    y?: number
  }) {
    setState((s) => ({
      ...s,
      tables: [
        ...s.tables,
        {
          id: crypto.randomUUID(),
          x: table.x ?? 80 + s.tables.length * 220,
          y: table.y ?? 80,
          ...table,
        },
      ],
    }))
  }

  function updateTable(id: string, updates: Partial<PlannerTable>) {
    setState((s) => ({
      ...s,
      tables: s.tables.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }))
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

  function addGuest(guest: { name: string; dietary: Dietary; note?: string }) {
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
  }
}
