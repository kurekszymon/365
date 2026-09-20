import { useEffect, useState } from "react"
import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { requireAuth } from "@/lib/auth/guards"
import { loadWedding } from "@/lib/sync/loadWedding"
import { ErrorFallback } from "@/components/ErrorFallback"
import { useGlobalStore } from "@/stores/global.store"

export const Route = createFileRoute("/wedding/$id")({
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
