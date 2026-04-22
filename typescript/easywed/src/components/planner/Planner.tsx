import { useShallow } from "zustand/react/shallow"
import { useTranslation } from "react-i18next"
import {
  LandmarkIcon,
  PlusIcon,
  SquarePlusIcon,
  UsersIcon,
  UtensilsIcon,
} from "lucide-react"
import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { Canvas } from "./Canvas"
import { Header } from "./Header"
import { ExportHeader } from "./Header/Export.header"
import { GuestsSeated } from "./Header/GuestsSeated.header"
import { PlannerPrintView } from "./PlannerPrintView"
import { PropertyPanel } from "./PropertyPanel"
import type { DragEndEvent } from "@dnd-kit/core"
import { ButtonGroup } from "@/components/ui/button-group"
import { Button } from "@/components/ui/button"
import { RemindersPreview } from "@/components/reminders/preview/RemindersPreview"
import { DialogManager } from "@/components/dialogs/DialogManager"
import { useDialogStore } from "@/stores/dialog.store"
import { usePlannerStore } from "@/stores/planner.store"
import { selectSelectedTableId, usePanelStore } from "@/stores/panel.store"
import { useOpenHall } from "@/hooks/useOpenHall"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export const Planner = () => {
  const { t } = useTranslation()

  const openDialog = useDialogStore((state) => state.open)
  const assignGuestToTable = usePlannerStore(
    (state) => state.assignGuestToTable
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const handleDragEnd = (e: DragEndEvent) => {
    if (e.active.data.current?.type !== "guest") return
    const overData = e.over?.data.current

    if (overData?.type === "table") {
      const { tableId } = overData
      if (typeof tableId !== "string") return

      assignGuestToTable(String(e.active.id), tableId)
    } else if (overData?.type === "unassigned") {
      assignGuestToTable(String(e.active.id), null)
    }
  }

  const preset = usePlannerStore((state) => state.hall.preset)

  const openHall = useOpenHall()

  const selectedTableId = usePanelStore(selectSelectedTableId)
  const panel = usePanelStore(
    useShallow((state) => ({
      openTableAdd: state.openTableAdd,
      openTablesBatchAdd: state.openTablesBatchAdd,
      openTableEdit: state.openTableEdit,
      openTablesPlaceholder: state.openTablesPlaceholder,
      openGuests: state.openGuests,
    }))
  )

  return (
    <>
      <DialogManager />
      <PlannerPrintView />

      <div className="flex h-screen w-screen flex-col print:hidden">
        <Header>
          <Header.Title>
            <Header.Nav>
              <GuestsSeated />
              <RemindersPreview />
            </Header.Nav>
          </Header.Title>
          <div className="flex items-center gap-2">
            <ButtonGroup>
              <Button variant="outline" onClick={openHall}>
                <LandmarkIcon />

                <span className="hidden md:inline">{t("hall")}</span>
              </Button>
              <Button variant="outline" onClick={openHall}>
                <PlusIcon />
              </Button>
            </ButtonGroup>
            <ButtonGroup>
              <Button variant="outline" onClick={() => panel.openGuests()}>
                <UsersIcon />
                <span className="hidden md:inline">{t("guests")}</span>
              </Button>
              <Button variant="outline" onClick={() => openDialog("Guest.Add")}>
                <PlusIcon />
              </Button>
            </ButtonGroup>
            <ButtonGroup>
              <Button
                variant="outline"
                disabled={!preset}
                onClick={() => {
                  if (!preset) return
                  if (selectedTableId) {
                    panel.openTableEdit(selectedTableId)
                  } else {
                    panel.openTablesPlaceholder()
                  }
                }}
                title={preset ? t("tables") : t("tables.configure_hall_first")}
              >
                <UtensilsIcon />
                <span className="hidden md:inline">{t("tables")}</span>
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
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
                </TooltipTrigger>
                <TooltipContent>
                  {preset ? t("tables.add") : t("tables.configure_hall_first")}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={!preset}
                    onClick={() => {
                      if (!preset) return
                      panel.openTablesBatchAdd()
                    }}
                  >
                    <SquarePlusIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {preset
                    ? t("tables.add_batch")
                    : t("tables.configure_hall_first")}
                </TooltipContent>
              </Tooltip>
            </ButtonGroup>
            <ExportHeader />
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
