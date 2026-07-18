import {
  AddGuestDialog,
  EditGuestDialog,
  ExportGuestsCsvDialog,
  ExportGuestsPdfDialog,
  ImportGuestsDialog,
} from "./guests"
import { DeleteHallDialog } from "./planner"
import { WeddingMembersDialog } from "./weddings"
import { useDialogStore } from "@/stores/dialog.store"

export const DialogManager = () => {
  const opened = useDialogStore((state) => state.opened)

  switch (opened) {
    case "Wedding.Members":
      return <WeddingMembersDialog />
    case "Guest.Add":
      return <AddGuestDialog />
    case "Guest.Edit":
      return <EditGuestDialog />
    case "Guest.Import":
      return <ImportGuestsDialog />
    case "Guests.Export.Csv":
      return <ExportGuestsCsvDialog />
    case "Guests.Export.Pdf":
      return <ExportGuestsPdfDialog />
    case "Planner.Hall.Delete":
      return <DeleteHallDialog />
    default:
      return <></>
  }
}
