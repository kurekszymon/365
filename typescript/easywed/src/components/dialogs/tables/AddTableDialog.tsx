import { useShallow } from "zustand/react/shallow"
import { useTableForm } from "./useTableForm"
import { usePlannerStore } from "@/stores/planner.store"
import { useDialogStore } from "@/stores/dialog.store"

export const AddTableDialog = () => {
  const dialog = useDialogStore(
    useShallow((state) => ({
      opened: state.opened,
      meta: state.meta,
      close: state.close,
    }))
  )

  const planner = usePlannerStore(
    useShallow((state) => ({
      addTable: state.addTable,
      hall: state.hall,
    }))
  )

  return useTableForm({
    hallDimensions: planner.hall.dimensions,
    opened: dialog.opened === "Table.Add",
    mode: "add",
    onClose: dialog.close,
    onSubmit: (tableDraft, assignedGuestIds) => {
      planner.addTable(tableDraft, assignedGuestIds, dialog.meta.spawnPosition)
    },
  })
}
