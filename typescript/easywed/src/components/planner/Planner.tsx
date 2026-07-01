import { useShallow } from "zustand/react/shallow"
import { useTranslation } from "react-i18next"
import {
  LandmarkIcon,
  LayoutPanelLeftIcon,
  PlusIcon,
  SparklesIcon,
  UserPlusIcon,
  UsersIcon,
  UtensilsIcon,
} from "lucide-react"
import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { Canvas } from "./Canvas"
import { Header } from "./Header"
import { ExportHeader } from "./Header/Export.header"
import { GuestsSeated } from "./Header/GuestsSeated.header"
import { ImportHeader } from "./Header/Import.header"
import { PlannerPrintView } from "./PlannerPrintView"
import { usePrintShortcut } from "./usePrintShortcut"
import { PropertyPanel } from "./PropertyPanel"
import { ThemeSwitcher } from "./Header/ThemeSwitcher"
import { GuestModeBanner } from "./GuestModeBanner"
import type { DragEndEvent } from "@dnd-kit/core"
import { isLocalWedding } from "@/lib/localWedding"
import { ButtonGroup } from "@/components/ui/button-group"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { DialogManager } from "@/components/dialogs/DialogManager"
import { useDialogStore } from "@/stores/dialog.store"
import { useGlobalStore } from "@/stores/global.store"
import { usePlannerStore } from "@/stores/planner.store"
import { usePanelStore } from "@/stores/panel.store"
import { useOpenHall } from "@/hooks/useOpenHall"

export const Planner = () => {
  const { t } = useTranslation()

  usePrintShortcut()

  const openDialog = useDialogStore((state) => state.open)
  const role = useGlobalStore((state) => state.role)
  const assignGuestToTable = usePlannerStore(
    (state) => state.assignGuestToTable
  )

  // Distance-based activation (mouse + touch) so dragging starts the moment you
  // move — no hold delay. Touch hold-without-moving is reserved for the canvas
  // long-press (select → edit) and the guest list uses a drag handle so the
  // bottom sheet still scrolls.
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
  const weddingId = useGlobalStore((state) => state.weddingId)

  const openHall = useOpenHall()

  const panel = usePanelStore(
    useShallow((state) => ({
      openTableAdd: state.openTableAdd,
      openTablesBatchAdd: state.openTablesBatchAdd,
      openTableEdit: state.openTableEdit,
      openTablesPlaceholder: state.openTablesPlaceholder,
      openFixtureAdd: state.openFixtureAdd,
      openGuests: state.openGuests,
      openAiChat: state.openAiChat,
    }))
  )

  return (
    <>
      <DialogManager />
      <PlannerPrintView />

      <div className="flex h-screen w-screen flex-col print:hidden">
        <GuestModeBanner />
        <Header>
          <Header.Title weddingId={weddingId}>
            <Header.WeddingName />
            <Header.Nav>
              <GuestsSeated />
              {/* <RemindersPreview /> */}
            </Header.Nav>
          </Header.Title>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <PlusIcon />
                  <span className="hidden md:inline">
                    {t("planner.actions")}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-auto min-w-52">
                <DropdownMenuItem onClick={openHall}>
                  <LandmarkIcon />
                  {t("hall.configure_short")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={!preset}
                  onClick={() => {
                    if (!preset) return
                    panel.openTablesPlaceholder()
                  }}
                >
                  <UtensilsIcon />
                  {t("tables")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  inset
                  disabled={!preset}
                  onClick={() => {
                    if (!preset) return
                    panel.openTableAdd()
                  }}
                >
                  {t("tables.add")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  inset
                  disabled={!preset}
                  onClick={() => {
                    if (!preset) return
                    panel.openTablesBatchAdd()
                  }}
                >
                  {t("tables.add_batch")}
                </DropdownMenuItem>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuItem
                      disabled={!preset}
                      onClick={() => {
                        if (!preset) return
                        panel.openFixtureAdd()
                      }}
                    >
                      <LayoutPanelLeftIcon />
                      {t("fixtures.add")}
                    </DropdownMenuItem>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {t("fixtures.add_tooltip")}
                  </TooltipContent>
                </Tooltip>
              </DropdownMenuContent>
            </DropdownMenu>
            <ButtonGroup>
              <Button variant="outline" onClick={() => panel.openGuests()}>
                <UsersIcon />
                <span className="hidden md:inline">{t("guests")}</span>
              </Button>
              <Button variant="outline" onClick={() => openDialog("Guest.Add")}>
                <PlusIcon />
              </Button>
            </ButtonGroup>
            <Button
              variant="outline"
              onClick={() => panel.openAiChat()}
              aria-label={t("assistant.title")}
            >
              <SparklesIcon />
              <span className="hidden md:inline">{t("assistant.title")}</span>
            </Button>
            <ButtonGroup>
              {role === "owner" && !isLocalWedding(weddingId) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => openDialog("Wedding.Members")}
                    >
                      <UserPlusIcon />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("members.title")}</TooltipContent>
                </Tooltip>
              )}
              <ImportHeader />
              <ExportHeader />
            </ButtonGroup>
            <ThemeSwitcher />
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
