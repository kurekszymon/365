import { useTranslation } from "react-i18next"
import { ChevronDownIcon, ChevronUpIcon, UsersIcon } from "lucide-react"
import { GuestListContent } from "./GuestListContent"
import { usePlannerStore } from "@/stores/planner.store"
import { useGuestPanelStore } from "@/stores/guestPanel.store"
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer"

const PEEK_SNAP_POINT = "116px"

/**
 * Mobile counterpart of the desktop `GuestRail`: a persistent, non-modal
 * bottom sheet with two detents (a compact summary peek, and the full guest
 * list). A separate `Drawer` instance from `PropertyPanel`'s mobile drawer,
 * which keeps handling table/fixture/hall/AI edit sheets independently — the
 * two stack visually.
 */
export const GuestPeekBar = () => {
  const { t } = useTranslation()
  const expanded = useGuestPanelStore((state) => state.expanded)
  const setExpanded = useGuestPanelStore((state) => state.setExpanded)
  const guests = usePlannerStore((state) => state.guests)
  const seatedCount = guests.filter((g) => g.tableId).length
  const unseatedCount = guests.length - seatedCount

  return (
    <Drawer
      open
      onOpenChange={() => {}}
      dismissible={false}
      modal={false}
      snapPoints={[PEEK_SNAP_POINT, 1]}
      activeSnapPoint={expanded ? 1 : PEEK_SNAP_POINT}
      setActiveSnapPoint={(snap) => setExpanded(snap === 1)}
    >
      <DrawerContent
        aria-describedby={undefined}
        className="z-40 mt-0 max-h-[88dvh] gap-0 rounded-t-3xl"
      >
        <DrawerTitle className="sr-only">{t("guests")}</DrawerTitle>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-3 px-4 pt-2 pb-4"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UsersIcon className="size-[22px]" />
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block text-[14.5px] font-bold">{t("guests")}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {t("guests.seated_ratio", {
                count: guests.length,
                seated_count: seatedCount,
              })}
              {unseatedCount > 0 && (
                <>
                  {" · "}
                  <span className="font-semibold text-accent-foreground">
                    {t("guests.unseated_count", { count: unseatedCount })}
                  </span>
                </>
              )}
            </span>
          </span>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            {expanded ? (
              <ChevronDownIcon className="size-[18px]" />
            ) : (
              <ChevronUpIcon className="size-[18px]" />
            )}
          </span>
        </button>
        {expanded && (
          <div className="flex-1 overflow-y-auto border-t px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <GuestListContent />
          </div>
        )}
      </DrawerContent>
    </Drawer>
  )
}
