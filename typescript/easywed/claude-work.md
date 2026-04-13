---

What changed:

New files:

- src/stores/panel.store.ts — panel selection state (view, selectedTableId)
- src/components/planner/PropertyPanel/index.tsx — slide-in shell that routes to sub-content
- src/components/planner/PropertyPanel/HallPanelContent.tsx — hall properties with immediate apply
- src/components/planner/PropertyPanel/TablePanelContent.tsx — table form in add/edit modes
- src/components/planner/PropertyPanel/GuestsPanelContent.tsx — guests grouped by table with dnd-kit drag-and-drop

Modified:

- planner.store.ts — added updateHallProperties (no zoom/pan reset) and assignGuestToTable
- Canvas.tsx — replaced dialog store with panel store; added click handler with pan guard
- HallSurface.tsx — added data-canvas-element-kind="hall", passes onTableClick/selectedTableId to tables
- DraggableTable.tsx — added onSelect click handler and isSelected ring highlight
- Planner.tsx — rewired header buttons to panel, added <PropertyPanel /> in flex row with canvas
- dialog.store.ts + DialogManager.tsx — removed Hall/Table dialogs, kept Wedding + Guest

Deleted dead code: ConfigureHallDialog, AddTableDialog, EditTableDialog, useTableForm, TableDialog

⏺ Clean. Summary of the three changes:

- Hall + — calls updateHall("rectangle", { width: 20, height: 12 }, 1) then opens the hall panel so you can see and adjust what was just created
- Tables placeholder — now has an "Add Table" button that transitions directly to table.add view
- Guests panel — "Add Guest" button appears both in the empty state and at the top of the populated list, opening the existing Guest.Add dialog

⏺ Clean. Here's what changed and why:

Planner.tsx — owns the shared DndContext above both canvas and panel so both sides participate in the same interaction flow. onDragEnd handles only guest drops: assigns or unassigns based on the drop target type.

HallSurface — removed its own DndContext. Uses useDndMonitor to handle table-drag position updates (keeping ppm/snapStep local) and to track isDraggingGuest for table hover feedback. Hall droppable tagged
{ type: "hall" } so guest drops on the background are no-ops.

DraggableTable — tagged as { type: "table-drag" } for dragging. Also a droppable ({ type: "table", tableId }) for guest drops. isDraggingGuest is passed down from HallSurface so the blue ring only appears
during guest drags, not table moves.

GuestsPanelContent — removed its own DndContext. Uses useDndMonitor (gated to type === "guest") to track activeGuestId/overId for panel-side visuals. DragOverlay portals to document.body regardless.
