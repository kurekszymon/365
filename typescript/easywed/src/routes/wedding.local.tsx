import { useEffect, useState } from "react"
import { Outlet, createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { LOCAL_WEDDING_ID } from "@/lib/localWedding"
import { DEFAULT_HALL, usePlannerStore } from "@/stores/planner.store"
import { useGlobalStore } from "@/stores/global.store"
import { useMenuStore } from "@/stores/menu.store"
import { useRemindersStore } from "@/stores/reminders.store"

// No requireAuth: this is the guest (no-login) planning route. State comes
// from localStorage instead of Supabase - see loadWedding.ts for the cloud
// counterpart.
export const Route = createFileRoute("/wedding/local")({
  component: LocalWeddingLayout,
})

function LocalWeddingLayout() {
  const { t } = useTranslation()
  const [resolved, setResolved] = useState(false)

  useEffect(() => {
    let cancelled = false

    // Force the local-storage gate off before resetting in-memory state,
    // whatever weddingId was active - including a prior guest session revisited
    // via client-side nav, where it is already the sentinel. Otherwise the reset
    // persists and wipes the snapshot before rehydrate() reads it back.
    if (useGlobalStore.getState().weddingId === LOCAL_WEDDING_ID) {
      useGlobalStore.setState({ weddingId: undefined })
    }

    // Reset in-memory state before rehydrating so a cloud wedding (or the
    // previous guest session) left over from a client-side nav can't leak
    // into this render.
    usePlannerStore.setState({
      tables: [],
      guests: [],
      fixtures: [],
      halls: [],
      hallZOrder: [],
    })
    useGlobalStore.setState({
      role: "owner",
      name: undefined,
      date: undefined,
      // A local wedding has no members table behind it - clearing this stops
      // the previous cloud wedding's avatar stack showing in guest mode.
      members: [],
      // Nor a venue: left over from a cloud wedding it would offer guest mode the
      // whole venue surface, Menu tab included - `tabsFor` keys off this null.
      venue: null,
      venueAccess: "none",
    })
    useRemindersStore.setState({ reminders: [] })
    // Not persisted, so there is nothing to rehydrate below - a guest wedding
    // has no venue and therefore no menu, which is the whole reason
    // menu.store is a plain `create`.
    useMenuStore.getState().clear()

    void Promise.all([
      usePlannerStore.persist.rehydrate(),
      useGlobalStore.persist.rehydrate(),
      useRemindersStore.persist.rehydrate(),
    ])
      .catch((err: unknown) => {
        // A read/parse failure (corrupted localStorage) must not strand the
        // guest on the loading screen - fall back to the reset empty state.
        console.error("[guest-mode] failed to rehydrate local wedding", err)
      })
      .then(() => {
        if (cancelled) return
        // Only now does the local sentinel go live, so subsequent edits persist.
        useGlobalStore.setState({ weddingId: LOCAL_WEDDING_ID })

        // Guest-mode counterpart of seedDefaultHall: a signed-in wedding gets its
        // starting hall at creation, and a guest plan has no creation event, so
        // the trigger is "no hall to draw". Must run after the sentinel is live
        // or the gated storage drops the write.
        //
        // Hall count is the whole condition, deliberately. deleteHall takes its
        // tables and fixtures with it, so zero halls means zero of those - but it
        // only *unseats* their guests, who stay on the list. Gating on guests too
        // would strand anyone holding one from an earlier session on the blank
        // canvas, the outcome this exists to prevent.
        const planner = usePlannerStore.getState()
        if (planner.halls.length === 0)
          planner.addHall(DEFAULT_HALL, { x: 0, y: 0 })

        setResolved(true)
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
