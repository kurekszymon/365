import { useTranslation } from "react-i18next"
import { ChevronDownIcon, ChevronUpIcon, UsersIcon } from "lucide-react"
import { GuestListContent } from "./GuestListContent"
import type { ReactNode } from "react"
import { usePlannerStore } from "@/stores/planner.store"
import { useGuestPanelStore } from "@/stores/guestPanel.store"
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer"

/**
 * Mobile counterpart of the desktop `GuestRail`. vaul's `Root` is built around
 * an explicit closed→open transition — that's what drives its initial
 * snap-point measurement — so keeping a single Drawer permanently `open` with
 * custom snap points (the previous approach here) skipped that transition and
 * left it stuck off-screen. Instead: a plain, always-mounted fixed bar for the
 * collapsed summary (guaranteed to render, no vaul involved), and a normal
 * on-demand `Drawer` for the expanded list — the same open/close pattern
 * `PropertyPanel`'s mobile drawer already uses successfully.
 */
export const GuestPeekBar = () => {
  const { t } = useTranslation()
  const expanded = useGuestPanelStore((state) => state.expanded)
  const setExpanded = useGuestPanelStore((state) => state.setExpanded)
  const guests = usePlannerStore((state) => state.guests)
  const seatedCount = guests.filter((g) => g.tableId).length
  const unseatedCount = guests.length - seatedCount

  const summaryRow = (chevron: ReactNode) => (
    <button
      type="button"
      onClick={() => setExpanded(!expanded)}
      className="flex w-full items-center gap-3 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]"
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
        {chevron}
      </span>
    </button>
  )

  return (
    <>
      {!expanded && (
        <div className="fixed inset-x-0 bottom-0 z-40 rounded-t-3xl border-t bg-background shadow-[0_-14px_30px_-22px_rgba(40,60,45,0.4)]">
          {summaryRow(<ChevronUpIcon className="size-[18px]" />)}
        </div>
      )}

      {/* Non-modal: this is a persistent panel, not a one-off sheet, so it
          shouldn't dim the canvas or close itself on an outside tap — only the
          summary row's own toggle (tap or chevron) should collapse it. Safe to
          drop the overlay now that `open` follows a real closed→open
          transition instead of always being `true` from mount. */}
      <Drawer open={expanded} onOpenChange={setExpanded} modal={false}>
        <DrawerContent
          aria-describedby={undefined}
          className="z-40 mt-0 max-h-[88dvh] gap-0 rounded-t-3xl"
        >
          <DrawerTitle className="sr-only">{t("guests")}</DrawerTitle>
          {summaryRow(<ChevronDownIcon className="size-[18px]" />)}
          <div className="flex-1 overflow-y-auto border-t px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <GuestListContent />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
