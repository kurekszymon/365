import { useState } from "react"
import { useTranslation } from "react-i18next"
import { ChevronLeftIcon, ChevronRightIcon, UsersIcon } from "lucide-react"
import { GuestListContent } from "./GuestListContent"
import type { TransitionEvent } from "react"
import { Badge } from "@/components/ui/badge"
import { usePlannerStore } from "@/stores/planner.store"
import { useGuestPanelStore } from "@/stores/guestPanel.store"
import { cn } from "@/lib/utils"

/**
 * Desktop-only collapsed guest rail: a ~60px icon strip that expands to a
 * ~460px panel. Replaces the old header "Goście" button as the sole desktop
 * entry point to the guest list (see `GuestPanel/GuestPeekBar` for the mobile
 * equivalent).
 */
export const GuestRail = () => {
  const { t } = useTranslation()
  const expanded = useGuestPanelStore((state) => state.expanded)
  const setExpanded = useGuestPanelStore((state) => state.setExpanded)
  const guests = usePlannerStore((state) => state.guests)
  const unseatedCount = guests.filter((g) => !g.tableId).length

  // `GuestListContent` (search/filter state, a row per guest) is comparatively
  // heavy — reflowing it on every frame of the width transition is what made
  // expanding this feel slow. Mount it only once the panel has actually
  // reached its final width, so the animation itself only repaints an empty
  // panel; collapsing drops it immediately instead of reflowing it while
  // shrinking. Adjusted during render (React's documented alternative to an
  // effect for "reset state when a prop changes") rather than in a
  // useEffect, which would call setState after commit instead of before paint.
  const [showContent, setShowContent] = useState(expanded)
  const [prevExpanded, setPrevExpanded] = useState(expanded)
  if (expanded !== prevExpanded) {
    setPrevExpanded(expanded)
    if (!expanded) setShowContent(false)
  }

  const handleTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName === "width" && expanded) setShowContent(true)
  }

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col border-r bg-background transition-[width] duration-200",
        expanded ? "w-[460px]" : "w-[60px]"
      )}
      onTransitionEnd={handleTransitionEnd}
    >
      {expanded ? (
        <>
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="font-heading text-base font-semibold">
              {t("guests")}
            </span>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label={t("guests.collapse")}
              className="rounded-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeftIcon className="size-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {showContent && <GuestListContent />}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-4 py-4">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-label={t("guests.expand")}
            className="flex size-9 cursor-pointer items-center justify-center rounded-[11px] bg-secondary text-secondary-foreground hover:bg-secondary/80"
          >
            <ChevronRightIcon className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-label={t("guests")}
            className="flex cursor-pointer flex-col items-center gap-1"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UsersIcon className="size-[19px]" />
            </span>
            <span className="text-[10px] font-bold text-muted-foreground">
              {t("guests")}
            </span>
          </button>
          {unseatedCount > 0 && (
            <Badge className="bg-accent text-accent-foreground">
              {unseatedCount}
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
