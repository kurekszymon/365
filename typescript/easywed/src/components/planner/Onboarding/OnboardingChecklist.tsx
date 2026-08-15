import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { PrinterIcon, Share2Icon, XIcon } from "lucide-react"
import { OnboardingStepRow } from "./OnboardingStepRow"
import { Button } from "@/components/ui/button"
import { useDialogStore } from "@/stores/dialog.store"
import { useEntityListStore } from "@/stores/entityList.store"
import { useOnboardingStore } from "@/stores/onboarding.store"
import { usePlannerStore } from "@/stores/planner.store"
import { selectCanEdit, useGlobalStore } from "@/stores/global.store"
import { useIsMobile } from "@/hooks/useMediaQuery"
import { cn } from "@/lib/utils"

const STEP_COUNT = 3

/**
 * First-run guidance for the planner: the same three beats the landing page
 * teaches (lay out the room → add guests → seat everyone), except each step
 * ticks itself off from real store state instead of being narrated up front.
 *
 * That derivation is the point. There is no "has seen onboarding" flag to
 * migrate, no welcome modal standing between the user and the canvas, and the
 * card cannot go stale - it is a view of the plan, so finishing the plan is
 * what removes it. `onboarding.store` only records the escape hatch.
 *
 * Assumes at least one hall exists, and may rely on it: Canvas renders this
 * only after its own `halls.length === 0` early return has sent the hall-less
 * case to CanvasEmptyState, which carries its own single call to action. So
 * there is no "configure a hall first" step here - it would be unreachable.
 */
export const OnboardingChecklist = () => {
  const { t } = useTranslation()

  const tables = usePlannerStore((s) => s.tables)
  const guests = usePlannerStore((s) => s.guests)

  const weddingId = useGlobalStore((s) => s.weddingId)
  const canEdit = useGlobalStore(selectCanEdit)

  const dismissed = useOnboardingStore((s) =>
    weddingId ? Boolean(s.dismissed[weddingId]) : false
  )
  const dismiss = useOnboardingStore((s) => s.dismiss)

  const isMobile = useIsMobile()
  const openTab = useEntityListStore((s) => s.openTab)
  const setAddDialog = useEntityListStore((s) => s.setAddDialog)
  const hintSeating = useEntityListStore((s) => s.hintSeating)
  const openDialog = useDialogStore((s) => s.open)

  const seated = guests.filter((g) => g.tableId !== null).length

  const hasTables = tables.length > 0
  const hasGuests = guests.length > 0
  const allSeated = hasGuests && seated === guests.length
  const doneCount = [hasTables, hasGuests, allSeated].filter(Boolean).length
  const allDone = doneCount === STEP_COUNT

  // The three steps clear on one table with one guest seated at it, so this
  // is "you've done a lap of the basics", not "your plan is finished" - the
  // done card's copy points at where print and share live rather than passing
  // judgement on the plan. Someone who already knows their way around gets
  // nothing from that, so a wedding that arrives complete skips it: loadWedding
  // writes halls/tables/guests in one setState and this component only mounts
  // once halls are non-empty, so the very first render already sees the real
  // plan and seeding from it separates "arrived complete" from "walked the
  // steps in front of me".
  //
  // Never updated after that first render, and it doesn't need to be: arriving
  // complete dismisses permanently just below, and arriving unfinished pins
  // this true for the life of the card.
  const [sawUnfinished] = useState(!allDone)

  useEffect(() => {
    if (allDone && !sawUnfinished && weddingId) dismiss(weddingId)
  }, [allDone, sawUnfinished, weddingId, dismiss])

  // Viewers get no checklist: every CTA on it is a write they cannot make.
  if (!weddingId || !canEdit || dismissed) return <></>
  if (allDone && !sawUnfinished) return <></>

  return (
    <div
      data-no-pan
      className={cn(
        "absolute right-3 z-20 w-[17.5rem] max-w-[calc(100%-1.5rem)] animate-in rounded-2xl border bg-card/95 p-3.5 shadow-[0_8px_20px_-12px_rgba(40,60,45,0.4)] duration-300 fade-in slide-in-from-top-2 supports-backdrop-filter:backdrop-blur-sm",
        // Under the canvas toolbar on desktop, which owns top-right; on mobile
        // that toolbar isn't rendered, so the card takes the corner itself.
        isMobile ? "top-3" : "top-14"
      )}
    >
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] leading-tight font-semibold">
            {allDone ? t("onboarding.done.title") : t("onboarding.title")}
          </p>
          {allDone && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t("onboarding.done.desc")}
            </p>
          )}
        </div>
        <Button
          size="icon-xs"
          variant="ghost"
          className="-mt-1 -mr-1 shrink-0"
          aria-label={t("onboarding.dismiss")}
          onClick={() => dismiss(weddingId)}
        >
          <XIcon />
        </Button>
      </div>

      {allDone ? (
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => openDialog("Guests.Export.Pdf")}
          >
            <PrinterIcon />
            {t("onboarding.done.print")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => openDialog("Wedding.Members")}
          >
            <Share2Icon />
            {t("onboarding.done.share")}
          </Button>
        </div>
      ) : (
        <>
          <div
            className="mb-3 h-1 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={doneCount}
            aria-valuemin={0}
            aria-valuemax={STEP_COUNT}
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
              style={{ width: `${(doneCount / STEP_COUNT) * 100}%` }}
            />
          </div>

          <ul className="flex flex-col gap-2.5">
            <OnboardingStepRow
              index={1}
              title={t("onboarding.tables.title")}
              detail={
                hasTables
                  ? t("tables.count", { count: tables.length })
                  : t("onboarding.tables.todo")
              }
              done={hasTables}
              // Straight into the preset picker, panel and all: the step says
              // "arrange the tables", so stopping at a list and leaving the
              // user to find its add button is one click of nothing. Not
              // `openAddHub` - `add_hub` is the mobile FAB's panel view and
              // renders nothing on desktop.
              ctaLabel={t("onboarding.tables.cta")}
              onCta={() => {
                openTab("tables")
                setAddDialog("tables")
              }}
            />
            <OnboardingStepRow
              index={2}
              title={t("onboarding.guests.title")}
              detail={
                hasGuests
                  ? t("guests.count", { count: guests.length })
                  : t("onboarding.guests.todo")
              }
              done={hasGuests}
              ctaLabel={t("onboarding.guests.cta")}
              // Panel *and* dialog: the dialog alone adds one guest and closes
              // onto the same bare canvas, teaching nothing about where the
              // list lives. Opening the panel behind it means dismissing the
              // dialog reveals the guest that was just added, in the place
              // guests are managed from - and the panel's own Add / Import
              // buttons for the next one.
              onCta={() => {
                openTab("guests")
                openDialog("Guest.Add")
              }}
            />
            <OnboardingStepRow
              index={3}
              title={t("onboarding.seats.title")}
              detail={t("guests.seated_ratio", {
                count: guests.length,
                seated_count: seated,
              })}
              done={allSeated}
              // No one to seat yet - step 2's button is the one to press, and
              // two live buttons would split the instruction.
              ctaLabel={hasGuests ? t("onboarding.seats.cta") : undefined}
              // Not openTab: with the guest panel already open on this tab
              // that lands as a dead click. hintSeating flashes the per-guest
              // seat buttons, which is where seating actually happens.
              onCta={hasGuests ? hintSeating : undefined}
            />
          </ul>
        </>
      )}
    </div>
  )
}
