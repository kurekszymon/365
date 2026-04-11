import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { LandmarkIcon, PlusIcon, UsersIcon, UtensilsIcon } from "lucide-react"
import { Canvas } from "./Canvas"
import { Header } from "./Header"
import { GuestsSeated } from "./Header/GuestsSeated.header"
import { ButtonGroup } from "@/components/ui/button-group"
import { Button } from "@/components/ui/button"
import { RemindersPreview } from "@/components/reminders/preview/RemindersPreview"
import { DialogManager } from "@/components/dialogs/DialogManager"
import { useDialogStore } from "@/stores/dialog.store"
import { useGlobalStore } from "@/stores/global.store"
import { usePlannerStore } from "@/stores/planner.store"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export const Planner = () => {
  const { t } = useTranslation()

  const name = useGlobalStore((state) => state.name)
  const openDialog = useDialogStore((state) => state.open)

  const preset = usePlannerStore((state) => state.hall.preset)

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
            <ButtonGroup>
              <Button
                variant="outline"
                onClick={() => openDialog("Hall.Configure")}
              >
                <LandmarkIcon />

                <span className="hidden md:inline">{t("hall")}</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => openDialog("Hall.Configure")}
              >
                <PlusIcon />
              </Button>
            </ButtonGroup>
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
            <ButtonGroup>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!preset) {
                        return
                      }
                      openDialog("Table.Add")
                    }}
                    title={
                      preset ? t("tables") : t("tables.configure_hall_first")
                    }
                  >
                    <UtensilsIcon />
                    <span className="hidden md:inline">{t("tables")}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {preset ? t("tables.add") : t("tables.configure_hall_first")}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!preset) {
                        return
                      }
                      openDialog("Table.Add")
                    }}
                  >
                    <PlusIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {preset ? t("tables.add") : t("tables.configure_hall_first")}
                </TooltipContent>
              </Tooltip>
            </ButtonGroup>
          </div>
        </Header>
        <Canvas />
      </div>
    </>
  )
}
