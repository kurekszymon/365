import { useEffect } from "react"
import { useShallow } from "zustand/react/shallow"
import { useTranslation } from "react-i18next"
import { LandmarkIcon, PlusIcon, UsersIcon, UtensilsIcon } from "lucide-react"
import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import type { DragEndEvent } from "@dnd-kit/core"
import { Canvas } from "./Canvas"
import { Header } from "./Header"
import { GuestsSeated } from "./Header/GuestsSeated.header"
import { PropertyPanel } from "./PropertyPanel"
import { ButtonGroup } from "@/components/ui/button-group"
import { Button } from "@/components/ui/button"
import { RemindersPreview } from "@/components/reminders/preview/RemindersPreview"
import { DialogManager } from "@/components/dialogs/DialogManager"
import { useDialogStore } from "@/stores/dialog.store"
import { useGlobalStore } from "@/stores/global.store"
import { usePlannerStore } from "@/stores/planner.store"
import { usePanelStore } from "@/stores/panel.store"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export const Planner = () => {
  const { t } = useTranslation()

  const name = useGlobalStore((state) => state.name)
  const openDialog = useDialogStore((state) => state.open)
  const assignGuestToTable = usePlannerStore(
    (state) => state.assignGuestToTable
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const handleDragEnd = (e: DragEndEvent) => {
    if (e.active.data.current?.type !== "guest") return
    const overType = e.over?.data.current?.type
    if (overType === "table") {
      assignGuestToTable(
        String(e.active.id),
        e.over!.data.current!.tableId as string
      )
    } else if (overType === "unassigned") {
      assignGuestToTable(String(e.active.id), null)
    }
  }

  const { preset, updateHall } = usePlannerStore(
    useShallow((state) => ({
      preset: state.hall.preset,
      updateHall: state.updateHall,
    }))
  )

  const panel = usePanelStore(
    useShallow((state) => ({
      selectedTableId: state.selectedTableId,
      openHall: state.openHall,
      openTableAdd: state.openTableAdd,
      openTableEdit: state.openTableEdit,
      openTablesPlaceholder: state.openTablesPlaceholder,
      openGuests: state.openGuests,
    }))
  )

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
                onClick={() => {
                  if (!preset) {
                    updateHall("rectangle", { width: 20, height: 12 }, 1)
                  }
                  panel.openHall()
                }}
              >
                <LandmarkIcon />

                <span className="hidden md:inline">{t("hall")}</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  updateHall("rectangle", { width: 20, height: 12 }, 1)
                  panel.openHall()
                }}
              >
                <PlusIcon />
              </Button>
            </ButtonGroup>
            <Tooltip>
              <TooltipTrigger asChild>
                <ButtonGroup>
                  <Button
                    variant="outline"
                    disabled={!preset}
                    onClick={() => {
                      if (!preset) return
                      if (panel.selectedTableId) {
                        panel.openTableEdit(panel.selectedTableId)
                      } else {
                        panel.openTablesPlaceholder()
                      }
                    }}
                    title={
                      preset ? t("tables") : t("tables.configure_hall_first")
                    }
                  >
                    <UtensilsIcon />
                    <span className="hidden md:inline">{t("tables")}</span>
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!preset}
                    onClick={() => {
                      if (!preset) return
                      panel.openTableAdd()
                    }}
                  >
                    <PlusIcon />
                  </Button>
                </ButtonGroup>
              </TooltipTrigger>
              <TooltipContent>
                {preset ? t("tables.add") : t("tables.configure_hall_first")}
              </TooltipContent>
            </Tooltip>
            <ButtonGroup>
              <Button variant="outline" onClick={() => panel.openGuests()}>
                <UsersIcon />
                <span className="hidden md:inline">{t("guests")}</span>
              </Button>
              <Button variant="outline" onClick={() => openDialog("Guest.Add")}>
                <PlusIcon />
              </Button>
            </ButtonGroup>
          </div>
        </Header>
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <Canvas />
            <PropertyPanel />
          </div>
        </DndContext>
      </div>
    </>
  )
}
