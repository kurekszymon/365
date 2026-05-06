import { useEffect, useState } from "react"
import { Link, createFileRoute, redirect } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { requireAuth, requireOnboarded } from "@/lib/auth/guards"
import { loadVenueHall } from "@/lib/sync/loadVenueHall"
import { useGlobalStore } from "@/stores/global.store"
import { Planner } from "@/components/planner/Planner"

export const Route = createFileRoute("/venue/halls/$id")({
  beforeLoad: ({ params }) => {
    requireAuth(`/venue/halls/${params.id}`)
    requireOnboarded()
    if (useGlobalStore.getState().userType === "couple") {
      throw redirect({ to: "/", replace: true })
    }
  },
  component: VenueHallEditor,
})

function VenueHallEditor() {
  const { id } = Route.useParams()
  const { t } = useTranslation()

  const [resolvedId, setResolvedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()

    loadVenueHall(id, ctrl.signal)
      .then(() => {
        if (ctrl.signal.aborted) return
        setResolvedId(id)
        setError(null)
      })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return
        console.error("[venue] loadVenueHall failed", e)
        setError(t("wedding.load_failed"))
      })

    return () => ctrl.abort()
  }, [id, t])

  // Reset planner subject on unmount so navigating to /wedding/$id later
  // doesn't leak the venue_hall mode into the wedding planner.
  useEffect(() => {
    return () => {
      useGlobalStore.setState({
        subjectKind: "wedding",
        subjectId: undefined,
        weddingId: undefined,
        name: undefined,
        date: undefined,
        role: undefined,
      })
    }
  }, [])

  if (error) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6">
        <p className="text-sm text-destructive">{error}</p>
        <Link
          to="/venue"
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          {t("venue.dashboard.back")}
        </Link>
      </div>
    )
  }

  if (resolvedId !== id) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        {t("wedding.loading")}
      </div>
    )
  }

  return <Planner />
}
