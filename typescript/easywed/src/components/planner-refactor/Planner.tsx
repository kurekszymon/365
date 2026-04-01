import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Canvas } from "./Canvas"
import { Header } from "./Header"
import { GuestsSeated } from "./Header/GuestsSeated.header"
import { Button } from "@/components/ui/button"
import { RemindersPreview } from "@/components/reminders/preview/RemindersPreview"
import { DialogManager } from "@/components/dialogs/DialogManager"
import { useDialogStore } from "@/stores/dialog.store"
import { useGlobalStore } from "@/stores/global.store"

export const Planner = () => {
  const name = useGlobalStore((state) => state.name)
  const openDialog = useDialogStore((state) => state.open)
  const { t } = useTranslation()

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
          <Button
            variant="outline"
            onClick={() => {
              openDialog("Hall.Configure")
            }}
          >
            {t("hall.configure_short")}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              openDialog("Guest.Add")
            }}
          >
            {t("guests.add")}
          </Button>
        </Header>
        <Canvas />
      </div>
    </>
  )
}
