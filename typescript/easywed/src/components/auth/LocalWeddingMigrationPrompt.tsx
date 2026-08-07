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

// Root-level (not route-scoped) so it fires regardless of where sign-in
// happens: /login, /auth/callback, or a second tab. Listens for Supabase's
// own SIGNED_IN event - distinct from INITIAL_SESSION (session restored on
// page load) - so an already-authenticated user reloading the app with
// stale local data lying around doesn't get re-prompted on every visit.
// AuthGate makes the same SIGNED_IN/SIGNED_OUT distinction for its own
// router.invalidate() call.
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

  // Only offered to an account with nothing in it.
  //
  // The dialog creates a *new* wedding from local storage, so someone who
  // already has one ends up with an unexplained duplicate next to their real
  // plan - and guest-mode leftovers are usually a throwaway from before the
  // account existed, not something they meant to keep. An empty account is the
  // only case where "this is your wedding now" is true.
  //
  // Waiting on termsStatus is the other half: a Google sign-in from /login
  // creates accounts, and one with local data would otherwise get this dialog
  // on top of the /accept-terms gate, offering to write to the database under
  // a contract they haven't agreed to. Deciding at SIGNED_IN can't work - the
  // status is still "unknown" then.
  //
  // A failed lookup stays quiet rather than guessing. Local storage is
  // untouched and the next sign-in asks again.
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

  // hasLocalWeddingData() can be true from name/date alone, with no planner
  // storage key ever written (e.g. a guest who only set a wedding name) -
  // fall back to an empty snapshot instead of bailing, so the dialog still
  // renders (with an honest "0 tables · 0 guests" summary).
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
