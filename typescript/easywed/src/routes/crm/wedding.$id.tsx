import { useEffect, useState } from "react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { ArrowLeftIcon, PrinterIcon } from "lucide-react"
import { KitchenMenuTally } from "@/components/crm/KitchenMenuTally"
import { VenuePeekSummary } from "@/components/crm/VenuePeekSummary"
import { PlannerPrintView } from "@/components/planner/PlannerPrintView"
import { Button } from "@/components/ui/button"
import {
  clearVenuePeek,
  loadWeddingForVenue,
} from "@/lib/sync/loadWeddingForVenue"
import { triggerPdfExport } from "@/lib/export/guestsPdf"
import { track } from "@/lib/analytics/track"
import { useGlobalStore } from "@/stores/global.store"

/**
 * One customer's seat map, as the venue sees it.
 *
 * Dynamic, so it is deliberately absent from `APP_ROUTES` in vite.config.ts -
 * the same treatment /wedding/$id gets, and for the same reason: there is no
 * finite list of ids to prerender. It falls through to the SPA shell, and
 * robots.txt already carries `Disallow: /crm/wedding/`.
 *
 * No `head:`, so it inherits the root route's `noindex, nofollow` like every
 * other /crm route.
 */
export const Route = createFileRoute("/crm/wedding/$id")({
  component: CrmWeddingPeek,
})

function CrmWeddingPeek() {
  const { id } = Route.useParams()
  const { t } = useTranslation()

  const [resolvedId, setResolvedId] = useState<string | null>(null)
  const [failedId, setFailedId] = useState<string | null>(null)

  const name = useGlobalStore((s) => s.name)

  useEffect(() => {
    const ctrl = new AbortController()

    loadWeddingForVenue(id, ctrl.signal)
      .then(() => {
        if (ctrl.signal.aborted) return
        setResolvedId(id)
        setFailedId(null)
        track("venue_peek_opened")
      })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return
        console.error("[crm] loadWeddingForVenue failed", e)
        setFailedId(id)
      })

    return () => {
      ctrl.abort()
      // Leaving the peek empties the stores it filled - see clearVenuePeek for
      // why that is part of the revocation promise and not just tidiness.
      clearVenuePeek()
    }
  }, [id])

  if (failedId === id) {
    return (
      <p className="text-sm text-destructive">{t("crm.wedding.load_failed")}</p>
    )
  }

  if (resolvedId !== id) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("crm.wedding.loading")}
      </p>
    )
  }

  return (
    <>
      {/* Reused verbatim, with `fields: ["dietary"]`. It reads guests out of
          planner.store, and loadWeddingForVenue put pseudonymous ones there -
          so the kitchen report is the couple's own print view with the names
          replaced at the load boundary, not a second component that has to be
          kept in step with it. */}
      <PlannerPrintView />

      <div className="flex flex-col gap-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/crm"
              aria-label={t("crm.wedding.back")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeftIcon className="h-4 w-4" />
            </Link>
            <h1 className="font-heading text-2xl font-semibold">{name}</h1>
          </div>

          <Button
            variant="outline"
            onClick={() =>
              // "dish" alongside "dietary": the kitchen report is the one
              // document that wants both, and DEFAULT_PRINT_FIELDS is left
              // alone so the couple's own print job is unchanged.
              triggerPdfExport(["dietary", "dish"], {
                sort: "seat",
                includeAgeGroups: true,
                includeSeats: true,
                seatsShowEmpty: false,
                includeGrid: false,
                showHallOutline: true,
                fitToContent: true,
              })
            }
          >
            <PrinterIcon />
            {t("crm.wedding.print")}
          </Button>
        </div>

        <p className="max-w-prose text-sm text-muted-foreground">
          {t("crm.wedding.notice")}
        </p>

        <VenuePeekSummary weddingId={id} />
        <KitchenMenuTally />
      </div>
    </>
  )
}
