import { AddGuestDialog } from "./guests"
import { WeddingCreateDialog, WeddingRenameDialog } from "./weddings"
import { useDialogStore } from "@/stores/dialog.store"

export const DialogManager = () => {
  const opened = useDialogStore((state) => state.opened)

  switch (opened) {
    case "Wedding.Create":
      return <WeddingCreateDialog />
    case "Wedding.Rename":
      return <WeddingRenameDialog />
    case "Guest.Add":
      return <AddGuestDialog />
    default:
      return <></>
  }
}
