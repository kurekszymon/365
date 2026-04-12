import {
  createContext,
  useCallback,
  useContext,
  useRef,
} from "react"
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import type { DragEndEvent } from "@dnd-kit/core"
import { usePlannerStore } from "@/stores/planner.store"

// HallSurface registers its drag-end handler here so it keeps access to its
// local ppm/snapStep values, while the DndContext lives above both canvas and panel.
type TableDragHandler = (e: DragEndEvent) => void
const TableDragHandlerCtx = createContext<(h: TableDragHandler) => void>(() => {})
export const useRegisterTableDragHandler = () => useContext(TableDragHandlerCtx)

export const PlannerDndProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const tableDragHandlerRef = useRef<TableDragHandler | null>(null)
  const register = useCallback((h: TableDragHandler) => {
    tableDragHandlerRef.current = h
  }, [])

  const assignGuestToTable = usePlannerStore(
    (state) => state.assignGuestToTable
  )

  // Same distance constraint as before — prevents pointerdown from swallowing clicks.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const handleDragEnd = (e: DragEndEvent) => {
    const type = e.active.data.current?.type

    if (type === "table-drag") {
      tableDragHandlerRef.current?.(e)
      return
    }

    if (type === "guest") {
      const overType = e.over?.data.current?.type
      if (overType === "table") {
        assignGuestToTable(
          String(e.active.id),
          e.over!.data.current!.tableId as string
        )
      } else if (overType === "unassigned") {
        assignGuestToTable(String(e.active.id), null)
      }
      // dropped on nothing / hall surface → no-op
    }
  }

  return (
    <TableDragHandlerCtx.Provider value={register}>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        {children}
      </DndContext>
    </TableDragHandlerCtx.Provider>
  )
}
