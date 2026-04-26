import {
  AddGuestDialog,
  ExportGuestsCsvDialog,
  ExportGuestsPdfDialog,
} from "./guests"
import {
  WeddingCreateDialog,
  WeddingMembersDialog,
  WeddingRenameDialog,
} from "./weddings"
import { OrderInvitationDialog } from "./invitations/OrderInvitationDialog"
import { useDialogStore } from "@/stores/dialog.store"

export const DialogManager = () => {
  const opened = useDialogStore((state) => state.opened)

  switch (opened) {
    case "Wedding.Create":
      return <WeddingCreateDialog />
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
    case "Invitation.Order":
      return <OrderInvitationDialog />
    default:
      return <></>
  }
}
