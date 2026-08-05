import { useTranslation } from "react-i18next"
import { LandmarkIcon } from "lucide-react"
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
import { AccountMenu } from "./Header/AccountMenu"
import { GuestModeBanner } from "./GuestModeBanner"
import { ButtonGroup } from "@/components/ui/button-group"
import { Button } from "@/components/ui/button"
import { DialogManager } from "@/components/dialogs/DialogManager"
import { selectCanEdit, useGlobalStore } from "@/stores/global.store"
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
  // No sensors, no drags. Every dnd-kit draggable in the planner - tables,
  // fixtures, hall chips, guest-to-seat - is a write, so withholding the
  // sensors disables the lot at the context instead of threading `disabled`
  // through each useDraggable. Canvas pan/zoom is @use-gesture, not dnd-kit,
  // so a viewer can still move around the plan freely.
  const noSensors = useSensors()

  const weddingId = useGlobalStore((state) => state.weddingId)
  const canEdit = useGlobalStore(selectCanEdit)

  const openHalls = useOpenHalls()
  const isMobile = useIsMobile()

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
            {/* Replaces the old owner-only invite button: the avatar stack
                opens the same dialog, but shows every role who else is in
                here. In guest mode the member list is empty, so it collapses
                to the owner's invite chip alone - which still opens the
                dialog and its upgrade notice, as before.

                It leads the row so the avatars - the one item that isn't an
                icon button - sit apart from the run of buttons that follows,
                instead of splitting it in two. */}
            <MemberAvatars />
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
            {/* Export and print stay: a viewer can already read every guest on
                screen, so withholding the CSV would be theatre - and a
                venue-side viewer is often exactly who needs the catering list.
                Import is a bulk write, and RLS refuses it, so offering it would
                only waste the user's column-mapping work on a failed insert. */}
            <ButtonGroup>
              {canEdit && <ImportHeader />}
              <ExportHeader />
            </ButtonGroup>
            <AccountMenu />
          </div>
        </Header>
        <DndContext sensors={canEdit ? sensors : noSensors}>
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
