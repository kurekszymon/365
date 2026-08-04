import { useEffect } from "react"
import {
  AddGuestDialog,
  EditGuestDialog,
  ExportGuestsCsvDialog,
  ExportGuestsPdfDialog,
  ImportGuestsDialog,
} from "./guests"
import { DeleteHallDialog } from "./planner"
import { WeddingMembersDialog } from "./weddings"
import type { Dialog } from "@/stores/dialog.store"
import { useDialogStore } from "@/stores/dialog.store"
import { selectCanEdit, useGlobalStore } from "@/stores/global.store"

// Dialogs that write. Every entry point to these is already hidden from a
// viewer, so this is the backstop for a route in that never got gated - and,
// unlike the mutation guard in mutations/shared.ts, it stops the dialog before
// any optimistic store update happens. The read-only dialogs (members, the two
// exports) are deliberately absent: a viewer is entitled to all three.
const WRITE_DIALOGS: ReadonlySet<Dialog> = new Set([
  "Guest.Add",
  "Guest.Edit",
  "Guest.Import",
  "Planner.Hall.Delete",
])

export const DialogManager = () => {
  const opened = useDialogStore((state) => state.opened)
  const close = useDialogStore((state) => state.close)
  const canEdit = useGlobalStore(selectCanEdit)

  const blocked = opened !== null && !canEdit && WRITE_DIALOGS.has(opened)

  // Clear the request, don't just decline to render it. `opened` would
  // otherwise stay set in the store with nothing on screen, and the next time
  // canEdit flips true - a role that finished loading, or an access change
  // picked up by a reload - this would mount the dialog with no user action
  // behind it. close() drops `payload` too, so no stale guestId/hallId rides
  // along either. (A store action in an effect, same shape as MobileTabBar's
  // panel-view sync - not a React setState, so set-state-in-effect is happy.)
  useEffect(() => {
    if (blocked) close()
  }, [blocked, close])

  if (blocked) return <></>

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
