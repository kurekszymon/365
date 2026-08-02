import { useTranslation } from "react-i18next"
import { LandmarkIcon, SparklesIcon } from "lucide-react"
import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { Canvas } from "./Canvas"
import { MobileTabBar } from "./Sidebar/MobileTabBar"
import { SidebarRail } from "./Sidebar/SidebarRail"
import { EntityEditDialog } from "./Sidebar/EntityEditDialog"
import { Header } from "./Header"
import { MemberAvatars } from "./Header/MemberAvatars"
import { ExportHeader } from "./Header/Export.header"
import { ImportHeader } from "./Header/Import.header"
import { PlannerPrintView } from "./PlannerPrintView"
import { usePrintShortcut } from "./usePrintShortcut"
import { MobilePanelDrawer } from "./EntityForms/MobilePanelDrawer"
import { ThemeSwitcher } from "./Header/ThemeSwitcher"
import { AccountMenu } from "./Header/AccountMenu"
import { GuestModeBanner } from "./GuestModeBanner"
import { ButtonGroup } from "@/components/ui/button-group"
import { Button } from "@/components/ui/button"
import { DialogManager } from "@/components/dialogs/DialogManager"
import { useGlobalStore } from "@/stores/global.store"
import { usePanelStore } from "@/stores/panel.store"
import { useOpenHalls } from "@/hooks/useOpenHalls"
import { useIsMobile } from "@/hooks/useMediaQuery"

export const Planner = () => {
  const { t } = useTranslation()

  usePrintShortcut()

  // Distance-based activation (mouse + touch) so dragging starts the moment you
  // move - no hold delay. Touch hold-without-moving is reserved for the canvas
  // long-press (select → edit).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const weddingId = useGlobalStore((state) => state.weddingId)

  const openHalls = useOpenHalls()
  const isMobile = useIsMobile()

  const openAiChat = usePanelStore((state) => state.openAiChat)

  return (
    <>
      <DialogManager />
      <PlannerPrintView />

      <div className="flex h-[100dvh] w-screen flex-col print:hidden">
        <GuestModeBanner />
        <Header>
          <Header.Brand />
          <Header.Title weddingId={weddingId}>
            <Header.WeddingName />
          </Header.Title>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              onClick={openHalls}
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
            {/* Replaces the old owner-only invite button: the avatar stack
                opens the same dialog, but shows every role who else is in
                here. In guest mode the member list is empty, so it collapses
                to the owner's invite chip alone - which still opens the
                dialog and its upgrade notice, as before. */}
            <MemberAvatars />
            <ButtonGroup>
              <ImportHeader />
              <ExportHeader />
            </ButtonGroup>
            <ThemeSwitcher />
            <AccountMenu />
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
