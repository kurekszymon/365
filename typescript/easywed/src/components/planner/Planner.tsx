import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { LandmarkIcon, PlusIcon, UsersIcon } from "lucide-react"
import { Canvas } from "./Canvas"
import { Header } from "./Header"
import { GuestsSeated } from "./Header/GuestsSeated.header"
import { ButtonGroup } from "@/components/ui/button-group"
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

      <div className="flex h-screen w-screen flex-col">
        <Header>
          <Header.Title>
            <Header.Nav>
              <GuestsSeated />
              <RemindersPreview />
            </Header.Nav>
          </Header.Title>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                openDialog("Hall.Configure")
              }}
            >
              <LandmarkIcon />
              <span className="hidden md:inline">
                {t("hall.configure_short")}
              </span>
            </Button>
            <ButtonGroup>
              <Button
                variant="outline"
                onClick={() => {
                  openDialog("Guest.Add")
                }}
              >
                <UsersIcon />
                <span className="hidden md:inline">{t("guests")}</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  openDialog("Guest.Add")
                }}
              >
                <PlusIcon />
              </Button>
            </ButtonGroup>
          </div>
        </Header>
        <Canvas />
      </div>
    </>
  )
}
