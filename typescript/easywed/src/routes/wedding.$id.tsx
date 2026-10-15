import { useEffect, useState } from "react"
import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { requireAuth } from "@/lib/auth/guards"
import { loadWedding } from "@/lib/sync/loadWedding"
import { ErrorFallback } from "@/components/ErrorFallback"
import { useDialogStore } from "@/stores/dialog.store"
import { useGlobalStore } from "@/stores/global.store"

/**
 * `venue=review` is how the venue invitation hands over: the couple has just
 * accepted, the wedding is `pending`, and the next thing they need is the venue
 * dialog - where granting access is a separate, explicit choice. A single
 * literal rather than a free string, so nothing else can be smuggled in.
 */
type WeddingSearch = { venue?: "review" }

export const Route = createFileRoute("/wedding/$id")({
  validateSearch: (s: Record<string, unknown>): WeddingSearch =>
    s.venue === "review" ? { venue: "review" } : {},
  beforeLoad: ({ params }) => {
    requireAuth(`/wedding/${params.id}`)
  },
  component: WeddingLayout,
  errorComponent: ErrorFallback,
})

function WeddingLayout() {
  const { id } = Route.useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const role = useGlobalStore((state) => state.role)
  const { venue: venueHandoff } = Route.useSearch()
  const openDialog = useDialogStore((state) => state.open)

  const [resolvedId, setResolvedId] = useState<string | null>(null)
  const [errorState, setErrorState] = useState<{
    id: string
    message: string
  } | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()

    loadWedding(id, ctrl.signal)
      .then(() => {
        if (ctrl.signal.aborted) return
        setResolvedId(id)
        setErrorState(null)
      })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return
        console.error("[wedding] loadWedding failed", e)
        setErrorState({
          id,
          message: t("wedding.load_failed"),
        })
      })

    return () => ctrl.abort()
  }, [id, t])

  // Venue staff do not get the planner. The role is derived by wedding_role()
  // and only settles once loadWedding's my_wedding_role call returns, so this
  // is an effect on the loaded state rather than a beforeLoad guard - there is
  // nothing to decide on before the wedding is known.
  //
  // /crm is a tenant-host surface, so on the apex requireTenantMember forwards
  // this on to /home. That is the right end state for the case it covers: a
  // couple's planner link opened by staff who are signed in on the wrong
  // origin. Their own route into a customer's plan is the CRM list, which links
  // here from the venue's own hostname.
  useEffect(() => {
    if (role !== "venue") return
    void navigate({ to: "/crm/wedding/$id", params: { id }, replace: true })
  }, [role, id, navigate])

  // Opens the venue dialog once, then drops the param so a reload or a shared
  // URL does not reopen it. Gated on the *loaded* owner role, for two reasons:
  // DialogManager closes `Wedding.Venue` for anyone who cannot edit, so opening
  // it before the role settles would be undone on the spot; and the dialog is
  // owner-only by design (VenueButton), so an editor following a stale URL
  // simply gets the planner.
  //
  // The param is cleared on every settled role, not just owner, so it never
  // lingers in the address bar. The planner path is named rather than `"."`:
  // from this layout `"."` can resolve to `/wedding/$id`, whose index redirect
  // would bounce through and remount the planner under the open dialog. The
  // handoff only ever targets the planner (venue invitation page).
  useEffect(() => {
    if (!venueHandoff || resolvedId !== id || role === undefined) return
    if (role === "owner") openDialog("Wedding.Venue")
    void navigate({
      to: "/wedding/$id/planner",
      params: { id },
      search: {},
      replace: true,
    })
  }, [venueHandoff, resolvedId, id, role, openDialog, navigate])

  const error = errorState?.id === id ? errorState.message : null
  const loading = !error && resolvedId !== id

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        {t("wedding.loading")}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-destructive">
        {error}
      </div>
    )
  }

  return <Outlet />
}
