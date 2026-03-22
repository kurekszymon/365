import { useState } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"

// dnd-kit caches droppable rects from the element's layout position, which does
// not include CSS `transform: translate(x, y)` on the table cards. Instead we
// call getBoundingClientRect() live on each pointer-move frame, which always
// returns the correct visual position including all ancestor transforms.
const liveRectCollision: CollisionDetection = ({
  droppableContainers,
  pointerCoordinates,
}) => {
  if (!pointerCoordinates) return []
  const { x, y } = pointerCoordinates
  return droppableContainers
    .filter((container) => {
      const node = container.node.current
      if (!node) return false
      const { left, right, top, bottom } = node.getBoundingClientRect()
      return x >= left && x <= right && y >= top && y <= bottom
    })
    .map((container) => ({ id: container.id }))
}
import { usePlanner } from "@/hooks/usePlanner"
import type { PlannerGuest, PlannerTable } from "@/lib/planner/types"
import { DIETARY_COLORS } from "@/lib/planner/types"
import { PlannerToolbar } from "./PlannerToolbar"
import { PlannerCanvas } from "./PlannerCanvas"
import { PlannerListView } from "./PlannerListView"
import { GuestSidebar } from "./GuestSidebar"
import { AddTableDialog } from "./AddTableDialog"
import { AddGuestDialog } from "./AddGuestDialog"
import { PlannerPrintView } from "./PlannerPrintView"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function TablePlanner() {
  const {
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
  } = usePlanner()

  const [view, setView] = useState<"canvas" | "list">("canvas")
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null)
  const [activeDragGuest, setActiveDragGuest] = useState<PlannerGuest | null>(
    null
  )

  // Dialog states
  const [addTableOpen, setAddTableOpen] = useState(false)
  const [editingTable, setEditingTable] = useState<PlannerTable | null>(null)
  const [addGuestOpen, setAddGuestOpen] = useState(false)
  const [editingGuest, setEditingGuest] = useState<PlannerGuest | null>(null)
  const [renamingWedding, setRenamingWedding] = useState(false)
  const [renameValue, setRenameValue] = useState(state.weddingName)

  // PointerSensor covers both mouse and touch (Pointer Events API).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function handleAssignGuest(tableId: string, guestId?: string) {
    const id = guestId ?? selectedGuestId
    if (!id) return
    const table = state.tables.find((t) => t.id === tableId)
    if (!table) return
    const seated = state.guests.filter((g) => g.tableId === tableId).length
    if (seated >= table.capacity) return
    assignGuest(id, tableId)
    setSelectedGuestId(null)
  }

  function handleDragStart(event: DragStartEvent) {
    const guest = state.guests.find((g) => g.id === event.active.id)
    setActiveDragGuest(guest ?? null)
    // Clear click-selection while dragging
    setSelectedGuestId(null)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over) {
      handleAssignGuest(over.id as string, active.id as string)
    }
    setActiveDragGuest(null)
  }

  function handleRename() {
    if (renameValue.trim()) updateWeddingName(renameValue.trim())
    setRenamingWedding(false)
  }

  return (
    <>
      <PlannerPrintView state={state} />

      <div className="flex h-svh flex-col print:hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={liveRectCollision}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <PlannerToolbar
            view={view}
            onToggleView={() =>
              setView((v) => (v === "canvas" ? "list" : "canvas"))
            }
            onAddTable={() => setAddTableOpen(true)}
            onAddGuest={() => setAddGuestOpen(true)}
            state={state}
            onImport={importState}
            weddingName={state.weddingName}
            onEditName={() => {
              setRenameValue(state.weddingName)
              setRenamingWedding(true)
            }}
          />

          <div className="flex flex-1 overflow-hidden">
            {view === "canvas" ? (
              <>
                <PlannerCanvas
                  tables={state.tables}
                  guests={state.guests}
                  selectedGuestId={selectedGuestId}
                  onMoveTable={(id, x, y) => updateTable(id, { x, y })}
                  onEditTable={(t) => setEditingTable(t)}
                  onDeleteTable={deleteTable}
                  onUnassignGuest={(id) => assignGuest(id, null)}
                  onAssignGuest={handleAssignGuest}
                />
                <GuestSidebar
                  guests={state.guests}
                  tables={state.tables}
                  selectedGuestId={selectedGuestId}
                  onSelectGuest={setSelectedGuestId}
                  onAddGuest={() => setAddGuestOpen(true)}
                  onEditGuest={(g) => setEditingGuest(g)}
                  onDeleteGuest={deleteGuest}
                  onUnassign={(id) => assignGuest(id, null)}
                />
              </>
            ) : (
              <PlannerListView
                tables={state.tables}
                guests={state.guests}
                onEditTable={(t) => setEditingTable(t)}
                onDeleteTable={deleteTable}
                onAssignGuest={(guestId, tableId) =>
                  assignGuest(guestId, tableId)
                }
                onEditGuest={(g) => setEditingGuest(g)}
                onDeleteGuest={deleteGuest}
              />
            )}
          </div>

          {/* Drag overlay — floats under the cursor while dragging */}
          <DragOverlay dropAnimation={null}>
            {activeDragGuest && (
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-xs font-medium shadow-xl",
                  "ring-2 ring-primary/30"
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
                    DIETARY_COLORS[activeDragGuest.dietary[0] ?? "empty"]
                  )}
                >
                  {activeDragGuest.name[0]?.toUpperCase()}
                </span>
                {activeDragGuest.name}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Add Table */}
      <AddTableDialog
        open={addTableOpen}
        onClose={() => setAddTableOpen(false)}
        onSave={addTable}
      />

      {/* Edit Table */}
      {editingTable && (
        <AddTableDialog
          open={!!editingTable}
          onClose={() => setEditingTable(null)}
          initial={editingTable}
          onSave={(updates) => {
            updateTable(editingTable.id, updates)
            setEditingTable(null)
          }}
        />
      )}

      {/* Add Guest */}
      <AddGuestDialog
        open={addGuestOpen}
        onClose={() => setAddGuestOpen(false)}
        onSave={addGuest}
      />

      {/* Edit Guest */}
      {editingGuest && (
        <AddGuestDialog
          open={!!editingGuest}
          onClose={() => setEditingGuest(null)}
          initial={editingGuest}
          onSave={(updates) => {
            updateGuest(editingGuest.id, updates)
            setEditingGuest(null)
          }}
        />
      )}

      {/* Rename wedding */}
      <Dialog
        open={renamingWedding}
        onOpenChange={(o) => !o && setRenamingWedding(false)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename wedding</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenamingWedding(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!renameValue.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
