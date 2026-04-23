import { useEffect, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import Planner from "@/components/planner"
import { requireAuth } from "@/lib/auth/guards"
import { loadWedding } from "@/lib/sync/loadWedding"

export const Route = createFileRoute("/wedding/$id")({
  beforeLoad: ({ params }) => {
    requireAuth(`/wedding/${params.id}`)
  },
  component: WeddingPage,
})

function WeddingPage() {
  const { id } = Route.useParams()
  const { t } = useTranslation()

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

  return <Planner />
}
