import { useEffect, useState } from "react"
import { Outlet, createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { LOCAL_WEDDING_ID } from "@/lib/localWedding"
import { DEFAULT_HALL, usePlannerStore } from "@/stores/planner.store"
import { useGlobalStore } from "@/stores/global.store"

// No requireAuth: this is the guest (no-login) planning route. State comes
// from localStorage instead of Supabase — see loadWedding.ts for the cloud
// counterpart.
export const Route = createFileRoute("/wedding/local")({
  component: LocalWeddingLayout,
})

function LocalWeddingLayout() {
  const { t } = useTranslation()
  const [resolved, setResolved] = useState(false)

  useEffect(() => {
    let cancelled = false

    // Reset in-memory state before rehydrating so a cloud wedding left over
    // from a client-side nav (no full reload) can't leak into the guest view.
    usePlannerStore.setState({
      tables: [],
      guests: [],
      fixtures: [],
      hall: DEFAULT_HALL,
    })
    useGlobalStore.setState({
      weddingId: LOCAL_WEDDING_ID,
      role: "owner",
      name: undefined,
      date: undefined,
    })

    void Promise.all([
      usePlannerStore.persist.rehydrate(),
      useGlobalStore.persist.rehydrate(),
    ]).then(() => {
      if (!cancelled) setResolved(true)
    })

    return () => {
      cancelled = true
    }
  }, [])

  if (!resolved) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        {t("wedding.loading")}
      </div>
    )
  }

  return <Outlet />
}
