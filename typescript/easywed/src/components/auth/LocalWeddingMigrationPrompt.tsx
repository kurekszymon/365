import { useEffect, useState } from "react"
import { MigrateLocalWeddingDialog } from "@/components/dialogs/weddings"
import {
  hasLocalWeddingData,
  readLocalGlobalSnapshot,
  readLocalPlannerSnapshot,
  readLocalRemindersSnapshot,
} from "@/lib/localWedding"
import { supabase } from "@/lib/supabase"
import { useProfileStore } from "@/stores/profile.store"

const DISMISSED_KEY = "easywed.guest_migration_dismissed"

// sessionStorage can throw (privacy mode, blocked storage) - treat it as an
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
    // best-effort - see wasDismissed
  }
}

// Root-level, not route-scoped, so it fires wherever sign-in happens: /login,
// /auth/callback, or a second tab. Listens for SIGNED_IN, distinct from
// INITIAL_SESSION (a session restored on page load), so an already-authenticated
// user reloading with stale local data is not re-prompted every visit.
export function LocalWeddingMigrationPrompt() {
  // Everything the sign-in transition can tell us: local data is there and the
  // prompt hasn't been dismissed. Whether to actually offer it needs a session
  // and a round trip, so that's settled in the effect below.
  const [candidate, setCandidate] = useState(false)
  const [promptOpen, setPromptOpen] = useState(false)
  const termsStatus = useProfileStore((s) => s.termsStatus)

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" && !wasDismissed() && hasLocalWeddingData()) {
        setCandidate(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Only offered to an account with nothing in it. The dialog creates a *new*
  // wedding from local storage, so someone who already has one gets an
  // unexplained duplicate next to their real plan - and guest-mode leftovers are
  // usually a throwaway from before the account existed.
  //
  // Waiting on termsStatus is the other half: a Google sign-in from /login
  // creates accounts, and one with local data would get this dialog on top of
  // the /accept-terms gate, offering to write under a contract they have not
  // agreed to. Deciding at SIGNED_IN cannot work - the status is "unknown" then.
  //
  // A failed lookup stays quiet rather than guessing; local storage is untouched
  // and the next sign-in asks again.
  useEffect(() => {
    if (!candidate || termsStatus !== "accepted") return

    const controller = new AbortController()

    const offerIfAccountIsEmpty = async () => {
      const { count, error } = await supabase
        .from("weddings")
        .select("id", { count: "exact", head: true })
        .abortSignal(controller.signal)

      if (controller.signal.aborted) return

      if (error) {
        console.error("[migration] existing wedding lookup failed", error)
        return
      }

      if ((count ?? 0) === 0) setPromptOpen(true)
    }

    void offerIfAccountIsEmpty()

    return () => controller.abort()
  }, [candidate, termsStatus])

  if (!promptOpen) return null

  // hasLocalWeddingData() can be true from name/date alone, with no planner key
  // ever written - fall back to an empty snapshot rather than bailing, so the
  // dialog still renders an honest "0 tables · 0 guests" summary.
  const planner = readLocalPlannerSnapshot() ?? {
    tables: [],
    guests: [],
    fixtures: [],
    halls: [],
  }
  const global = readLocalGlobalSnapshot()
  // Already an array (empty when nothing is stored), so no fallback needed.
  const reminders = readLocalRemindersSnapshot()

  const close = () => {
    markDismissed()
    setPromptOpen(false)
    // Clears the trigger too, so a later termsStatus change can't re-run the
    // lookup and reopen what was just dismissed.
    setCandidate(false)
  }

  return (
    <MigrateLocalWeddingDialog
      open={promptOpen}
      planner={planner}
      global={global ?? {}}
      reminders={reminders}
      onClose={close}
    />
  )
}
