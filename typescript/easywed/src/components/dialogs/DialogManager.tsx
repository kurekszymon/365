import { AddGuestDialog } from "./guests"
import { HallConfigureDialog } from "./planner"
import { AddTableDialog, EditTableDialog } from "./tables"
import { WeddingCreateDialog, WeddingRenameDialog } from "./weddings"
import { useDialogStore } from "@/stores/dialog.store"

export const DialogManager = () => {
  const opened = useDialogStore((state) => state.opened)

  switch (opened) {
    case "Wedding.Create":
      return <WeddingCreateDialog />
    case "Wedding.Rename":
      return <WeddingRenameDialog />
    case "Hall.Configure":
      return <HallConfigureDialog />
    case "Guest.Add":
      return <AddGuestDialog />
    case "Table.Add":
      return <AddTableDialog />
    case "Table.Edit":
      return <EditTableDialog />
    default:
      return <></>
  }
}
