import { useTranslation } from "react-i18next"
import { LandmarkIcon, SparklesIcon, UserPlusIcon } from "lucide-react"
import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { Canvas } from "./Canvas"
import { MobileTabBar } from "./Sidebar/MobileTabBar"
import { SidebarRail } from "./Sidebar/SidebarRail"
import { EntityEditDialog } from "./Sidebar/EntityEditDialog"
import { Header } from "./Header"
import { ExportHeader } from "./Header/Export.header"
import { GuestsSeated } from "./Header/GuestsSeated.header"
import { ImportHeader } from "./Header/Import.header"
import { PlannerPrintView } from "./PlannerPrintView"
import { usePrintShortcut } from "./usePrintShortcut"
import { MobilePanelDrawer } from "./EntityForms/MobilePanelDrawer"
import { ThemeSwitcher } from "./Header/ThemeSwitcher"
import { GuestModeBanner } from "./GuestModeBanner"
import { isLocalWedding } from "@/lib/localWedding"
import { ButtonGroup } from "@/components/ui/button-group"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { DialogManager } from "@/components/dialogs/DialogManager"
import { useDialogStore } from "@/stores/dialog.store"
import { useGlobalStore } from "@/stores/global.store"
import { usePanelStore } from "@/stores/panel.store"
import { useOpenHall } from "@/hooks/useOpenHall"
import { useIsMobile } from "@/hooks/useMediaQuery"

export const Planner = () => {
  const { t } = useTranslation()

  usePrintShortcut()

  const openDialog = useDialogStore((state) => state.open)
  const role = useGlobalStore((state) => state.role)

  // Distance-based activation (mouse + touch) so dragging starts the moment you
  // move — no hold delay. Touch hold-without-moving is reserved for the canvas
  // long-press (select → edit).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const weddingId = useGlobalStore((state) => state.weddingId)

  const openHall = useOpenHall()
  const isMobile = useIsMobile()

  const openAiChat = usePanelStore((state) => state.openAiChat)

  return (
    <>
      <DialogManager />
      <PlannerPrintView />

      <div className="flex h-[100dvh] w-screen flex-col print:hidden">
        <GuestModeBanner />
        <Header>
          <Header.Title weddingId={weddingId}>
            <Header.WeddingName />
            <Header.Nav>
              <GuestsSeated />
              {/* <RemindersPreview /> */}
            </Header.Nav>
          </Header.Title>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              onClick={openHall}
              aria-label={t("hall.configure_short")}
            >
              <LandmarkIcon />
              <span className="hidden md:inline">
                {t("hall.configure_short")}
              </span>
            </Button>
            {/* Mobile only: on desktop the assistant lives in the sidebar
                rail's "Asystent AI" tab, so the header shortcut is redundant. */}
            {isMobile && (
              <Button
                variant="outline"
                onClick={() => openAiChat()}
                aria-label={t("assistant.title")}
              >
                <SparklesIcon />
              </Button>
            )}
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
        <DndContext sensors={sensors}>
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {!isMobile && <SidebarRail />}
            <Canvas />
            {isMobile && <MobilePanelDrawer />}
          </div>
          {!isMobile && <EntityEditDialog />}
          {isMobile && <MobileTabBar />}
        </DndContext>
      </div>
    </>
  )
}
