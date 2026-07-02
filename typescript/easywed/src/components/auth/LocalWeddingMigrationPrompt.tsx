import { useEffect, useState } from "react"
import { MigrateLocalWeddingDialog } from "@/components/dialogs/weddings"
import {
  hasLocalWeddingData,
  readLocalGlobalSnapshot,
  readLocalPlannerSnapshot,
} from "@/lib/localWedding"
import { supabase } from "@/lib/supabase"
import { DEFAULT_HALL } from "@/stores/planner.store"

const DISMISSED_KEY = "easywed.guest_migration_dismissed"

// sessionStorage can throw (privacy mode, blocked storage) — treat it as an
// optional cache: a failed read means "not dismissed" (worst case the prompt
// re-appears), a failed write is just a best-effort dismissal.
const wasDismissed = (): boolean => {
  try {
    return Boolean(sessionStorage.getItem(DISMISSED_KEY))
  } catch {
    return false
  }
}

const markDismissed = (): void => {
  try {
    sessionStorage.setItem(DISMISSED_KEY, "1")
  } catch {
    // best-effort — see wasDismissed
  }
}

// Root-level (not route-scoped) so it fires regardless of where sign-in
// happens: /login, /auth/callback, or a second tab. Listens for Supabase's
// own SIGNED_IN event — distinct from INITIAL_SESSION (session restored on
// page load) — so an already-authenticated user reloading the app with
// stale local data lying around doesn't get re-prompted on every visit.
// AuthGate makes the same SIGNED_IN/SIGNED_OUT distinction for its own
// router.invalidate() call.
export function LocalWeddingMigrationPrompt() {
  const [promptOpen, setPromptOpen] = useState(false)

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" && !wasDismissed() && hasLocalWeddingData()) {
        setPromptOpen(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!promptOpen) return null

  // hasLocalWeddingData() can be true from name/date alone, with no planner
  // storage key ever written (e.g. a guest who only set a wedding name) —
  // fall back to an empty snapshot instead of bailing, so the dialog still
  // renders (with an honest "0 tables · 0 guests" summary).
  const planner = readLocalPlannerSnapshot() ?? {
    tables: [],
    guests: [],
    fixtures: [],
    hall: DEFAULT_HALL,
  }
  const global = readLocalGlobalSnapshot()

  const close = () => {
    markDismissed()
    setPromptOpen(false)
  }

  return (
    <MigrateLocalWeddingDialog
      open={promptOpen}
      planner={planner}
      global={global ?? {}}
      onClose={close}
    />
  )
}
