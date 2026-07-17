import {
  AddGuestDialog,
  EditGuestDialog,
  ExportGuestsCsvDialog,
  ExportGuestsPdfDialog,
  ImportGuestsDialog,
} from "./guests"
import {
  DeleteHallDialog,
  ExportPlannerDxfDialog,
  ImportPlannerDxfDialog,
} from "./planner"
import { CreateWeddingFromDxfDialog, WeddingMembersDialog } from "./weddings"
import { useDialogStore } from "@/stores/dialog.store"

export const DialogManager = () => {
  const opened = useDialogStore((state) => state.opened)

  switch (opened) {
    case "Wedding.Members":
      return <WeddingMembersDialog />
    case "Wedding.Import.Dxf":
      return <CreateWeddingFromDxfDialog />
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
    case "Planner.Export.Dxf":
      return <ExportPlannerDxfDialog />
    case "Planner.Import.Dxf":
      return <ImportPlannerDxfDialog />
    case "Planner.Hall.Delete":
      return <DeleteHallDialog />
    default:
      return <></>
  }
}
