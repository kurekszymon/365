import {
  AddGuestDialog,
  ExportGuestsCsvDialog,
  ExportGuestsPdfDialog,
} from "./guests"
import { ExportPlannerDxfDialog, ImportPlannerDxfDialog } from "./planner"
import { WeddingMembersDialog, WeddingRenameDialog } from "./weddings"
import { useDialogStore } from "@/stores/dialog.store"

export const DialogManager = () => {
  const opened = useDialogStore((state) => state.opened)

  switch (opened) {
    case "Wedding.Rename":
      return <WeddingRenameDialog />
    case "Wedding.Members":
      return <WeddingMembersDialog />
    case "Guest.Add":
      return <AddGuestDialog />
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
