import {
  AddGuestDialog,
  ExportGuestsCsvDialog,
  ExportGuestsPdfDialog,
  ImportGuestsDialog,
} from "./guests"
import { ExportPlannerDxfDialog, ImportPlannerDxfDialog } from "./planner"
import {
  CreateWeddingFromDxfDialog,
  WeddingMembersDialog,
  WeddingRenameDialog,
} from "./weddings"
import { useDialogStore } from "@/stores/dialog.store"

export const DialogManager = () => {
  const opened = useDialogStore((state) => state.opened)

  switch (opened) {
    case "Wedding.Rename":
      return <WeddingRenameDialog />
    case "Wedding.Members":
      return <WeddingMembersDialog />
    case "Wedding.Import.Dxf":
      return <CreateWeddingFromDxfDialog />
    case "Guest.Add":
      return <AddGuestDialog />
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
    default:
      return <></>
  }
}
