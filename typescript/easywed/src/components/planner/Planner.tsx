import { useShallow } from "zustand/react/shallow"
import { useTranslation } from "react-i18next"
import {
  LandmarkIcon,
  MailIcon,
  PlusIcon,
  UserPlusIcon,
  UsersIcon,
  UtensilsIcon,
} from "lucide-react"
import { format } from "date-fns"
import { pl } from "date-fns/locale"
import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { Canvas } from "./Canvas"
import { Header } from "./Header"
import { ExportHeader } from "./Header/Export.header"
import { GuestsSeated } from "./Header/GuestsSeated.header"
import { PlannerPrintView } from "./PlannerPrintView"
import { PropertyPanel } from "./PropertyPanel"
import type { DragEndEvent } from "@dnd-kit/core"
import type { InvitationDesign } from "@/stores/invitation.store"
import { ButtonGroup } from "@/components/ui/button-group"
import { Button } from "@/components/ui/button"
import { RemindersPreview } from "@/components/reminders/preview/RemindersPreview"
import { DialogManager } from "@/components/dialogs/DialogManager"
import { useDialogStore } from "@/stores/dialog.store"
import { useGlobalStore } from "@/stores/global.store"
import { usePlannerStore } from "@/stores/planner.store"
import { selectSelectedTableId, usePanelStore } from "@/stores/panel.store"
import { useOpenHall } from "@/hooks/useOpenHall"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { encodeDesign } from "@/lib/invitation/hash"

export const Planner = () => {
  const { t } = useTranslation()

  const openDialog = useDialogStore((state) => state.open)
  const role = useGlobalStore((state) => state.role)
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
  const guestCount = usePlannerStore((state) => state.guests.length)
  const weddingName = useGlobalStore((state) => state.name)
  const weddingDate = useGlobalStore((state) => state.date)

  const openHall = useOpenHall()

  const handleOpenInvitations = () => {
    const initial: InvitationDesign = {
      template: "classic",
      colorScheme: "cream-gold",
      fontId: "playfair",
      texts: {
        headline: "Zapraszamy na ślub",
        coupleNames: weddingName ?? "",
        date: weddingDate
          ? format(weddingDate, "d MMMM yyyy", { locale: pl })
          : "",
        time: "",
        venue: "",
        venueAddress: "",
        rsvpEmail: "",
        rsvpDeadline: "",
        guestSalutation: "Drogi/a",
        footer: "",
      },
      quantity: Math.ceil(guestCount * 1.12) || 50,
    }
    window.open(`/invitations#${encodeDesign(initial)}`, "_blank")
  }

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
            </ButtonGroup>
            {role === "owner" && (
              <Button
                variant="outline"
                onClick={() => openDialog("Wedding.Members")}
              >
                <UserPlusIcon />
                <span className="hidden md:inline">{t("members.title")}</span>
              </Button>
            )}
            <Button variant="outline" onClick={handleOpenInvitations}>
              <MailIcon />
              <span className="hidden md:inline">{t("invitations")}</span>
            </Button>
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
