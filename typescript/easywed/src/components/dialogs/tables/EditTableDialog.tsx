import { useMemo } from "react"
import { useShallow } from "zustand/react/shallow"
import { useTableForm } from "./useTableForm"
import { usePlannerStore } from "@/stores/planner.store"
import { useDialogStore } from "@/stores/dialog.store"

export const EditTableDialog = () => {
  const dialog = useDialogStore(
    useShallow((state) => ({
      opened: state.opened,
      meta: state.meta,
      close: state.close,
    }))
  )

  const planner = usePlannerStore(
    useShallow((state) => ({
      updateTable: state.updateTable,
      tables: state.tables,
      guests: state.guests,
      hall: state.hall,
    }))
  )

  const editedTable = useMemo(
    () =>
      planner.tables.find((table) => table.id === dialog.meta.tableId) ?? null,
    [dialog.meta.tableId, planner.tables]
  )

  const initialAssignedGuestIds = useMemo(
    () =>
      editedTable
        ? planner.guests
            .filter((guest) => guest.tableId === editedTable.id)
            .map((guest) => guest.id)
        : [],
    [editedTable, planner.guests]
  )

  return useTableForm({
    // for typecheck correctnes, lack of editedTable should never be possible
    // although I prefer to have conditional initialValues, rather than `planner.tables.find()!`
    ...(editedTable && {
      initialValues: {
        name: editedTable.name,
        shape: editedTable.shape,
        capacity: editedTable.capacity,
        width: editedTable.size.width,
        height:
          editedTable.shape === "round"
            ? editedTable.size.width
            : editedTable.size.height,
        assignedGuestIds: initialAssignedGuestIds,
      },
    }),
    hallDimensions: planner.hall.dimensions,
    opened: dialog.opened === "Table.Edit",
    mode: "edit",
    onClose: dialog.close,
    onSubmit: (tableDraft, assignedGuestIds) => {
      if (editedTable) {
        planner.updateTable(editedTable.id, tableDraft, assignedGuestIds)
      }
    },
  })
}
