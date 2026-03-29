import { useEffect } from "react"
import { DialogManager } from "../dialogs/DialogManager"
import { RemindersPreview } from "../reminders/RemindersPreview"
import { Canvas } from "./Canvas"
import { Header } from "./Header"
import { GuestsSeated } from "./Header/GuestsSeated.header"
import { useDialogStore } from "@/stores/dialog.store"
import { useGlobalStore } from "@/stores/global.store"

export const Planner = () => {
  const name = useGlobalStore((state) => state.name)
  const openDialog = useDialogStore((state) => state.open)

  useEffect(() => {
    if (!name) {
      openDialog("Wedding.Create")
    }
  }, [openDialog, name])

  return (
    <>
      <DialogManager />

      <div className="h-screen w-screen">
        <Header>
          <Header.Title>
            <Header.Nav>
              <GuestsSeated />
              <RemindersPreview />
            </Header.Nav>
          </Header.Title>
        </Header>
        <Canvas />
      </div>
    </>
  )
}
